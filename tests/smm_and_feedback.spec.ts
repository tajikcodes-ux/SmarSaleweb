import { test, expect } from '@playwright/test';

test.describe('SmartSale SMM and Feedback panels E2E Tests', () => {

  test('1. SMM Moderator Panel Load', async ({ page }) => {
    // 1. Log in
    await page.goto('/login');
    await page.locator('input[type="text"]').fill('test.owner');
    await page.locator('input[type="password"]').fill('1313');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/');

    // 2. Go to SMM Panel
    console.log('Navigating to SMM Panel...');
    await page.goto('/smm');
    await page.waitForURL('**/smm');

    // 3. Verify SMM title is visible
    await expect(page.locator('text=Создать задачу')).toBeVisible();
    await expect(page.locator('text=Модерация')).toBeVisible();
  });

  test('2. Feedback Suggestions List Load', async ({ page }) => {
    // 1. Log in
    await page.goto('/login');
    await page.locator('input[type="text"]').fill('test.owner');
    await page.locator('input[type="password"]').fill('1313');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/');

    // 2. Go to Feedback Panel
    console.log('Navigating to Feedback Panel...');
    await page.goto('/feedback');
    
    // Check if either feedback page is visible
    const fbHeader = page.locator('text=Обратная связь').first();
    await expect(fbHeader).toBeVisible();
    console.log('Feedback loaded.');
  });
});
