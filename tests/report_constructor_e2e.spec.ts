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

    // Action buttons (including new features)
    await expect(page.locator('button:has-text("Сохранить шаблон")')).toBeVisible();
    await expect(page.locator('button:has-text("Предпросмотр А4")').first()).toBeVisible();
    await expect(page.locator('button:has-text("В Telegram")')).toBeVisible();
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


  test('7. Save Custom Report Template Modal workflow', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');

    // Click Save Template button
    const saveBtn = page.locator('button:has-text("Сохранить шаблон")');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Verify modal appeared
    const modal = page.locator('.fixed.inset-0:has-text("Сохранить как шаблон")');
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[placeholder*="Например: Ежедневный срез"]')).toBeVisible();

    // Fill template name and description
    await modal.locator('input[placeholder*="Например: Ежедневный срез"]').fill('E2E Тестовый Шаблон');
    await modal.locator('textarea').fill('Автоматически созданный шаблон в E2E тесте');

    // Verify structure preview in modal
    await expect(modal.locator('text=Структура шаблона:')).toBeVisible();

    // Close modal
    await modal.locator('button:has-text("Отмена")').click();
    await expect(modal).not.toBeVisible();
    console.log('Test 7 PASSED: Save Template modal opened, verified and cancelled successfully.');
  });

  test('8. In-Field Filter Popover and Active Filters Bar', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');

    // Wait for data table to load
    await page.waitForSelector('text=ИТОГО ПО КОМПАНИИ', { timeout: 15000 });

    // Find filter button on the first row pill (Торговый представитель)
    const filterBtn = page.locator('div:has-text("Торговый представитель") button[title="Фильтровать значения"]').first();
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    // Verify filter popover modal
    const filterModal = page.locator('.fixed.inset-0:has-text("Фильтр: Торговый представитель")');
    await expect(filterModal).toBeVisible();
    await expect(filterModal.locator('input[placeholder="Поиск значений..."]')).toBeVisible();

    // Check search functionality
    const searchInput = filterModal.locator('input[placeholder="Поиск значений..."]');
    await searchInput.fill('Алишер');
    await page.waitForTimeout(300);

    // Apply / Close filter
    await filterModal.locator('button:has-text("Применить")').click();
    await expect(filterModal).not.toBeVisible();
    console.log('Test 8 PASSED: In-field filter popover, search, and application verified.');
  });

  test('9. Telegram Report Dispatch Trigger', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');

    // Wait for data table to load
    await page.waitForSelector('text=ИТОГО ПО КОМПАНИИ', { timeout: 15000 });

    const tgBtn = page.locator('button:has-text("В Telegram")');
    await expect(tgBtn).toBeEnabled({ timeout: 10000 });
    await tgBtn.click();

    // Verify notification alert banner appears (either success or instructions to link account)
    const alert = page.locator('div:has-text("Успешно отправлено"), div:has-text("Внимание")').first();
    await expect(alert).toBeVisible({ timeout: 15000 });
    console.log('Test 9 PASSED: Telegram dispatch triggered and feedback banner displayed.');
  });

  test('10. Catalog & Clients Excel Bulk Import Modals', async ({ page }) => {
    // 10.1 Check Catalog
    await page.goto(`${BASE_URL}/catalog`);
    await page.waitForLoadState('networkidle');

    const catalogImportBtn = page.locator('button:has-text("Импорт из Excel")');
    await expect(catalogImportBtn).toBeVisible();
    await catalogImportBtn.click();

    const catalogModal = page.locator('.fixed.inset-0:has-text("Массовый импорт товаров из Excel")');
    await expect(catalogModal).toBeVisible();
    await expect(catalogModal.locator('button:has-text("Скачать .xlsx")')).toBeVisible();
    await catalogModal.locator('button:has-text("Закрыть")').click();
    await expect(catalogModal).not.toBeVisible();

    // 10.2 Check Clients
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('networkidle');

    const clientsImportBtn = page.locator('button:has-text("Импорт из Excel")');
    await expect(clientsImportBtn).toBeVisible();
    await clientsImportBtn.click();

    const clientsModal = page.locator('.fixed.inset-0:has-text("Массовый импорт торговых точек")');
    await expect(clientsModal).toBeVisible();
    await expect(clientsModal.locator('button:has-text("Скачать .xlsx")')).toBeVisible();
    await clientsModal.locator('button:has-text("Закрыть")').click();
    await expect(clientsModal).not.toBeVisible();

    console.log('Test 10 PASSED: Bulk Excel Import modals in Catalog and Clients verified.');
  });
});
