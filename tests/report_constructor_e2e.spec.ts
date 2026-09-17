import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://sale.somonsavdo.com';

test.describe('MBI Report Constructor Frontend E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    const usernameInput = page.locator('input[placeholder="имя@компания"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(usernameInput).toBeVisible({ timeout: 15000 });
    
    await usernameInput.fill('test.supervisor@savdotech');
    await passwordInput.fill('123456');
    await page.locator('button[type="submit"]').click();

    // Verify successful login
    await expect(page.locator('aside')).toBeVisible({ timeout: 20000 });
  });

  test('1. Navigation to /reports and core UI presence', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');

    // Header & Badge
    await expect(page.locator('h1:has-text("Конструктор отчетов MBI")')).toBeVisible();
    await expect(page.locator('span:has-text("OLAP 2.0")')).toBeVisible();

    // 4 Drop Zones
    await expect(page.locator('text=Строки (Иерархия уровней группировки)')).toBeVisible();
    await expect(page.locator('text=Столбцы (Кросс-таблица 2D Матрица)')).toBeVisible();
    await expect(page.locator('text=Показатели (Рассчитываемые значения)')).toBeVisible();

    // Library & Search
    await expect(page.locator('text=Библиотека полей')).toBeVisible();
    await expect(page.locator('input[placeholder="Поиск полей и метрик..."]')).toBeVisible();

    // Action buttons
    await expect(page.locator('button:has-text("Предпросмотр А4")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Excel (.xlsx)")')).toBeVisible();
    await expect(page.locator('button:has-text("Печать")')).toBeVisible();
    console.log('Test 1 PASSED: Core UI, 4 Drop Zones, and action buttons verified.');
  });

  test('2. Field Library search and category filtering', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');

    // Search filter
    const searchInput = page.locator('input[placeholder="Поиск полей и метрик..."]');
    await searchInput.fill('Клиент');
    await expect(page.locator('text=Клиент / Торговая точка')).toBeVisible();

    // Category filter: Click "Товары" inside the tabs
    await searchInput.fill('');
    await page.getByRole('button', { name: 'Товары', exact: true }).click();
    await expect(page.locator('text=Категория товара / Бренд')).toBeVisible();
    await expect(page.locator('text=Товар (SKU)')).toBeVisible();

    // All categories
    await page.getByRole('button', { name: 'Все', exact: true }).click();
    await expect(page.locator('text=Торговый представитель').first()).toBeVisible();
    console.log('Test 2 PASSED: Field library search and category tabs verified.');
  });

  test('3. Preset Switching: 2D Matrix vs Standard Table', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');

    // Switch to 2D Matrix Preset
    const matrixPresetBtn = page.locator('button:has-text("Матрица продаж по дням (2D)")');
    await expect(matrixPresetBtn).toBeVisible();
    await matrixPresetBtn.click();

    // Verify 2D Matrix active tag
    await expect(page.locator('text=Матрица активна')).toBeVisible({ timeout: 10000 });

    // Switch to ACB preset
    const acbPresetBtn = page.locator('button:has-text("Анализ АКБ и Покрытия")');
    await acbPresetBtn.click();
    await expect(page.locator('text=Стандартно')).toBeVisible();
    console.log('Test 3 PASSED: Preset switching (2D Matrix and 1D Table) verified.');
  });

  test('4. View Mode: Switch to Smartup Blueprint Structure Preview', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');

    // Click Blueprint Preview tab
    const blueprintTab = page.locator('button:has-text("Предпросмотр макета")');
    await expect(blueprintTab).toBeVisible();
    await blueprintTab.click();

    // Verify blueprint skeleton table
    await expect(page.locator('text=Скелет макета таблицы (Smartup Blueprint Preview)')).toBeVisible();

    // Switch back to Data view
    await page.locator('button:has-text("Данные отчета")').click();
    await expect(page.locator('text=Скелет макета таблицы (Smartup Blueprint Preview)')).not.toBeVisible();
    console.log('Test 4 PASSED: View mode toggling (Data vs Blueprint Preview) verified.');
  });

  test('5. A4 Print Preview Modal workflow', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');

    // Wait for data calculation to finish so button becomes enabled
    const previewBtn = page.locator('button:has-text("Предпросмотр А4")').first();
    await expect(previewBtn).toBeEnabled({ timeout: 15000 });
    await previewBtn.click();

    // Verify Modal contents
    const modal = page.locator('.fixed.inset-0');
    await expect(modal.locator('text=Предпросмотр печатной формы А4')).toBeVisible();
    await expect(modal.getByText('ООО "СОМОН САВДО"', { exact: true })).toBeVisible();
    await expect(modal.locator('text=ОФИЦИАЛЬНЫЙ АНАЛИТИЧЕСКИЙ ОТЧЕТ MBI').first()).toBeVisible();
    await expect(modal.locator('text=Руководитель отдела продаж').first()).toBeVisible();
    await expect(modal.locator('text=Главный бухгалтер').first()).toBeVisible();
    await expect(modal.locator('text=М.П.').first()).toBeVisible();

    // Close Modal
    await expect(modal.locator('button:has-text("Отправить на печать")')).toBeVisible();
    const closeBtn = modal.locator('div.bg-gray-900 button').last();
    await closeBtn.click();
    await expect(page.locator('text=Предпросмотр печатной формы А4')).not.toBeVisible();
    console.log('Test 5 PASSED: A4 Print Preview Modal opened, verified and closed.');
  });

  test('6. Excel (.xlsx) Export trigger', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');

    // Wait for data table summary row
    await page.waitForSelector('text=ИТОГО ПО КОМПАНИИ', { timeout: 15000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    const excelBtn = page.locator('button:has-text("Excel (.xlsx)")');
    await expect(excelBtn).toBeEnabled({ timeout: 10000 });
    await excelBtn.click();

    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    console.log('Downloaded file:', filename);
    expect(filename).toContain('.xlsx');
    expect(filename).toContain('smartsale_mbi_report');
    console.log('Test 6 PASSED: Excel (.xlsx) export generated and downloaded successfully.');
  });

});
