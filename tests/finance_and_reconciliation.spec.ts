import { test, expect } from '@playwright/test';

test.describe('SmartSale financier Dashboard E2E Tests', () => {

  test('1. Payments Registry and Reconciliation View', async ({ page }) => {
    // 1. Log in as financier
    await page.goto('/login');
    await page.locator('input[type="text"]').fill('test.financier');
    await page.locator('input[type="password"]').fill('1313');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/');

    // 2. Go to Payments page
    console.log('Navigating to Payments registry...');
    await page.goto('/payments');
    await page.waitForURL('**/payments');

    // 3. Verify Payments page title is visible
    await expect(page.locator('text=Реестр поступивших платежей')).toBeVisible();

    // 4. Verify presence of payments table
    const tableHeader = page.locator('text=Сумма (TJS)');
    await expect(tableHeader).toBeVisible();
    console.log('Payments registry verified.');
  });
});
