# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Khitan Damai

**STATUS: DRAFT SEMENTARA**

| | |
| --- | --- |
| **Nama Produk** | Khitan Damai |
| **Versi Dokumen** | v0.1 (Detailed PRD) |
| **Disusun oleh** | Tim Pengembang AI |
| **Untuk** | Pemilik Produk / Klien |
| **Tanggal** | 12 Oktober 2026 |
| **Tech Stack Terkunci** | Single HTML5 + Vue.js 3 CDN + Tailwind CSS CDN + Google Apps Script REST API + Google Sheets |

---

# 1. Problem Statements

Kondisi saat ini dalam layanan khitan di wilayah Subang, khususnya pada praktik mandiri, masih sangat bergantung pada proses konvensional yang tidak terstruktur. Calon pasien atau orang tua pasien harus melakukan pendaftaran melalui pesan singkat (WhatsApp) atau datang langsung ke lokasi tanpa adanya kepastian jadwal yang transparan. Data pendaftaran seringkali hanya tercatat pada buku manual atau tumpukan chat yang berisiko hilang atau terlewat. Ketidakpastian ini menciptakan hambatan komunikasi yang signifikan antara penyedia layanan dan pasien, di mana informasi mengenai prosedur, galeri hasil, dan testimoni keberhasilan khitan tersebar di berbagai platform media sosial yang tidak terintegrasi.

Dampak negatif dari masalah ini sangat dirasakan oleh kedua belah pihak. Dari sisi operasional, manajemen jadwal menjadi sangat tidak efisien karena sering terjadi bentrokan waktu (double booking) atau kekosongan jadwal yang tidak terisi optimal. Bagi orang tua, kurangnya akses informasi yang cepat dan kredibel mengenai pengalaman pasien sebelumnya (testimoni) serta galeri visual dapat meningkatkan kecemasan anak maupun orang tua sebelum prosedur dilakukan. Selain itu, ketiadaan sistem pelacakan status pendaftaran membuat pasien merasa tidak tenang karena tidak memiliki bukti digital atau konfirmasi resmi yang dapat diakses sewaktu-waktu melalui perangkat seluler mereka.

Solusi yang ditawarkan melalui aplikasi "Khitan Damai" adalah sebuah platform berbasis web mobile-only yang mengintegrasikan seluruh proses pra-khitan dalam satu pintu. Dengan mengusung tagline "Aku Berani Khitan", aplikasi ini dirancang untuk memberikan pengalaman pengguna yang menenangkan melalui antarmuka bertema Tosca yang profesional namun ramah anak. Aplikasi ini memfasilitasi pendaftaran mandiri secara digital, penyediaan galeri visual untuk edukasi, serta fitur pengecekan status booking secara real-time. Penggunaan Google Sheets sebagai basis data memastikan bahwa penyedia layanan dapat mengelola data dengan alat yang familiar namun tetap terhubung secara otomatis ke aplikasi pelanggan.

Diferensiasi utama Khitan Damai terletak pada fokusnya terhadap aksesibilitas mobile dan transparansi informasi. Berbeda dengan sistem manajemen klinik yang kompleks dan berat, Khitan Damai hadir sebagai solusi ringan (lightweight) yang tidak memerlukan instalasi aplikasi tambahan, namun memberikan fungsionalitas penuh layaknya aplikasi native. Nilai tambah lainnya adalah integrasi fitur "Cek Booking" yang memberikan otonomi kepada pasien untuk memantau jadwal mereka tanpa harus menghubungi admin berulang kali. Pendekatan lokalitas yang kuat dengan pencantuman lokasi fisik yang jelas di Subang memberikan rasa aman dan kepercayaan (trust) yang lebih tinggi bagi komunitas lokal dibandingkan platform kesehatan umum berskala nasional.

# 2. Goals & Success Metrics

| Goal Statement | Measurable Metric (dengan angka spesifik) | Target Timeframe |
| --- | --- | --- |
| Digitalisasi proses pendaftaran khitan | 100% pendaftaran masuk melalui sistem (tidak ada lagi input manual dari chat) | 3 Bulan Pertama |
| Meningkatkan transparansi jadwal | Penurunan frekuensi pertanyaan "kapan jadwal saya" via WhatsApp sebesar 70% | 2 Bulan Pertama |
| Meningkatkan kepercayaan calon pasien | Penayangan minimal 20 testimoni terverifikasi dan 15 foto galeri aktif | 1 Bulan Pertama |
| Efisiensi waktu administrasi | Pengurangan waktu pemrosesan data pendaftaran dari 15 menit menjadi 2 menit per pasien | 3 Bulan Pertama |
| Aksesibilitas pengguna mobile | Mencapai skor Google PageSpeed Insights minimal 90 untuk performa mobile | Peluncuran Awal |

# 3. Target Users

| Role Name | Description | Primary Needs | Pain Points | Most Used Features |
| --- | --- | --- | --- | --- |
| **Orang Tua Pasien** | Pengambil keputusan utama (usia 25-45 tahun) yang mencari layanan khitan untuk anaknya. | Jadwal yang pasti, informasi harga/prosedur, dan bukti testimoni sukses. | Antrean panjang, ketidakpastian jadwal, dan kurangnya informasi visual. | Booking, Testimoni, Cek Booking |
| **Calon Pasien (Anak)** | Pengguna yang melihat konten visual untuk mengurangi rasa takut. | Konten yang ramah, testimoni anak lain yang "berani", dan tampilan yang tidak menakutkan. | Ketakutan terhadap prosedur medis dan jarum suntik. | Galeri, Sub-judul "Aku Berani Khitan" |
| **Admin/Operator** | Pengelola layanan yang memvalidasi booking dan memperbarui status. | Manajemen data yang rapi dan otomatisasi rekapitulasi pasien. | Rekap manual yang melelahkan dan risiko data ganda. | Google Sheets (Backend), Cek Booking |

# 4. User Stories

| ID | User Story | Acceptance Criteria | Priority |
| --- | --- | --- | --- |
| US-01 | Sebagai pengguna, saya ingin melihat header dengan logo dan judul yang jelas sehingga saya tahu saya berada di aplikasi yang benar. | Header menampilkan Logo, Judul "Khitan Damai", dan Sub-judul "Aku Berani Khitan". | MVP |
| US-02 | Sebagai pengguna dan pengelola, saya ingin membaca running text di bawah header untuk info terbaru, serta dapat menekan kotak teks "INFO" untuk membuka form login pengelola dengan mudah. | Teks langsung tampak dan langsung berjalan mengalir secara mulus dari detik ke-0 saat aplikasi dibuka (seamless infinite continuous loop tanpa jeda kosong), serta kotak badge "INFO" berfungsi sebagai tombol untuk membuka modal login pengelola. | MVP |
| US-03 | Sebagai pengguna, saya ingin mengakses menu navigasi di bagian bawah layar sehingga saya bisa berpindah fitur dengan satu jempol. | Menu Bottom berisi: Beranda, Testimoni (dinamis), Booking, Galeri, dan Kontak di posisi paling kanan. | MVP |
| US-04 | Sebagai orang tua, saya ingin mengisi formulir booking digital sehingga saya tidak perlu mengantre secara fisik untuk mendaftar. | Form mencakup Nama Anak, Nama Orang Tua, No HP, dan Tanggal Rencana Khitan. | MVP |
| US-05 | Sebagai orang tua, saya ingin melihat testimoni dari pelanggan lain sehingga saya merasa yakin dengan kualitas layanan. | Menampilkan daftar testimoni dengan nama dan kutipan pengalaman. | MVP |
| US-06 | Sebagai pengguna, saya ingin melihat galeri foto sehingga saya bisa melihat fasilitas dan hasil khitan sebelumnya. | Galeri menampilkan gambar dalam format grid yang responsif di mobile. | MVP |
| US-07 | Sebagai pengguna, saya ingin mengecek status booking saya menggunakan nomor HP sehingga saya tahu jadwal saya sudah dikonfirmasi atau belum. | Input nomor HP mengembalikan data status (Pending/Confirmed/Selesai) dari Google Sheets. | MVP |
| US-08 | Sebagai pengguna mobile, saya ingin antarmuka publik yang bersih tanpa footer di Beranda sehingga fokus tertuju pada konten utama dan floating bottom navigation. | Footer publik ditiadakan dari seluruh halaman publik (termasuk Beranda), sedangkan footer admin tetap tersedia khusus di panel admin. | MVP |
| US-09 | Sebagai pengguna, saya ingin menerima notifikasi sukses setelah mengirim form booking sehingga saya yakin data saya telah terkirim. | Muncul modal/toast "Pendaftaran Berhasil" setelah tombol submit diklik. | MVP |
| US-10 | Sebagai pengguna, saya ingin aplikasi memiliki tema warna Tosca sehingga mata saya merasa nyaman dan tenang saat browsing. | Warna dominan (Primary Color) menggunakan kode hex Tosca yang konsisten di seluruh elemen UI. | MVP |
| US-11 | Sebagai admin, saya ingin data booking masuk otomatis ke Google Sheets sehingga saya bisa mengelolanya tanpa input ulang. | Integrasi GAS mengirimkan data JSON ke baris baru di Google Sheets. | MVP |

# 5. User Flow

### 5.1 Alur Utama: Melakukan Booking (Happy Path)
1. **Action:** Pengguna membuka aplikasi.
2. **Description:** Sistem menampilkan Beranda dengan running text informasi.
3. **Action:** Pengguna menekan menu "Booking" pada Bottom Menu.
4. **Description:** Sistem menampilkan formulir pendaftaran.
5. **Action:** Pengguna mengisi data (Nama, HP, Tanggal) dan menekan "Kirim".
6. **Decision Point:** Apakah data valid? (Jika Ya, lanjut; Jika Tidak, tampilkan error).
7. **Output:** Sistem mengirim data ke Google Sheets via GAS dan menampilkan notifikasi sukses.

### 5.2 Alur Alternatif: Cek Status Booking
1. **Action:** Pengguna menekan menu "Cek Booking" pada Bottom Menu.
2. **Description:** Sistem menampilkan kolom input Nomor HP.
3. **Action:** Pengguna memasukkan nomor HP yang didaftarkan dan menekan "Cari".
4. **Decision Point:** Apakah nomor ditemukan di database?
    - **Jika Ditemukan:** Sistem menampilkan detail nama, tanggal, dan status (Contoh: "Dikonfirmasi").
    - **Jika Tidak:** Sistem menampilkan pesan "Data tidak ditemukan, silakan cek kembali nomor Anda".

# 6. Functional Requirements

| Feature ID | Feature Name | Detailed Description | Inputs | Outputs | Validation Rules | Data Structure (Google Sheets) |
| --- | --- | --- | --- | --- | --- | --- |
| FR-01 | Booking Engine & Bot Telegram Interaktif | Modul pengiriman data pendaftaran ke database Google Sheets, notifikasi real-time ke akun Telegram Admin (081222531978) via Telegram Bot API dengan tombol interaktif Telegram "💬 Kirim WhatsApp Sambutan", penjadwal otomatis pemeriksaan jadwal khitan < 12 jam dengan tombol "🔔 Kirim WhatsApp Reminder", perintah pemindaian manual instan `/cekreminder` untuk Admin, serta Bot Telegram 2 Arah (`@khitandamai_bot`) untuk Cek Status Booking (via ID Booking / Nomor WhatsApp) dan menampilkan Daftar Jadwal Khitan Mendatang yang dikelompokkan secara terstruktur per Hari/Tanggal (Hari Ini, Besok, Lusa, dst.) lengkap dengan tombol cepat menu Telegram. | Nama Anak, Nama Ortu, No HP, Tgl Khitan, dll | Notifikasi Sukses/Gagal & Pesan Telegram interaktif dengan tombol WhatsApp Sambutan, Reminder, Cek Status, Hasil Pindai `/cekreminder`, dan Jadwal Mendatang per Hari/Tanggal | No HP harus angka, Semua field wajib diisi | ID, Timestamp, Nama_Anak, Nama_Ortu, No_HP, Tgl_Khitan, Status |
| FR-02 | Status Checker (Cek Booking) | Fitur pencarian data booking secara real-time yang terintegrasi di dalam Menu Booking (melalui segmented tab switcher "Form Pendaftaran" vs "Cek Status"). Mendukung pencarian instan via ID Booking maupun opsi cadangan Nomor HP dengan privacy masking (`0812****1234`), visualisasi infografis bukti booking resmi, dan cetak/unduh gambar. Menu mandiri "Cek Status" pada sticky bottom nav dihapus untuk menyederhanakan navigasi publik, dengan backward compatibility tautan `#/cek-booking`. | ID Booking atau Nomor HP | Detail Status Booking & Infografis Bukti | ID unik atau minimal 10 digit angka HP | Mengambil data berdasarkan kolom ID / No_HP Sheet BOOKING |
| FR-03 | Dynamic Gallery | Menampilkan foto-foto kegiatan/fasilitas. | Data dari Array/JSON | Grid Gambar | Format file .jpg/.png | URL_Gambar, Deskripsi |
| FR-04 | Testimonial List | Menampilkan ulasan dari pelanggan. | Data dari Array/JSON | List Kartu Testimoni | Maksimal 200 karakter per teks | Nama_User, Isi_Testimoni, Rating |
| FR-05 | Running Text & Tombol Akses Login Pengelola | Informasi bergerak di bawah header dengan kotak label "INFO" yang berfungsi ganda sebagai tombol pemicu untuk membuka modal/form Login Pengelola / Admin (`openLoginModal`). | String Teks & Tombol Klik | Animasi Marquee & Modal Login Interaktif | Teks tidak boleh kosong, tombol INFO responsif dan ramah sentuhan mobile | Config_Text & Modal Login |
| FR-06 | Rekam Data Kunjungan | Tabel data administrasi, tindakan medis khitan, pembiayaan, dan kontrol rekam kunjungan di panel admin. Data terurut REGISTER terbaru di posisi atas. Dilengkapi fitur Cetak "Word Kunjungan" & Unduh Docs (Form Kunjungan 4 halaman A4 mencakup Biodata, Anamnesa, Lembar Persetujuan Khitan, Surat Keterangan Khitan dengan nomor surat romawi, dan Kwitansi pembayaran terbilang rupiah), Cetak & Unduh "Form Sertifikat Khitan" (format A4 Landscape elegan dengan bingkai tosca-emas, nomor sertifikat romawi, teks nama berfont Carter One, usia terhitung, dan format hari tanggal khitan seperti "Jumat, 27 Maret 2026") melalui modal preview cetak langsung dan unduhan file .docx ke perangkat tanpa menyimpan ke Google Drive, fitur Salin Template Jawaban Google Review pada kolom aksi (otomatis mengisi sapaan dinamis Ayah/Bunda, nama penanggung jawab, nama ananda, dan doa penutup ramah anak langsung ke clipboard), serta tombol aksi pintasan WhatsApp Ucapan dan WhatsApp Reminder (pada tabel desktop, popover aksi `•••`, dan kartu mobile) untuk mempermudah pengiriman pesan ramah keluarga langsung ke WhatsApp pasien. | Data 32 Kolom Rekam Kunjungan | Grid Tabel Sticky Desktop & Kartu Mobile, Notifikasi Simpan, Modal Preview Cetak & Unduh Word, Tombol Salin Review, Modal WhatsApp Ucapan & Reminder | Wajib Nama Ananda & Tgl Khitan, REGISTER auto-generated (KD+YYMMDD+Urut/Tahun), JUMLAH BAYAR format Rp. 1.350.000,- | REGISTER, ID BOOKING, NAMA ANANDA, TEMPAT LAHIR, TANGGAL LAHIR, BERAT BADAN, TANGGAL KHITAN, JAM KHITAN, METODE KHITAN, UKURAN CELANA, OBAT, NAMA PENANGGUNG JAWAB, USIA PENANGGUNG JAWAB, PEKERJAAN, HUBUNGAN KELUARGA, NOMOR HP, ALAMAT, PROVINSI, KABUPATEN, KECAMATAN, KELURAHAN, UKURAN KLAMP, STATUS BAYAR, JUMLAH BAYAR, ZAKAT, OPERATOR, BMHP OBAT, LEM, FEE, TOTAL, STATUS WA, KETERANGAN |
| FR-07 | Cache History & Optimasi Sinkronisasi Spreadsheet | Manajemen cache snapshot 8 dataset lokal, inspeksi data snapshot JSON, riwayat versi snapshot & rollback/pemulihan, log sinkronisasi terperinci dengan filter & pencarian, ekspor log JSON, pengaturan interval auto-sync (1, 3, 5, 10 mnt, nonaktif) dengan hitung mundur detik, serta optimasi backend server-side caching (CacheService chunking) dan single-flight unified sync endpoint (`syncAdminData`). | Pengaturan interval, perintah refresh/bypass cache, aksi restore snapshot | Matriks status 8 dataset cache, modal viewer JSON snapshot, tabel riwayat snapshot, log riwayat sinkronisasi terfilter, notifikasi status | Validasi token admin untuk endpoint sinkronisasi, kuota penyimpanan LocalStorage browser ~5MB | LocalStorage (`kd_cache_*`, `kd_cache_snapshots_history`, `kd_sync_history`) & CacheService GAS |
| FR-08 | Pengelolaan Data Khitan Jumat Berkah | Pengelolaan data pendaftar & penerima subsidi khitan berkah mingguan di panel admin (Sheet JUMAT BERKAH). Mendukung Tambah Data via penarikan otomatis dari Sheet KUNJUNGAN menggunakan nomor REGISTER yang cocok, edit data, hapus data, tabel dengan header beku dan kolom AKSI + REGISTER beku (sticky left), dropdown bertingkat alamat, combobox pekerjaan dari REFERENSI, perhitungan otomatis usia penanggung jawab, perlindungan teks nomor identitas, serta Cetak Surat Pernyataan Tidak Merokok dengan Modal Preview format A4 dan margin 2.54 cm sesuai template Google Docs sebelum dicetak langsung via Print Dialog browser, tanpa penyimpanan langsung ke perangkat pengguna maupun ke Google Drive. | Data 17 Kolom Jumat Berkah, pencarian REGISTER kunjungan | Tabel Sticky Desktop & Kartu Mobile, Modal Fullscreen Tambah/Edit, Dialog Konfirmasi Hapus, Tombol Aksi Cetak & Modal Preview A4 | Wajib Nama Ananda, Tanggal Khitan, dan Nama PJ; REGISTER unik format KD+YYMMDD+Urut/Tahun; Dokumen dicetak via dialog browser setelah preview tanpa penyimpanan langsung ke perangkat / Google Drive | REGISTER, NAMA ANANDA, TEMPAT LAHIR, TANGGAL LAHIR, TANGGAL KHITAN, NAMA PENANGGUNG JAWAB, TEMPAT LAHIR PENANGGUNG JAWAB, TANGGAL LAHIR PENANGGUNG JAWAB, USIA PENANGGUNG JAWAB, PEKERJAAN, HUBUNGAN KELUARGA, NOMOR IDENTITAS, ALAMAT, PROVINSI, KABUPATEN, KECAMATAN, KELURAHAN |
| FR-09 | Dashboard Card Grafik Total Tahunan & Sinkronisasi Database | Menu utama paling atas panel admin yang menampilkan visualisasi ringkasan kinerja klinik berbasis grafik batang (Bar Chart via Chart.js). Mencakup Grafik Kunjungan per Tahun (akumulasi jumlah pasien khitan per tahun) dan Grafik Pendapatan per Tahun (akumulasi total kolom JUMLAH BAYAR per tahun). Grafik ini bersifat mandiri dan bebas/kebal terhadap filter apapun (menghitung seluruh baris data raw Sheet KUNJUNGAN). Dilengkapi penyesuaian otomatis sumbu Y dan unit ringkas (jt/M), tooltip interaktif, KPI Bar ringkasan akumulatif cepat (Total Pasien Akumulatif, Total Omzet Akumulatif, Rentang Periode Data Rekam), indikator status sinkronisasi live Google Sheets, tombol pemicu langsung "Sinkron Database" (bypass cache `forceRefresh=true`), serta pemuatan otomatis data kunjungan seketika saat login berhasil dan perpindahan ke tab Dashboard. | Data Sheet KUNJUNGAN (tanggalKhitan, jumlahBayar, register) | Dua Bar Chart responsif (Kunjungan Pasien & Pendapatan Rupiah) dalam kontainer Card Grafik Total dengan KPI bar akumulatif dan status sinkronisasi live | Mandiri tanpa terpengaruh filter kolom/bulan/tahun | Mengambil dari seluruh data Sheet KUNJUNGAN |
| FR-10 | Menu Kontak & Informasi Lokasi Klinik | Halaman informasi kontak resmi publik yang dapat diakses melalui menu "Kontak" (ikon WhatsApp) pada posisi paling kanan Bottom Navigation. Memuat Logo & profil klinik, kartu saluran komunikasi (WhatsApp interaktif & tautan kirim Email), kartu alamat praktek lengkap di Sukamelang Subang, serta kartu peta Google Maps responsif (iframe embed pin dan koordinat presisi `@-6.5455663, 107.7619294` dilengkapi pelindung anti-scroll trap interaktif berbasis overlay tap untuk kenyamanan gulir mobile, serta tombol rute menuju tautan resmi Google Maps `https://maps.app.goo.gl/W3pZFZupzuNU4Cdi9`). | Data statis profil kontak klinik | Halaman responsif Kontak dengan kartu kontak, alamat, dan embed peta Google Maps interaktif | Link WA/Email/Maps valid dan ramah sentuhan mobile | Konfigurasi Profil & Lokasi Klinik |
| FR-11 | Dashboard Card Clustered Column Chart (Perbandingan Bulan Antar Tahun) | Menu Dashboard panel admin yang terletak tepat di bawah Grid Card Total Kunjungan. Menampilkan visualisasi perbandingan jumlah kunjungan pasien per bulan yang dikelompokkan berdampingan (*clustered*) berdasarkan tahun (12 kategori bulan Jan–Des pada sumbu X, masing-masing bulan memuat bar per tahun dalam rentang yang dipilih). Dilengkapi filter fleksibel "Rentang Tahun" (2 dropdown: "Dari Tahun" dan "Ke Tahun") dengan validasi batas otomatis (*clamping*), tooltip interaktif mode `index` untuk inspeksi komparasi seluruh tahun secara instan, serta kontainer responsif mobile horizontal-scroll (`min-w-[540px] sm:min-w-full`) agar batang chart tetap proporsional dan mudah dibaca pada layar smartphone. | Data Sheet KUNJUNGAN (register, tanggalKhitan) | Clustered Bar Chart responsif via Chart.js dengan filter rentang tahun, legenda interaktif, dan tooltip indeks bulanan | Nilai filter Dari <= Ke (auto-clamp jika terbalik) | Mengambil dari raw data adminKunjungan |
| FR-12 | Hero Card / Featuring Card (Pengaturan Teks Beranda Publik) | Sub-menu pada Menu Setting Panel Admin (tepat di bawah sub-menu Running Text) untuk mengelola 3 kelompok teks pada kartu selamat datang Beranda akses publik: (1) teks badge atas (span), (2) judul utama (h2 class), dan (3) narasi deskripsi (p class). Dilengkapi live interactive preview, deteksi banner perubahan belum disimpan, tombol reset default, validasi batas karakter, serta tersinkronisasi ke Google Sheets SETTINGS (key `hero_card`) dan snapshot cache lokal. | 3 Kelompok Teks: badgeText (span), titleText (h2), descriptionText (p) | Form Setting 3 Kelompok Input, Live Preview Card Beranda, Indikator Unsaved Changes, Kartu Beranda Publik Dinamis | Judul utama wajib diisi, batasan karakter: badge 100 karkater, judul 200 karakter, narasi 800 karakter | Sheet SETTINGS (key `hero_card`) & LocalStorage (`kd_cache_settings`) |

# 7. Non-Functional Requirements

### UX/Design
- **Warna:** Dominan Tosca (#008080 atau variasi serupa) untuk elemen tombol, header, dan ikon.
- **Tipografi:** Menggunakan font sans-serif yang bersih (seperti Inter atau Roboto) agar mudah dibaca di layar kecil. Pada Panel Admin, diterapkan standar keterbacaan mobile tinggi (skala font minimum 12px–14px, eliminasi teks mikro < 12px, penguatan kontras label & data `text-slate-600/700/800`, serta isolasi mode kompak form hanya pada layar desktop) agar seluruh data rekam medis, kartu mobile view (Booking, Kunjungan, Jumat Berkah), widget KPI, dan navigasi terbaca tegas, jelas, dan nyaman di layar smartphone.
- **Struktur & Urutan Menu Panel Admin:** Navigasi panel admin (Sidebar Desktop, Mobile Drawer Sidebar, dan Horizontal Quick Tabs) tersusun berurutan secara konsisten: (1) Dashboard, (2) Booking, (3) Kunjungan, (4) Galeri, (5) Saran, (6) Jumat Berkah, (7) Users, dan (8) Setting.
- **Layout:** Bottom Navigation Bar harus "sticky" (tetap di bawah saat scroll) pada seluruh halaman publik dengan jarak (gap) ergonomis ±30px terhadap kartu konten terakhir di atasnya tanpa ruang kosong berlebih, dan otomatis disembunyikan secara total saat panel admin terbuka agar tidak mengganggu antarmuka manajemen.
- **Ritme Beranda:** Hero Card (headline utama, value proposition ramah anak, dan CTA "Daftar Sekarang" Fullwidth 44px) berada di urutan pertama paling atas Beranda, diikuti Slideshow Keunggulan Layanan, Social Proof Counters (4 metrik kredibilitas), dan Slider Metode Khitan.
- **Slider Metode:** Foto infografis metode tampil utuh 1:1 tanpa tombol panah melayang di atas gambar agar tidak menutupi visual infografis; navigasi diarahkan pada tombol header `<` `>` dan dot indikator bawah.
- **Ergonomi Input Mobile:** Seluruh input angka dan nomor HP wajib menggunakan atribut `inputmode="numeric"` / `inputmode="decimal"` dan `type="tel"` agar keyboard numerik langsung aktif di smartphone, serta `autocapitalize="characters"` pada kode ID Booking.
- **Header:** Harus mencakup Logo (kiri), Judul & Sub-judul (tengah/kanan).
- **Feedback:** Tombol harus memiliki efek visual (ripple/opacity change) saat ditekan.
- **Loading State:** Menampilkan spinner saat data sedang dikirim atau diambil dari Google Sheets.

### Performance
- **Load Time:** Halaman pertama harus muncul dalam < 2 detik pada koneksi 4G.
- **Asset Size:** Gambar galeri harus dikompresi (WebP recommended) untuk menghemat kuota pengguna.
- **CDN:** Menggunakan CDN untuk Vue.js dan Tailwind CSS untuk memastikan caching yang optimal.

### Security
- **Data Privacy:** Nomor HP di sensor sebagian (misal: 0812****1234) pada tampilan Cek Booking untuk privasi.
- **Input Sanitization:** Mencegah XSS dengan melakukan sanitasi pada input formulir sebelum dikirim ke GAS.
- **API Security:** Menggunakan token sederhana atau validasi origin pada Google Apps Script.

### Compatibility
- **Device:** Optimal pada layar smartphone (360px - 430px lebar).
- **Browser:** Kompatibel dengan Chrome Mobile, Safari (iOS), dan Samsung Internet.

### Technical Constraints
- **Database:** Terbatas pada limitasi Google Sheets (5 juta sel) dan kuota harian Google Apps Script (50,000 request/hari).
- **No Backend:** Tidak ada server fisik; logika bisnis sepenuhnya berada di sisi klien (Vue.js) dan Google Apps Script.

# 8. Scope

## 8.1 In Scope (MVP)
| Feature | Description | Reason for Priority |
| --- | --- | --- |
| Landing Page Mobile | Tampilan utama dengan tema Tosca dan Running Text. | Identitas visual dan informasi dasar. |
| Form Booking | Fitur pendaftaran yang terhubung ke Google Sheets. | Fungsi inti bisnis untuk konversi pasien. |
| Cek Booking | Fitur pelacakan status mandiri oleh pengguna (mendukung pencarian via ID Booking dan opsi cadangan via Nomor HP terdaftar dengan privacy masking). | Mengurangi beban kerja admin dalam menjawab chat dan membantu orang tua yang lupa ID. |
| Galeri & Testimoni | Konten visual non-cropped, paginasi 10 foto per halaman, fitur pencarian instan nama foto/jagoan khitan, dan carousel untuk membangun kepercayaan. | Penting untuk meyakinkan orang tua pasien dan memudahkan orang tua menemukan dokumentasi momen anaknya. |
| Social Proof Counters | Kartu metrik ringkas di Beranda (1.500+ Pasien, 4.9 Rating, 100% Steril, Minim Nyeri) tepat di bawah Hero Card. | Meningkatkan trust and credibility orang tua secara instan. |
| Menu Kontak & Lokasi | Halaman kontak resmi publik di bottom nav (Logo, WhatsApp, Email, Alamat lengkap, dan embed Google Maps pin Rumah Khitan Damai serta tautan Google Maps `https://maps.app.goo.gl/W3pZFZupzuNU4Cdi9`). | Memudahkan pasien menghubungi klinik dan bernavigasi fisik ke lokasi klinik. |
| Panel Admin Terpadu | Dashboard operasional harian (Pasien Hari Ini, Booking Tindak Lanjut, Aksi Cepat), sakelar mode kolom ringkas (10 kolom) vs semua (30 kolom), dropdown aksi dokumen Word/Sertifikat/Review, tabulasi wizard form kunjungan 32 kolom (Biodata, Tindakan, Biaya), dan jembatan konversi 1-klik dari Booking ke Kunjungan. | Mengoptimalkan efisiensi kerja operator klinik, mempercepat input rekam medis, dan mempermudah komunikasi WhatsApp dengan orang tua pasien. |

## 8.2 Out of Scope (Phase 2)
| Feature | Description | Reason for Delay |
| --- | --- | --- |
| Payment Gateway | Integrasi pembayaran uang muka (DP) via Midtrans/Xendit. | Memerlukan legalitas badan usaha dan kompleksitas API. |
| CMS Khusus | Dashboard admin berbasis web untuk manajemen konten. | Sementara bisa dikelola langsung via Google Sheets. |
| Push Notifications | Notifikasi langsung ke HP saat status berubah. | Memerlukan Firebase Cloud Messaging (FCM) dan izin browser. |
| Login User | Sistem akun untuk melihat riwayat khitan keluarga. | Menambah kompleksitas autentikasi pada tahap awal. |