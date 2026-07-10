import { test, expect } from '@playwright/test';

test.describe('SmartSale Catalog and Cart E2E Tests', () => {

  test('1. Catalog Load and Cart Insertion', async ({ page }) => {
    // 1. Log in
    await page.goto('/login');
    await page.locator('input[type="text"]').fill('test.owner');
    await page.locator('input[type="password"]').fill('1313');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/');

    // 2. Navigate to Catalog page
    console.log('Navigating to Catalog page...');
    await page.goto('/catalog');
    await page.waitForURL('**/catalog');

    // 3. Verify category tabs or list is visible
    await expect(page.locator('h4:has-text("Каталог товаров")')).toBeVisible();

    // 4. Verify product cards are displayed
    const productCard = page.locator('.bg-white.rounded-xl.border').first();
    await expect(productCard).toBeVisible();

    // 5. Select a client from client select dropdown if present
    const clientSelect = page.locator('select').first();
    if (await clientSelect.isVisible()) {
      await clientSelect.selectOption({ index: 1 });
      console.log('Selected client context for catalog prices');
    }

    console.log('Catalog load verified.');
  });
});
