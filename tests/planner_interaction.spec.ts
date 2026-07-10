import { test, expect } from '@playwright/test';

test.describe('SmartSale Route Planner E2E Tests', () => {

  test('1. Sidebar Agent Selection and Focus View', async ({ page }) => {
    // 1. Log in
    await page.goto('/login');
    await page.locator('input[type="text"]').fill('test.supervisor');
    await page.locator('input[type="password"]').fill('1313');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/');

    // 2. Go to map
    await page.goto('/map');
    await page.waitForURL('**/map');

    // 3. Click on the test agent in the sidebar list
    console.log('Selecting Фирдавс Алиев from sidebar...');
    const agentListItem = page.locator('text=Фирдавс Алиев');
    await expect(agentListItem).toBeVisible();
    await agentListItem.click();

    // 4. Expect sidebar header to change to Selected Agent view
    await expect(page.locator('text=Планирование маршрута')).toBeVisible();
    await expect(page.locator('text=← Назад')).toBeVisible();

    // 5. Click Back button to return to the full list
    console.log('Clicking ← Назад to return to full agents list...');
    await page.locator('text=← Назад').click();

    // 6. Expect the full list to be visible again
    await expect(page.locator('text=Список Агентов на карте')).toBeVisible();
  });

  test('2. Add Route Point, Copy, and Optimize Actions', async ({ page }) => {
    // Log in and go to map
    await page.goto('/login');
    await page.locator('input[type="text"]').fill('test.supervisor');
    await page.locator('input[type="password"]').fill('1313');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/');
    await page.goto('/map');
    await page.waitForURL('**/map');

    // Focus agent
    await page.locator('text=Фирдавс Алиев').click();

    // Verify presence of planner actions
    await expect(page.locator('text=Оптимизировать')).toBeVisible();
    await expect(page.locator('text=Копировать')).toBeVisible();
    await expect(page.locator('text=Добавить точку в маршрут')).toBeVisible();

    // Select a client in dropdown and click add
    const clientSelect = page.locator('select');
    await expect(clientSelect).toBeVisible();
    
    // Choose first client if available
    const count = await clientSelect.locator('option').count();
    if (count > 1) {
      await clientSelect.selectOption({ index: 1 });
      const addPointBtn = page.locator('button:has-text("Добавить точку")');
      await expect(addPointBtn).toBeEnabled();
      await addPointBtn.click();
      console.log('Added route point successfully');
    }
  });
});
