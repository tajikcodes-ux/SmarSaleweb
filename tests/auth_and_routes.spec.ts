import { test, expect } from '@playwright/test';

test.describe('SmartSale Frontend E2E Tests', () => {

  test('1. Successful Login as Supervisor and Navigation to Map', async ({ page }) => {
    // Navigate to Login Page
    console.log('Navigating to login page...');
    await page.goto('/login');
    
    // Expect login inputs to be visible
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Fill in supervisor credentials
    await page.locator('input[type="text"]').fill('test.supervisor');
    await page.locator('input[type="password"]').fill('1313');

    // Click submit button
    await page.locator('button[type="submit"]').click();

    // Expect redirection to dashboard home
    console.log('Waiting for URL redirect to dashboard root...');
    await page.waitForURL('**/', { timeout: 10000 });
    
    // Navigate to Map page explicitly
    console.log('Navigating to /map...');
    await page.goto('/map');
    await page.waitForURL('**/map', { timeout: 10000 });
    
    // Check if the map panel title or elements are visible
    await expect(page.locator('text=Список Агентов на карте')).toBeVisible();
    console.log('Login and Map E2E verified successfully!');
  });

  test('2. Client Marker and Sidebar Inspection on Map page', async ({ page }) => {
    // Log in again
    await page.goto('/login');
    await page.locator('input[type="text"]').fill('test.supervisor');
    await page.locator('input[type="password"]').fill('1313');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/');

    // Go to map
    await page.goto('/map');
    await page.waitForURL('**/map');

    // Check if Leaflet map container is present
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();

    // Check if sidebar list of agents is displayed
    const agentListHeader = page.locator('text=Список Агентов на карте');
    await expect(agentListHeader).toBeVisible();

    console.log('UI elements loaded successfully.');
  });
});
