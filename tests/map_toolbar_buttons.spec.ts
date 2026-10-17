import { test, expect } from '@playwright/test';

test.describe('SmartSale Map Toolbar Buttons & Legend E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Log in as supervisor
    await page.goto('/login');
    const usernameInput = page.locator('input[placeholder="имя@компания"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(usernameInput).toBeVisible({ timeout: 15000 });

    await usernameInput.fill('test.supervisor@savdotech');
    await passwordInput.fill('123456');
    await page.locator('button[type="submit"]').click();

    // Verify successful login
    await expect(page.locator('aside')).toBeVisible({ timeout: 20000 });

    // 2. Navigate to map page
    await page.goto('/map');
    await page.waitForURL('**/map', { timeout: 15000 });
    
    // Switch to Leaflet 2D raster engine for these tests
    const rasterBtn = page.locator('#btn-engine-leaflet');
    await expect(rasterBtn).toBeVisible({ timeout: 15000 });
    await rasterBtn.click();
    await page.waitForSelector('.leaflet-container', { timeout: 15000 });
  });

  test('1. Legend is collapsed by default and can be toggled', async ({ page }) => {
    // Legend toggle button should display 'Развернуть' by default
    const legendBox = page.locator('div:has-text("Легенда карты")').last();
    const legendToggle = legendBox.locator('button:has-text("Развернуть")');
    await expect(legendToggle).toBeVisible();

    // The expanded legend details should NOT be visible
    const legendDetails = page.locator('text=План маршрута обхода');
    await expect(legendDetails).not.toBeVisible();

    // Click 'Развернуть' to expand legend
    await legendToggle.click();
    const collapseBtn = legendBox.locator('button:has-text("Свернуть")');
    await expect(collapseBtn).toBeVisible();
    await expect(legendDetails).toBeVisible();
    await expect(page.locator('text=Торговые точки')).toBeVisible();

    // Click 'Свернуть' to collapse it back
    await collapseBtn.click();
    await expect(legendToggle).toBeVisible();
    await expect(legendDetails).not.toBeVisible();
  });

  test('2. Toggle [🧭 Ориентиры] button', async ({ page }) => {
    const landmarksBtn = page.locator('button[title*="Ориентиры"]');
    await expect(landmarksBtn).toBeVisible();

    // By default it is inactive (no bg-sky-50)
    await expect(landmarksBtn).not.toHaveClass(/bg-sky-50/);

    // Click to enable
    await landmarksBtn.click();
    await expect(landmarksBtn).toHaveClass(/bg-sky-50/);

    // Click to disable again
    await landmarksBtn.click();
    await expect(landmarksBtn).not.toHaveClass(/bg-sky-50/);
  });

  test('3. Global theme toggle (#theme-toggle-btn) controls map theme', async ({ page }) => {
    const globalThemeBtn = page.locator('#theme-toggle-btn');
    await expect(globalThemeBtn).toBeVisible();

    const isDarkInitial = await page.evaluate(() => document.documentElement.classList.contains('dark'));

    // Click global theme toggle
    await globalThemeBtn.click();
    const isDarkToggled = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkToggled).toBe(!isDarkInitial);

    // Click again to revert
    await globalThemeBtn.click();
    const isDarkReverted = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkReverted).toBe(isDarkInitial);
  });

  test('4. Toggle [⚡ Белые пятна] and Category Filters', async ({ page }) => {
    const leadsBtn = page.locator('button[title*="непокрытые торговые точки"]');
    await expect(leadsBtn).toBeVisible();

    // By default categories bar is NOT visible
    await expect(page.locator('text=Точки:')).not.toBeVisible();

    // Click to activate market leads
    await leadsBtn.click();
    await expect(leadsBtn).toHaveClass(/bg-gradient-to-r/);

    // Category filter bar should now appear
    await expect(page.locator('text=Точки:')).toBeVisible();
    const catBar = page.locator('div:has-text("Точки:")').last();
    const allCatBtn = catBar.locator('button:has-text("Все")');
    const shopsCatBtn = catBar.locator('button:has-text("Магазины")');
    const cafeCatBtn = catBar.locator('button:has-text("Общепит")');
    const pharmacyCatBtn = catBar.locator('button:has-text("Аптеки")');

    await expect(allCatBtn).toBeVisible();
    await expect(shopsCatBtn).toBeVisible();
    await expect(cafeCatBtn).toBeVisible();
    await expect(pharmacyCatBtn).toBeVisible();

    // Click each category filter
    await shopsCatBtn.click();
    await expect(shopsCatBtn).toHaveClass(/bg-amber-500/);

    await cafeCatBtn.click();
    await expect(cafeCatBtn).toHaveClass(/bg-amber-500/);

    await pharmacyCatBtn.click();
    await expect(pharmacyCatBtn).toHaveClass(/bg-amber-500/);

    await allCatBtn.click();
    await expect(allCatBtn).toHaveClass(/bg-amber-500/);

    // Click Белые пятна button to close
    await leadsBtn.click();
    await expect(page.locator('text=Точки:')).not.toBeVisible();
  });

  test('5. Toggle [🛣️ Дороги], [👥 Агенты], [🏪 Клиенты]', async ({ page }) => {
    const topBar = page.locator('div.absolute.top-4.left-1\\/2');
    const roadsBtn = topBar.locator('button:has-text("Дороги")');
    const agentsBtn = topBar.locator('button:has-text("Агенты")');
    const clientsBtn = topBar.locator('button:has-text("Клиенты")');

    await expect(roadsBtn).toBeVisible();
    await expect(agentsBtn).toBeVisible();
    await expect(clientsBtn).toBeVisible();

    // Toggling roads
    await roadsBtn.click();
    await roadsBtn.click();

    // Toggling agents
    await agentsBtn.click();
    await agentsBtn.click();

    // Toggling clients
    await clientsBtn.click();
    await clientsBtn.click();
  });

});
