#Requires -Version 5.1
<#
.SYNOPSIS
  Helper untuk konek ke Antigravity IDE yang sedang login di mesin ini.

.DESCRIPTION
  Antigravity membangun language server lokal yang mengekspos subcommand
  `agentapi` (new-conversation / send-message / get-conversation-metadata).
  Endpoint-nya TIDAK bisa ditebak: port + CSRF token berubah setiap kali
  Antigravity restart, dan keduanya dibaca dari discovery file:

      %USERPROFILE%\.gemini\antigravity\daemon\hub_*.json

  Script ini menyelesaikan semua itu otomatis.

.EXAMPLE
  .\scripts\antigravity.ps1 status
  .\scripts\antigravity.ps1 ask "Balas dengan: OK"
  .\scripts\antigravity.ps1 ask -Model pro -Raw "Jelaskan repo ini"
  .\scripts\antigravity.ps1 convos
  .\scripts\antigravity.ps1 metadata <conversationId>
  .\scripts\antigravity.ps1 send <conversationId> "Task selesai"

.NOTES
  PERINGATAN: `ask` / `send` menjalankan agent Antigravity sungguhan dan
  memakan kuota Gemini akun yang login. Gunakan -Model flash_lite untuk
  percobaan murah.
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('help', 'status', 'ask', 'convos', 'transcript', 'metadata', 'send')]
    [string]$Command = 'help',

    [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
    [string[]]$Rest = @(),

    # Tier model untuk `ask`. flash_lite = termurah.
    [string]$Model = 'flash_lite',

    # Judul percakapan (opsional).
    [string]$Title,

    # Batas tunggu jawaban agent, detik.
    [int]$TimeoutSec = 120,

    # Selesai jika transcript.jsonl diam selama ini, detik.
    [int]$StableSec = 3,

    # Hanya cetak jawaban akhir (mudah dipipe).
    [switch]$Raw,

    # Cetak keluaran sebagai JSON.
    [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$AntigravityExe = Join-Path $env:LOCALAPPDATA 'Programs\antigravity\Antigravity.exe'
$LanguageServer = Join-Path $env:LOCALAPPDATA 'Programs\antigravity\resources\bin\language_server.exe'
$GeminiDir     = Join-Path $env:USERPROFILE '.gemini\antigravity'

function Write-Banner([string]$Text) {
    Write-Host ""
    Write-Host "=== $Text ===" -ForegroundColor Cyan
}

# --------------------------------------------------------------------------
# Koneksi: baca port + CSRF token terbaru dari discovery file hub_*.json
# --------------------------------------------------------------------------
function Get-AntigravityHub {
    if (-not (Test-Path $GeminiDir)) {
        throw "Folder Antigravity tidak ditemukan: $GeminiDir`nApakah Antigravity sudah terpasang?"
    }

    $hubFiles = Get-ChildItem -Path (Join-Path $GeminiDir 'daemon') -Filter 'hub_*.json' -ErrorAction SilentlyContinue
    if (-not $hubFiles) {
        throw "Tidak ada hub_*.json. Antigravity kemungkinan belum pernah dijalankan."
    }

    # Proses language server hidup + port benar-benar listen = hub yang valid.
    foreach ($file in ($hubFiles | Sort-Object LastWriteTime -Descending)) {
        try {
            $hub = Get-Content -Path $file.FullName -Raw | ConvertFrom-Json
        } catch {
            continue
        }

        $proc = Get-Process -Id $hub.pid -ErrorAction SilentlyContinue
        if (-not $proc) { continue }

        $listening = Get-NetTCPConnection -State Listen -LocalPort $hub.httpPort -ErrorAction SilentlyContinue
        if (-not $listening) { continue }

        return [PSCustomObject]@{
            File    = $file.FullName
            Pid     = [int]$hub.pid
            HttpPort = [int]$hub.httpPort
            HttpsPort = if ($hub.PSObject.Properties.Name -contains 'httpsPort') { [int]$hub.httpsPort } else { 0 }
            Token   = [string]$hub.csrfToken
            Version = if ($hub.PSObject.Properties.Name -contains 'lsVersion') { [string]$hub.lsVersion } else { '?' }
        }
    }

    throw "Ada hub_*.json tapi tidak ada yang hidup (proses mati / port tidak listen).`nRestart Antigravity lalu coba lagi."
}

function Set-AntigravityConnection {
    $script:Hub = Get-AntigravityHub
    if (-not $script:Hub.Token -or $script:Hub.Token -eq '') {
        throw "CSRF token kosong di $($script:Hub.File). Restart Antigravity."
    }
    # Dokumentasi resmi: host:port TANPA skema (http://).
    $env:ANTIGRAVITY_LS_ADDRESS = "127.0.0.1:$($script:Hub.HttpPort)"
    $env:ANTIGRAVITY_CSRF_TOKEN = $script:Hub.Token
    return $script:Hub
}

function Invoke-AgentApi {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AgentArgs)

    if (-not (Test-Path $LanguageServer)) {
        throw "language_server.exe tidak ditemukan: $LanguageServer"
    }
    if (-not $env:ANTIGRAVITY_LS_ADDRESS) {
        Set-AntigravityConnection | Out-Null
    }

    $merged = (& $LanguageServer agentapi @AgentArgs 2>&1 | ForEach-Object { "$_" }) -join "`n"
    $code = $LASTEXITCODE

    $parsed = $null
    try { $parsed = $merged | ConvertFrom-Json } catch { $parsed = $null }

    return [PSCustomObject]@{
        Raw    = $merged
        Exit   = $code
        Json   = $parsed
        Ok     = ($code -eq 0)
    }
}

# --------------------------------------------------------------------------
# Membaca balasan agent dari transcript.jsonl
# --------------------------------------------------------------------------
function Get-TranscriptPath([string]$ConversationId) {
    return Join-Path $GeminiDir "brain\$ConversationId\.system_generated\logs\transcript.jsonl"
}

function Read-Transcript([string]$ConversationId) {
    $path = Get-TranscriptPath $ConversationId
    if (-not (Test-Path $path)) { return }

    # Output dienumerasi satu per satu; caller WAJIB membungkus dengan @()
    # agar selalu dapat array sungguhan (termasuk saat kosong).
    foreach ($line in (Get-Content -Path $path -ErrorAction SilentlyContinue)) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        try { $line | ConvertFrom-Json } catch { }
    }
}

function Wait-TranscriptAnswer {
    param(
        [string]$ConversationId,
        [int]$Timeout,
        [int]$Stable
    )

    $path = Get-TranscriptPath $ConversationId
    $deadline = (Get-Date).AddSeconds($Timeout)
    $lastLen = -1L
    $stableSince = $null

    # Tunggu file muncul dulu (agent butuh waktu spawn).
    while (-not (Test-Path $path) -and (Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 500
    }
    if (-not (Test-Path $path)) {
        throw "Transcript tidak muncul dalam ${Timeout}s: $path"
    }

    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 700
        try { $len = (Get-Item -Path $path -ErrorAction Stop).Length } catch { continue }

        $steps = @(Read-Transcript $ConversationId)
        $last = if ($steps.Count) { $steps[-1] } else { $null }
        $lastDone = ($null -ne $last -and $last.PSObject.Properties.Name -contains 'status' -and $last.status -eq 'DONE')

        if ($len -ne $lastLen) {
            $lastLen = $len
            $stableSince = $null
            continue
        }

        if ($lastDone) {
            if ($null -eq $stableSince) { $stableSince = Get-Date }
            elseif (((Get-Date) - $stableSince).TotalSeconds -ge $Stable) {
                return [PSCustomObject]@{ Steps = $steps; TimedOut = $false }
            }
        }
    }

    return [PSCustomObject]@{ Steps = @(Read-Transcript $ConversationId); TimedOut = $true }
}

function Get-LastStepIndex($Steps, [string]$Field, [string]$Value) {
    $hits = @($Steps | Where-Object {
        $_.PSObject.Properties.Name -contains $Field -and $_.$Field -eq $Value
    })
    if (-not $hits.Count) { return -1 }
    $last = $hits[-1]
    if ($last.PSObject.Properties.Name -contains 'step_index') { return [int]$last.step_index }
    return -1
}

function Get-FinalAnswer($Steps) {
    $models = @($Steps | Where-Object {
        $_.PSObject.Properties.Name -contains 'source' -and $_.source -eq 'MODEL'
    })
    if (-not $models.Count) { return $null }
    $lastModel = $models[-1]
    if ($lastModel.PSObject.Properties.Name -contains 'content') { return [string]$lastModel.content }
    return $null
}

# Error hanya dianggap fatal bila langkahnya LEBIH AKHIR daripada jawaban
# MODEL terakhir - kalau tidak, berarti retry-nya berhasil dan error itu basi.
function Get-StepField($Step, [string]$Name) {
    if ($null -eq $Step) { return $null }
    if ($Step.PSObject.Properties.Name -contains $Name) { return $Step.$Name }
    return $null
}

function ConvertTo-StepView($Steps) {
    @($Steps | ForEach-Object {
        [PSCustomObject]@{
            step    = Get-StepField $_ 'step_index'
            type    = Get-StepField $_ 'type'
            status  = Get-StepField $_ 'status'
            model   = Get-StepField $_ 'model'
            error   = Get-StepField $_ 'error'
            content = Get-StepField $_ 'content'
        }
    })
}

function Get-FatalError($Steps) {
    $errs = @($Steps | Where-Object {
        $_.PSObject.Properties.Name -contains 'type' -and $_.type -eq 'ERROR_MESSAGE'
    })
    if (-not $errs.Count) { return $null }

    if ((Get-LastStepIndex $Steps 'source' 'MODEL') -ge (Get-LastStepIndex $Steps 'type' 'ERROR_MESSAGE')) {
        return $null
    }

    $last = $errs[-1]
    if ($last.PSObject.Properties.Name -contains 'error' -and $last.error) { return [string]$last.error }
    if ($last.PSObject.Properties.Name -contains 'content' -and $last.content) { return [string]$last.content }
    return 'ERROR_MESSAGE tanpa detail'
}

function Write-Steps($Steps) {
    foreach ($s in $Steps) {
        $type   = if ($s.PSObject.Properties.Name -contains 'type')   { $s.type }   else { '?' }
        $status = if ($s.PSObject.Properties.Name -contains 'status') { $s.status } else { '?' }
        $model  = if ($s.PSObject.Properties.Name -contains 'model')  { $s.model }  else { '' }
        $out    = if ($s.PSObject.Properties.Name -contains 'output_tokens') { $s.output_tokens } else { '' }
        $color  = if ($status -eq 'DONE') { 'Green' } else { 'Yellow' }
        $extra  = @()
        if ($model) { $extra += $model }
        if ($out -ne '') { $extra += "out=$out" }
        $suffix = if ($extra.Count) { "  (" + ($extra -join ', ') + ")" } else { "" }
        Write-Host ("  [{0}] {1,-18} {2}{3}" -f $s.step_index, $type, $status, $suffix) -ForegroundColor $color
    }
}

# --------------------------------------------------------------------------
# Perintah
# --------------------------------------------------------------------------
function Show-Help {
    @"

Antigravity helper
------------------
  .\scripts\antigravity.ps1 status
      Cek endpoint, versi, akun login, dan koneksi agentapi.

  .\scripts\antigravity.ps1 ask [-Model flash_lite|flash|pro] [-Raw] [-Json] "prompt"
      Kirim prompt ke agent Antigravity, tunggu, cetak jawabannya.
      MENGHABISKAN KUOTA GEMINI. Default flash_lite (termurah).

  .\scripts\antigravity.ps1 convos
      Daftar percakapan lokal yang tersimpan.

  .\scripts\antigravity.ps1 transcript <conversationId>
      Baca hasil agent dari transcript lokal. TIDAK memanggil model, jadi
      gratis - berguna untuk melihat jawaban/error percakapan lama.

  .\scripts\antigravity.ps1 metadata <conversationId>
      Metadata mentah satu percakapan.

  .\scripts\antigravity.ps1 send <conversationId> "pesan"
      Kirim pesan ke percakapan lain (antar-agent).

  Opsi umum: -TimeoutSec 120  -StableSec 3  -Title "judul"

"@
}

function Cmd-Status {
    Write-Banner "Antigravity status"

    $exeOk = Test-Path $AntigravityExe
    Write-Host ("  Binary      : {0}" -f $(if ($exeOk) { $AntigravityExe } else { "TIDAK ADA" })) `
        -ForegroundColor $(if ($exeOk) { 'Green' } else { 'Red' })

    $procs = @(Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue)
    Write-Host ("  Proses      : {0} berjalan" -f $procs.Count) -ForegroundColor $(if ($procs.Count) { 'Green' } else { 'Red' })

    $acctFile = Join-Path $env:USERPROFILE '.gemini\google_accounts.json'
    if (Test-Path $acctFile) {
        try {
            $acct = Get-Content $acctFile -Raw | ConvertFrom-Json
            Write-Host ("  Akun login  : {0}" -f $acct.active) -ForegroundColor Green
        } catch { Write-Host "  Akun login  : (tidak terbaca)" -ForegroundColor Yellow }
    }

    if (-not $exeOk -or -not $procs.Count) {
        Write-Host "`n  Antigravity tidak berjalan. Buka dulu aplikasinya." -ForegroundColor Yellow
        return
    }

    try {
        $hub = Set-AntigravityConnection
    } catch {
        Write-Host "`n  GAGAL koneksi: $($_.Exception.Message)" -ForegroundColor Red
        return
    }

    Write-Host ("  Versi LS    : {0}" -f $hub.Version)
    Write-Host ("  Endpoint    : {0}  (pid {1})" -f $env:ANTIGRAVITY_LS_ADDRESS, $hub.Pid) -ForegroundColor Green
    Write-Host ("  CSRF token  : {0}***" -f $hub.Token.Substring(0, 8))
    Write-Host ("  Discovery   : {0}" -f $hub.File)
    Write-Host "  Catatan     : port + token berubah setiap Antigravity restart." -ForegroundColor DarkGray

    Write-Banner "Uji agentapi (get-conversation-metadata)"
    $probe = Invoke-AgentApi 'get-conversation-metadata' '00000000-0000-0000-0000-000000000000'
    if ($probe.Ok) {
        Write-Host "  KONEKSI OK  - agentapi menjawab." -ForegroundColor Green
    } elseif ($probe.Raw -match 'not_found|NotFound') {
        Write-Host "  KONEKSI OK  - endpoint hidup (id memang tidak ada)." -ForegroundColor Green
    } elseif ($probe.Raw -match 'Unauthenticated|CSRF') {
        Write-Host "  GAGAL       - CSRF token ditolak." -ForegroundColor Red
    } else {
        Write-Host "  GAGAL       - $($probe.Raw)" -ForegroundColor Red
    }
    Write-Host ""
}

function Cmd-Ask {
    $prompt = (@($Rest) -join ' ').Trim()
    if ([string]::IsNullOrWhiteSpace($prompt)) {
        throw "Prompt kosong. Contoh: .\scripts\antigravity.ps1 ask `"Balas dengan OK`""
    }

    Set-AntigravityConnection | Out-Null
    if (-not $Json) {
        Write-Banner "Mengirim prompt (model: $Model)"
        Write-Host "  Endpoint : $env:ANTIGRAVITY_LS_ADDRESS" -ForegroundColor DarkGray
        Write-Host "  Prompt   : $prompt" -ForegroundColor DarkGray
    }

    $agentArgs = @('new-conversation', "--model=$Model")
    if ($Title) { $agentArgs += "--title=$Title" }
    $agentArgs += $prompt

    $created = Invoke-AgentApi @agentArgs
    if (-not $created.Ok -or -not $created.Json) {
        throw "new-conversation gagal (exit $($created.Exit)):`n$($created.Raw)"
    }

    $convId = $created.Json.response.newConversation.conversationId
    if (-not $convId) { throw "conversationId tidak ditemukan di respons:`n$($created.Raw)" }
    if (-not $Json) { Write-Host "  Conv ID  : $convId" -ForegroundColor Green }

    $t0 = Get-Date
    $result = Wait-TranscriptAnswer -ConversationId $convId -Timeout $TimeoutSec -Stable $StableSec
    $elapsed = [math]::Round(((Get-Date) - $t0).TotalSeconds, 1)
    $answer = Get-FinalAnswer $result.Steps
    $err    = Get-FatalError $result.Steps

    if ($Json) {
        [PSCustomObject]@{
            conversationId = $convId
            model          = $Model
            elapsedSec     = $elapsed
            timedOut       = $result.TimedOut
            error          = $err
            steps          = ConvertTo-StepView $result.Steps
            answer = $answer
        } | ConvertTo-Json -Depth 8
        # Exit code tetap bermakna saat dipakai dari shell / CI.
        if ($null -ne $err) { exit 2 }
        if ($null -eq $answer) { exit 3 }
        return
    }

    if (-not $Raw) {
        Write-Banner "Langkah agent ($elapsed s)"
        Write-Steps $result.Steps
    }

    Write-Banner "Jawaban"
    if ($null -ne $err) {
        # Kegagalan sisi server (mis. 503 no capacity) - bukan soal script.
        Write-Host "  GAGAL: $err" -ForegroundColor Red
        exit 2
    }
    if ($null -eq $answer) {
        Write-Host "  (tidak ada jawaban MODEL)" -ForegroundColor Yellow
        if ($result.TimedOut) { Write-Host "  Timeout setelah ${TimeoutSec}s - coba -TimeoutSec lebih besar." -ForegroundColor Yellow }
        exit 3
    } elseif ($Raw) {
        Write-Output $answer
    } else {
        Write-Host $answer -ForegroundColor White
        if ($result.TimedOut) { Write-Host "  (perhatian: timeout ${TimeoutSec}s tercapai)" -ForegroundColor Yellow }
    }
    Write-Host ""
}

function Cmd-Transcript {
    $id = @($Rest) | Where-Object { $_ } | Select-Object -First 1
    if (-not $id) { throw "Butuh conversationId. Contoh: .\scripts\antigravity.ps1 transcript <id>" }

    $steps = @(Read-Transcript $id)
    if (-not $steps.Count) {
        Write-Host "Transcript tidak ditemukan: $(Get-TranscriptPath $id)" -ForegroundColor Red
        exit 1
    }

    $answer = Get-FinalAnswer $steps
    $err    = Get-FatalError $steps

    if ($Json) {
        [PSCustomObject]@{
            conversationId = $id
            error          = $err
            steps          = ConvertTo-StepView $steps
            answer = $answer
        } | ConvertTo-Json -Depth 8
        if ($null -ne $err) { exit 2 }
        if ($null -eq $answer) { exit 3 }
        return
    }

    Write-Banner "Transcript $id"
    Write-Steps $steps
    Write-Banner "Jawaban"
    if ($null -ne $err) {
        Write-Host "  GAGAL: $err" -ForegroundColor Red
        exit 2
    }
    if ($null -eq $answer) {
        Write-Host "  (tidak ada jawaban MODEL)" -ForegroundColor Yellow
        exit 3
    }
    if ($Raw) { Write-Output $answer; return }
    Write-Host $answer -ForegroundColor White
    Write-Host ""
}

function Cmd-Convos {
    $convDir = Join-Path $GeminiDir 'conversations'
    if (-not (Test-Path $convDir)) { throw "Tidak ada folder percakapan: $convDir" }

    $files = @(Get-ChildItem -Path $convDir -Filter '*.db' -File -ErrorAction SilentlyContinue |
               Sort-Object LastWriteTime -Descending)
    if (-not $files) { Write-Host "Belum ada percakapan tersimpan."; return }

    $rows = foreach ($f in $files) {
        [PSCustomObject]@{
            ConversationId = $f.BaseName
            Modified       = $f.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
            SizeKB         = [math]::Round($f.Length / 1KB, 1)
            HasTranscript  = Test-Path (Get-TranscriptPath $f.BaseName)
        }
    }

    if ($Json) { $rows | ConvertTo-Json -Depth 4; return }
    Write-Banner "Percakapan lokal ($($rows.Count))"
    $rows | Format-Table -AutoSize | Out-String | Write-Host
}

function Cmd-Metadata {
    $id = @($Rest) | Where-Object { $_ } | Select-Object -First 1
    if (-not $id) { throw "Butuh conversationId. Contoh: .\scripts\antigravity.ps1 metadata <id>" }

    $r = Invoke-AgentApi 'get-conversation-metadata' $id
    if ($Json) { Write-Output $r.Raw; return }

    if ($r.Ok) {
        Write-Banner "Metadata $id"
        Write-Output $r.Raw
    } else {
        throw "Gagal (exit $($r.Exit)):`n$($r.Raw)"
    }
}

function Cmd-Send {
    if (@($Rest).Count -lt 2) {
        throw "Butuh <conversationId> <pesan>. Contoh: .\scripts\antigravity.ps1 send <id> `"Task selesai`""
    }
    $id = $Rest[0]
    $msg = (@($Rest | Select-Object -Skip 1) -join ' ').Trim()
    if ([string]::IsNullOrWhiteSpace($msg)) { throw "Pesan kosong." }

    Set-AntigravityConnection | Out-Null
    $agentArgs = @('send-message')
    if ($Title) { $agentArgs += "--title=$Title" }
    $agentArgs += $id, $msg

    $r = Invoke-AgentApi @agentArgs
    if ($Json) { Write-Output $r.Raw; return }
    if (-not $r.Ok) { throw "send-message gagal (exit $($r.Exit)):`n$($r.Raw)" }

    Write-Banner "Terkirim ke $id"
    Write-Output $r.Raw
}

# --------------------------------------------------------------------------
switch ($Command) {
    'status'   { Cmd-Status }
    'ask'      { Cmd-Ask }
    'convos'   { Cmd-Convos }
    'transcript' { Cmd-Transcript }
    'metadata' { Cmd-Metadata }
    'send'     { Cmd-Send }
    default    { Show-Help }
}
