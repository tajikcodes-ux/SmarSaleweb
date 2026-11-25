import { expect, Page, test } from '@playwright/test';
import { API_URL, PASSWORD, login } from './env';

/** The web panel in a real browser against the e2e company: sign-in, every section, roles, the profile. */

// One sign-in per account for the whole run: sign-in attempts are rate limited per account
const sessions = new Map<string, { access_token: string; user: any }>();

async function signIn(page: Page, user: string, password = PASSWORD) {
  if (!sessions.has(user)) {
    const res = await page.request.post(`${API_URL}/auth/login`, { data: { username: login(user), password } });
    expect(res.ok(), `login ${user}: ${res.status()}`).toBeTruthy();
    sessions.set(user, await res.json());
  }
  const { access_token, user: profile } = sessions.get(user)!;
  await page.goto('/login');
  // Signed in as the app does it; the guided tour is marked as seen so it does not cover the page
  await page.evaluate(
    ([token, stored, tourKey]) => {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', stored);
      localStorage.setItem(tourKey, '1');
    },
    [access_token, JSON.stringify(profile), `smartsale_tour_seen_${profile.id}`],
  );
  return profile;
}

/** Collects what a broken page leaves behind: uncaught errors and server failures. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (err) => problems.push(`page error: ${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 500) problems.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  });
  return problems;
}

test.describe('sign-in', () => {
  test('a wrong password is explained under the form', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('имя@компания').fill(login('agent1'));
    await page.getByPlaceholder('Введите ваш пароль').fill('wrong-password-1');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/неверн/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('the form signs in and opens the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('имя@компания').fill(login('admin'));
    await page.getByPlaceholder('Введите ваш пароль').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTitle('Мой профиль и пароль')).toBeVisible();
  });

  test('an employee with a password set by the manager has to replace it first', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('имя@компания').fill(login('newcomer'));
    await page.getByPlaceholder('Введите ваш пароль').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/change-password/);
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/change-password/);

    const fields = page.locator('input[type="password"]');
    await fields.nth(0).fill(PASSWORD);
    await fields.nth(1).fill('12121212');
    await fields.nth(2).fill('12121212');
    await page.getByRole('button', { name: 'Сохранить и продолжить' }).click();
    await expect(page.getByText(/слишком простой/)).toBeVisible();

    await fields.nth(1).fill('Isfara-Market-9');
    await fields.nth(2).fill('Isfara-Market-9');
    await page.getByRole('button', { name: 'Сохранить и продолжить' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

const SECTIONS: Array<[string, string]> = [
  ['/', 'Дашборд'],
  ['/agents', 'Сотрудники'],
  ['/map', 'Карта'],
  ['/route-planner', 'Планировщик'],
  ['/coverage', 'Покрытие'],
  ['/territory', 'Секторы'],
  ['/photo-reports', 'Фотоотчёты'],
  ['/clients', 'Клиенты'],
  ['/catalog', 'Каталог'],
  ['/warehouse', 'Склад'],
  ['/orders', 'Заказы'],
  ['/returns', 'Возвраты'],
  ['/payments', 'Оплаты'],
  ['/tasks', 'Задачи'],
  ['/salary', 'Зарплаты'],
  ['/promotions', 'Акции'],
  ['/branches', 'Филиалы'],
  ['/roles', 'Роли'],
  ['/settings', 'Настройки компании'],
  ['/reports', 'Отчёты'],
  ['/history', 'История Smartup'],
  ['/audit-logs', 'Журнал'],
  ['/smm', 'SMM'],
  ['/feedbacks', 'Обратная связь'],
];

test.describe('every section opens for the owner', () => {
  for (const [path, title] of SECTIONS) {
    test(`${title} (${path})`, async ({ page }) => {
      await signIn(page, 'admin');
      const problems = watch(page);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Доступ к разделу ограничен')).toHaveCount(0);
      await expect(page.getByText('Загрузка SmartSale...')).toHaveCount(0);
      // The layout and some content of the section are on screen
      await expect(page.getByTitle('Мой профиль и пароль')).toBeVisible();
      expect((await page.locator('main, #root').first().innerText()).trim().length).toBeGreaterThan(20);
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }
});

test.describe('company settings page', () => {
  test('the owner sees what is unsaved and is warned before weakening control', async ({ page }) => {
    await signIn(page, 'admin');
    await page.goto('/settings');
    const radius = page.locator('[data-setting="visit.radiusMeters"] input[type="number"]');
    await radius.fill('500');
    await radius.blur();
    await expect(page.getByText('не сохранено')).toBeVisible();
    await expect(page.getByText(/Изменено: 1/)).toBeVisible();
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page.getByRole('dialog')).toContainText('больше 300 м');
    await page.getByRole('button', { name: 'Отмена' }).click();
    await page.getByRole('button', { name: 'Отменить' }).click();
    await expect(page.getByText(/Изменено:/)).toHaveCount(0);
  });

  test('a financier changes money rules, field rules are locked for him', async ({ page }) => {
    await signIn(page, 'financier');
    await page.goto('/settings');
    await expect(page.locator('[data-setting="visit.radiusMeters"] input[type="number"]')).toBeDisabled();
    await expect(page.locator('[data-setting="visit.radiusMeters"]').getByText(/Меняет:/)).toBeVisible();
    const block = page.locator('[data-setting="credit.overLimit"]').getByRole('radio', { name: 'Запретить до оплаты' });
    await expect(block).toBeEnabled();
  });

  test('an agent cannot open the settings', async ({ page }) => {
    await signIn(page, 'agent1');
    await page.goto('/settings');
    await expect(page.getByText('Доступ к разделу ограничен')).toBeVisible();
  });
});

test.describe('an agent', () => {
  test('sees only the clients of his base', async ({ page }) => {
    await signIn(page, 'agent1');
    await page.goto('/clients');
    await expect(page.getByText('Магазин Бахор').first()).toBeVisible();
    await expect(page.getByText('Супермаркет Амид').first()).toBeVisible();
    await expect(page.getByText('Киоск Сомон')).toHaveCount(0);
  });

  test('cannot open the staff and role settings', async ({ page }) => {
    await signIn(page, 'agent1');
    for (const path of ['/agents', '/roles', '/audit-logs']) {
      await page.goto(path);
      await expect(page.getByText('Доступ к разделу ограничен'), path).toBeVisible();
    }
  });

  test('opens his profile from the header and sees his login', async ({ page }) => {
    await signIn(page, 'agent1');
    await page.goto('/');
    await page.getByTitle('Мой профиль и пароль').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(login('agent1'))).toBeVisible();
    await dialog.getByLabel('Закрыть').click();
    await expect(dialog).toHaveCount(0);
  });
});
