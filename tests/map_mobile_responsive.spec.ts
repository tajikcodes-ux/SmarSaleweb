import { test, expect } from '@playwright/test';

test.describe('SmartSale Mobile Map Responsiveness & Usability Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    const usernameInput = page.locator('input[placeholder="имя@компания"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(usernameInput).toBeVisible({ timeout: 15000 });

    await usernameInput.fill('test.supervisor@savdotech');
    await passwordInput.fill('123456');
    await page.locator('button[type="submit"]').click();

    // Wait for login redirection
    await page.waitForResponse(resp => resp.url().includes('/auth/login') && resp.status() === 201 || resp.status() === 200);
    await page.waitForFunction(() => !!localStorage.getItem('access_token'), { timeout: 15000 });

    // Navigate to map page
    await page.goto('/map');
    await page.waitForURL('**/map', { timeout: 15000 });
  });

  test('1. Mobile unified top control bar is visible and desktop toolbars are hidden', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Поиск по 81 000 адресам..."]');
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    const desktopSearch = page.locator('input[placeholder="Поиск по 81 000 адресам Согда (13-й мкр...)"]');
    await expect(desktopSearch).not.toBeVisible();

    const badge = page.locator('text=MapLibre GL GPU WebGL');
    await expect(badge).not.toBeVisible();

    const perspectiveBtn = page.locator('button:has-text("3D Дворы"), button:has-text("2D План")').first();
    await expect(perspectiveBtn).toBeVisible();
  });

  test('2. Mobile filter button opens bottom sheet modal', async ({ page }) => {
    const filterBtn = page.locator('button[title="Фильтр ролей"]');
    await expect(filterBtn).toBeVisible({ timeout: 15000 });
    await filterBtn.click();

    const modalTitle = page.locator('text=Фильтр объектов на карте');
    await expect(modalTitle).toBeVisible();

    const salesRepOption = page.locator('button:has-text("Торговые агенты")');
    await expect(salesRepOption).toBeVisible();
    await salesRepOption.click();

    await expect(modalTitle).not.toBeVisible();
  });

  test('3. Mobile layer toggles and timeline scrubber work smoothly', async ({ page }) => {
    const layersBtn = page.locator('button[title="Слои карты"]');
    await expect(layersBtn).toBeVisible({ timeout: 15000 });
    await layersBtn.click();

    const roadsBtn = page.locator('button:has-text("Дороги")').first();
    await expect(roadsBtn).toBeVisible();

    const timelineBtn = page.locator('button[title="Таймлайн перемещений"]');
    await expect(timelineBtn).toBeVisible();
    await timelineBtn.click();

    const timelineTitle = page.locator('text=Таймлайн:');
    await expect(timelineTitle).toBeVisible();

    const legendBtn = page.locator('button:has-text("Легенда")');
    await expect(legendBtn).toBeVisible();
    await legendBtn.click();

    const legendModalTitle = page.locator('text=Обозначения на карте');
    await expect(legendModalTitle).toBeVisible();
  });
});
