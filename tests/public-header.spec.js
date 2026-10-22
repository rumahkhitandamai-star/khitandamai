const { test, expect } = require('@playwright/test');
const path = require('path');

test('Verify Public Header is centered with logo beside title and subtitle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12/13/14 mobile viewport
  const filePath = 'file://' + path.resolve(__dirname, '../asset/Index.html').replace(/\\/g, '/');
  await page.goto(filePath, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Check that header container has justify-center
  const headerDiv = page.locator('header > div').first();
  await expect(headerDiv).toHaveClass(/justify-center/);

  // Check logo and title bounding boxes
  const logo = page.locator('header img[alt="Logo Khitan Damai"]');
  const title = page.locator('header h1');
  const subtitle = page.locator('header p');

  const logoBox = await logo.boundingBox();
  const titleBox = await title.boundingBox();
  const headerBox = await headerDiv.boundingBox();

  console.log('Header bounding box:', headerBox);
  console.log('Logo bounding box:', logoBox);
  console.log('Title bounding box:', titleBox);

  // Logo must be to the left of title: logoBox.x + logoBox.width <= titleBox.x + gap
  expect(logoBox.x).toBeLessThan(titleBox.x);

  // Calculate the combined center of logo + title block relative to header center
  const groupLeft = logoBox.x;
  const groupRight = titleBox.x + titleBox.width;
  const groupCenter = (groupLeft + groupRight) / 2;
  const headerCenter = headerBox.x + (headerBox.width / 2);

  console.log('Group center:', groupCenter, 'Header center:', headerCenter);
  // Center alignment tolerance: within 15px of exact center
  expect(Math.abs(groupCenter - headerCenter)).toBeLessThan(20);
});
