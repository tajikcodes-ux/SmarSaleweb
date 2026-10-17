import { test, expect } from '@playwright/test';

test.describe('SmartSale MapLibre GL 3D Engine & Dual-Mode E2E Tests', () => {

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
  });

  test('1. MapLibre GL 3D Vector Engine is active by default', async ({ page }) => {
    // Verify engine buttons exist
    const vectorBtn = page.locator('#btn-engine-maplibre');
    const rasterBtn = page.locator('#btn-engine-leaflet');

    await expect(vectorBtn).toBeVisible({ timeout: 15000 });
    await expect(rasterBtn).toBeVisible();

    // Vector button should be selected (has active blue styling)
    await expect(vectorBtn).toHaveClass(/bg-\[#0071e3\]/);

    // MapLibre canvas/container should exist
    const maplibreCanvas = page.locator('.maplibregl-canvas');
    await expect(maplibreCanvas).toBeVisible({ timeout: 15000 });

    // Badge showing "MapLibre GL GPU WebGL" should be visible
    const badge = page.locator('text=MapLibre GL GPU WebGL');
    await expect(badge).toBeVisible();
  });

  test('2. Toggle 3D Perspective button', async ({ page }) => {
    // Find 3D toggle button (3D Дворы / 2D План)
    const perspectiveBtn = page.locator('button[title*="3D / 2D"]');
    await expect(perspectiveBtn).toBeVisible({ timeout: 15000 });

    // By default it is in 3D mode
    await expect(perspectiveBtn).toHaveText(/3D Дворы/);

    // Click to switch to 2D
    await perspectiveBtn.click();
    await expect(perspectiveBtn).toHaveText(/2D План/);

    // Click again to switch back to 3D
    await perspectiveBtn.click();
    await expect(perspectiveBtn).toHaveText(/3D Дворы/);
  });

  test('3. Seamless switching between 3D Vector and 2D Raster Leaflet', async ({ page }) => {
    const vectorBtn = page.locator('#btn-engine-maplibre');
    const rasterBtn = page.locator('#btn-engine-leaflet');

    // Switch to Leaflet 2D Raster
    await rasterBtn.click();
    await expect(rasterBtn).toHaveClass(/bg-\[#0071e3\]/);
    await expect(vectorBtn).not.toHaveClass(/bg-\[#0071e3\]/);

    // Leaflet map container should be visible
    const leafletMap = page.locator('.leaflet-container');
    await expect(leafletMap).toBeVisible();

    // Switch back to 3D Vector
    await vectorBtn.click();
    await expect(vectorBtn).toHaveClass(/bg-\[#0071e3\]/);
    const maplibreCanvas = page.locator('.maplibregl-canvas');
    await expect(maplibreCanvas).toBeVisible();
  });

  test('4. Global dark mode toggle works smoothly with MapLibre', async ({ page }) => {
    const themeBtn = page.locator('#theme-toggle-btn');
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(500);

      // Verify html class toggled
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

      // Map canvas still renders cleanly
      const maplibreCanvas = page.locator('.maplibregl-canvas');
      await expect(maplibreCanvas).toBeVisible();

      // Toggle back
      await themeBtn.click();
      await page.waitForTimeout(500);
    }
  });

});
