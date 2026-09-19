import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://sale.somonsavdo.com';

test.describe('SmartSale 2.0 B2B Landing Page E2E Suite', () => {

  test('1. Landing page loads cleanly and displays Hero section', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await page.waitForLoadState('networkidle');

    // Title / Brand
    await expect(page.locator('header').locator('text=SmartSale')).toBeVisible();

    // Main Hero Headline
    await expect(page.locator('h1:has-text("Полный порядок в оптовых продажах за 24 часа")')).toBeVisible();
    await expect(page.locator('text=Создано для оптовиков и дистрибьюторов FMCG')).toBeVisible();

    // Key bullets
    await expect(page.locator('text=Агент не сможет оформить визит из дома или авто')).toBeVisible();
    await expect(page.locator('text=Водитель не отгрузит товар в долг знакомым')).toBeVisible();

    // Capture Hero screenshot
    await page.screenshot({ path: 'C:/Users/User/.gemini/antigravity/brain/71bef661-5954-4e81-aa3c-1b0cb43807ba/landing_hero_preview.png' });
  });

  test('2. Interactive Ecosystem Tabs switch correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await page.waitForLoadState('networkidle');

    // Tab 1: SFA is active by default
    await expect(page.locator('text=Мобильное приложение: агент оформляет заказ за 30 секунд')).toBeVisible();

    // Click MBI tab (scoped to #features)
    await page.locator('#features').locator('button:has-text("Конструктор MBI в Excel")').click();
    await expect(page.locator('text=Конструктор MBI: любые отчеты в красивый Excel')).toBeVisible();
    await expect(page.locator('#features').locator('text=Баходур С.')).toBeVisible();

    // Click GPS & Routes tab
    await page.locator('button:has-text("GPS-контроль маршрутов")').click();
    await expect(page.locator('text=Честный GPS-контроль: видите точный маршрут на карте')).toBeVisible();

    // Click WMS Warehouse tab
    await page.locator('button:has-text("Склад и WMS")').click();
    await expect(page.locator('text=Склад и WMS: мгновенный резерв товара без пересортицы')).toBeVisible();

    // Click Finance & Debts tab
    await page.locator('button:has-text("Финансы и Стоп-лист")').click();
    await expect(page.locator('text=Кредитный стоп-лист: защищает оборотные средства компании')).toBeVisible();

    // Click Telegram Bot tab
    await page.locator('button:has-text("B2B Telegram Бот")').click();
    await expect(page.locator('text=B2B Telegram Бот: магазины сами делают дозаказы 24/7')).toBeVisible();
  });

  test('3. Direct Comparison Table renders against other SFA and 1C', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    await expect(table.first()).toBeVisible();

    // Header cells
    await expect(page.locator('th:has-text("SmartSale 2.0")')).toBeVisible();
    await expect(page.locator('th:has-text("Традиционные SFA-системы")')).toBeVisible();
    await expect(page.locator('th:has-text("Классическая 1С:Предприятие")')).toBeVisible();

    // Crucial comparison criteria
    await expect(page.locator('td:has-text("1 рабочий день (24 часа)")')).toBeVisible();

    // Capture comparison screenshot
    await page.locator('#comparison').screenshot({ path: 'C:/Users/User/.gemini/antigravity/brain/71bef661-5954-4e81-aa3c-1b0cb43807ba/landing_comparison_preview.png' });
  });

  test('4. Interactive ROI Calculator updates calculations live', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await page.waitForLoadState('networkidle');

    // Check calculator presence
    await expect(page.locator('h2:has-text("Калькулятор окупаемости внедрения SmartSale")')).toBeVisible();

    // Verify initial values
    await expect(page.locator('text=10 чел.')).toBeVisible();

    // Switch currency to USD
    await page.locator('button:has-text("USD ($)")').click();
    await expect(page.locator('text=$').first()).toBeVisible();

    // Switch currency to UZS
    await page.locator('button:has-text("UZS (сум)")').click();
    await expect(page.locator('text=сум').first()).toBeVisible();

    // Capture calculator screenshot
    await page.locator('#calculator').screenshot({ path: 'C:/Users/User/.gemini/antigravity/brain/71bef661-5954-4e81-aa3c-1b0cb43807ba/landing_calculator_preview.png' });
  });

  test('5. FAQ Accordion toggles open and close', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await page.waitForLoadState('networkidle');

    // First question is open by default
    await expect(page.locator('text=Сколько времени занимает полный переход на SmartSale?')).toBeVisible();
    await expect(page.locator('text=Ровно 1 рабочий день (24 часа)')).toBeVisible();

    // Click second question
    const q2 = page.locator('button:has-text("Можно ли безболезненно перейти с других программ или 1С?")');
    await q2.click();
    await expect(page.locator('text=Мы предоставляем готовый конвертер данных')).toBeVisible();
  });

  test('6. Demo Request Modal opens, validates and submits lead successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing`);
    await page.waitForLoadState('networkidle');

    // Click Top Nav "Попробовать бесплатно" button
    const demoBtn = page.locator('header button:has-text("Попробовать бесплатно")');
    await demoBtn.click();

    // Scope to Modal dialog
    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h3:has-text("Попробуйте SmartSale 2.0 в действии")')).toBeVisible();

    // Fill modal form
    await modal.locator('input[placeholder="Ваше имя"]').fill('Директор Опта');
    await modal.locator('input[type="tel"]').fill('+992900112233');
    await modal.locator('input[placeholder="Название"]').fill('ООО Сомон Трейд');
    await modal.locator('textarea[placeholder*="сейчас ведем учет"]').fill('Контроль 14 торговых агентов в Душанбе');

    // Submit form
    await modal.locator('button:has-text("Отправить заявку")').click();

    // Success confirmation
    await expect(modal.locator('text=Заявка принята!')).toBeVisible({ timeout: 10000 });
    await expect(modal.locator('text=Мы свяжемся с вами в течение 15 минут')).toBeVisible();
  });

  test('7. Login page links to Landing page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    const landingLink = page.locator('button:has-text("О возможностях SmartSale 2.0 и тарифы →")');
    await expect(landingLink).toBeVisible();
    await landingLink.click();

    await page.waitForURL('**/landing');
    await expect(page.locator('h1:has-text("Полный порядок в оптовых продажах за 24 часа")')).toBeVisible();
  });

});
