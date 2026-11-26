import { APIRequestContext, expect, request as playwrightRequest, test } from '@playwright/test';
import { money, Session, signIn } from './api';
import { API_URL } from './env';

/**
 * Money and goods through the real API and a real database: what an agent, a manager and a
 * financier do in a day, and the numbers the client card and the warehouse must show after it.
 * Runs in order on the e2e company that global-setup recreates.
 */
test.describe.configure({ mode: 'serial' });

let admin: Session;
let agent1: Session;
let agent2: Session;
let financier: Session;
const product: Record<string, any> = {};
const client: Record<string, any> = {};
let warehouseId = '';
let shared: APIRequestContext;

const stockOf = async (sku: string) => {
  const rows = await admin.get(`/stocks/warehouse/${warehouseId}`);
  const list = Array.isArray(rows) ? rows : rows.stocks ?? rows.data ?? [];
  return list
    .filter((s: any) => (s.product?.sku ?? s.sku) === sku)
    .reduce((sum: number, s: any) => sum + Number(s.quantity), 0);
};
const debtOf = async (name: string) => money((await admin.get(`/clients/${client[name].id}`)).currentDebt);
const order = (session: Session, clientName: string, lines: Array<[string, number]>, clientRequestId?: string) =>
  session.call('post', '/orders', {
    clientId: client[clientName].id,
    items: lines.map(([sku, quantity]) => ({ productId: product[sku].id, quantity })),
    ...(clientRequestId ? { clientRequestId } : {}),
  });

test.beforeAll(async () => {
  // Sessions shared by the whole file need a context of their own, not the per-test fixture
  shared = await playwrightRequest.newContext();
  [admin, agent1, agent2, financier] = await Promise.all(['admin', 'agent1', 'agent2', 'financier'].map((u) => signIn(shared, u)));
  for (const p of await admin.get('/catalog/products')) product[p.sku] = p;
  for (const c of await admin.get('/clients')) client[c.name] = c;
  const warehouses = await admin.get('/stocks/warehouses');
  warehouseId = warehouses[0].id;
});

test.afterAll(async () => {
  await shared?.dispose();
});

test.describe('agent base', () => {
  test('an agent sees only the clients of his base, a manager sees all', async () => {
    const names = async (s: Session) => (await s.get('/clients')).map((c: any) => c.name).sort();
    expect(await names(agent1)).toEqual(['Магазин Бахор', 'Магазин Нур', 'Супермаркет Амид']);
    expect(await names(agent2)).toEqual(['Киоск Сомон', 'Супермаркет Амид']);
    expect((await admin.get('/clients')).length).toBe(4);
  });

  test('only a manager distributes clients between agents', async () => {
    const id = client['Магазин Нур'].id;
    expect((await agent1.call('put', `/clients/${id}/agents`, [])).status).toBe(403);
    const links = await admin.get(`/clients/${id}/agents`);
    expect(links.map((l: any) => l.userId)).toEqual([agent1.user.id]);
  });

  test('the month coverage counts every agent-client pair of the base', async () => {
    const month = new Date().toISOString().slice(0, 7);
    const coverage = await admin.get(`/route-plans/coverage?month=${month}`);
    expect(coverage.totals.okb).toBe(5);
  });
});

test.describe('history from the previous system', () => {
  test('a company without an archive is told so, and the section stays hidden', async () => {
    expect(await admin.get('/legacy-history/availability')).toMatchObject({ available: false, sources: [], canViewSummary: true });
    expect(await agent1.get('/legacy-history/availability')).toMatchObject({ available: false, canViewSummary: false });
  });

  test('company history is for managers; an agent opens only the clients of his base', async () => {
    expect((await admin.call('get', '/legacy-history/summary')).status).toBe(200);
    expect((await agent1.call('get', '/legacy-history/summary')).status).toBe(403);
    expect((await agent1.call('get', '/legacy-history/dashboard')).status).toBe(403);
    expect(await admin.get('/legacy-history/dashboard')).toEqual({ available: false });
    expect((await agent1.call('get', `/legacy-history/client/${client['Магазин Нур'].id}`)).status).toBe(200);
    expect((await agent1.call('get', `/legacy-history/client/${client['Киоск Сомон'].id}`)).status).toBe(404);
  });
});

test.describe('loading a Smartup backup', () => {
  test('only those who manage money load data, and a file that is not an archive is refused', async () => {
    expect(await admin.get('/integrations/smartup/runs')).toEqual([]);
    expect(await agent1.get('/integrations/smartup/status')).toEqual({ connected: false });
    expect((await agent1.call('get', '/integrations/smartup/runs')).status).toBe(403);
    const upload = (s: Session, name: string) =>
      shared.post(`${API_URL}/integrations/smartup/runs`, {
        headers: { Authorization: `Bearer ${s.token}` },
        multipart: { file: { name, mimeType: 'application/zip', buffer: Buffer.from('not a zip') } },
      });
    expect((await upload(agent1, 'backup.zip')).status()).toBe(403);
    expect((await upload(admin, 'backup.txt')).status()).toBe(400);
  });
});

test.describe('orders, stock and debt', () => {
  test('an agent off shift cannot take an order', async () => {
    const r = await order(agent1, 'Магазин Бахор', [['E2E-001', 1]]);
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(await debtOf('Магазин Бахор')).toBe(0);
    for (const s of [agent1, agent2]) expect((await s.call('post', '/users/shift', { onShift: true })).status).toBeLessThan(300);
  });

  test('an order takes goods off the shelf and puts the debt on the client, once', async () => {
    const before = await stockOf('E2E-001');
    const first = await order(agent1, 'Магазин Бахор', [['E2E-001', 10], ['E2E-002', 2]], 'e2e-order-0001');
    expect(first.status, JSON.stringify(first.body)).toBeLessThan(300);
    expect(money(first.body.totalAmount)).toBe(139); // 10 × 12 + 2 × 9.5, prices from the server
    // The phone resends after a lost connection: same order, no second charge
    const again = await order(agent1, 'Магазин Бахор', [['E2E-001', 10], ['E2E-002', 2]], 'e2e-order-0001');
    expect(again.body.id).toBe(first.body.id);
    expect(await stockOf('E2E-001')).toBe(before - 10);
    expect(await debtOf('Магазин Бахор')).toBe(139);
  });

  test('an order for more than the stock is refused and changes nothing', async () => {
    const r = await order(agent1, 'Магазин Нур', [['E2E-003', 6]]);
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(await stockOf('E2E-003')).toBe(5);
    expect(await debtOf('Магазин Нур')).toBe(0);
  });

  test('the server prices the order, whatever the phone sends', async () => {
    const r = await agent1.call('post', '/orders', {
      clientId: client['Магазин Нур'].id,
      totalAmount: 1,
      items: [{ productId: product['E2E-002'].id, quantity: 4, price: 0.01, totalPrice: 0.04 }],
    });
    expect(money(r.body.totalAmount)).toBe(38);
    expect(await debtOf('Магазин Нур')).toBe(38);
  });

  test('cancelling an order returns the goods and removes the debt', async () => {
    const r = await order(agent2, 'Киоск Сомон', [['E2E-001', 5]]);
    const stock = await stockOf('E2E-001');
    expect(await debtOf('Киоск Сомон')).toBe(60);
    expect((await admin.call('patch', `/orders/${r.body.id}/status`, { status: 'cancelled' })).status).toBeLessThan(300);
    expect(await stockOf('E2E-001')).toBe(stock + 5);
    expect(await debtOf('Киоск Сомон')).toBe(0);
  });

  test('over the credit limit an order waits for a supervisor; a rejection undoes it', async () => {
    const id = client['Супермаркет Амид'].id;
    expect((await admin.call('put', `/clients/${id}`, { creditLimit: 50 })).status).toBeLessThan(300);
    const stock = await stockOf('E2E-001');
    const r = await order(agent2, 'Супермаркет Амид', [['E2E-001', 10]]);
    expect(r.body.status).toBe('on_hold');
    expect((await admin.call('post', `/orders/${r.body.id}/reject-hold`, {})).status).toBeLessThan(300);
    expect(await stockOf('E2E-001')).toBe(stock);
    expect(await debtOf('Супермаркет Амид')).toBe(0);
  });
});

test.describe('payments and returns', () => {
  test('a payment lowers the debt; a rejected payment brings it back', async () => {
    const paid = await agent1.call('post', '/payments', { clientId: client['Магазин Бахор'].id, amount: 100, paymentMethod: 'CASH', clientRequestId: 'e2e-pay-0001' });
    expect(paid.status, JSON.stringify(paid.body)).toBeLessThan(300);
    // Resent after a lost connection: still one payment
    await agent1.call('post', '/payments', { clientId: client['Магазин Бахор'].id, amount: 100, paymentMethod: 'CASH', clientRequestId: 'e2e-pay-0001' });
    expect(await debtOf('Магазин Бахор')).toBe(39);
    expect((await financier.call('patch', `/payments/${paid.body.id}/reconcile`, { action: 'reject' })).status).toBeLessThan(300);
    expect(await debtOf('Магазин Бахор')).toBe(139);
  });

  test('a delivered order cannot be cancelled; goods come back through an approved return', async () => {
    const r = await order(agent1, 'Магазин Нур', [['E2E-001', 3]]);
    expect((await admin.call('patch', `/orders/${r.body.id}/status`, { status: 'delivered' })).status).toBeLessThan(300);
    expect((await admin.call('patch', `/orders/${r.body.id}/status`, { status: 'cancelled' })).status).toBeGreaterThanOrEqual(400);
    const debt = await debtOf('Магазин Нур');
    const stock = await stockOf('E2E-001');
    const ret = await agent1.call('post', '/returns', {
      clientId: client['Магазин Нур'].id,
      warehouseId,
      reason: 'e2e',
      items: [{ productId: product['E2E-001'].id, quantity: 2, price: 12 }],
    });
    expect(ret.status, JSON.stringify(ret.body)).toBeLessThan(300);
    // Nothing moves until the return is approved
    expect(await debtOf('Магазин Нур')).toBe(debt);
    expect((await admin.call('patch', `/returns/${ret.body.id}/status`, { status: 'approved' })).status).toBeLessThan(300);
    expect(await debtOf('Магазин Нур')).toBe(money(debt - 24));
    expect(await stockOf('E2E-001')).toBe(stock + 2);
  });

  test('the debt on the card equals the client ledger', async () => {
    const aging = await admin.get('/clients/debt-aging');
    const total = (await admin.get('/clients')).reduce((sum: number, c: any) => sum + Number(c.currentDebt), 0);
    expect(money(aging.totalDebt)).toBe(money(total));
  });
});

test.describe('passwords', () => {
  test('a password set by someone else blocks work until it is replaced', async ({ request }) => {
    const newcomer = await signIn(request, 'newcomer');
    expect(newcomer.user.mustChangePassword).toBe(true);
    const blocked = await newcomer.call('get', '/orders');
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect((await newcomer.call('get', '/users/me')).status).toBe(200);
  });

  test('simple and shared passwords are refused', async ({ request }) => {
    const newcomer = await signIn(request, 'newcomer');
    const current = process.env.E2E_PASSWORD || 'E2e-Local-Pass-2026';
    for (const weak of ['12121212', '12345678', 'newcomer2026', current]) {
      expect((await newcomer.call('post', '/users/change-password', { currentPass: current, newPass: weak })).status).toBe(400);
    }
    expect((await newcomer.call('post', '/users/change-password', { currentPass: 'wrong-password', newPass: 'Isfara-Ashtt-77' })).status).toBe(409);
  });

  test('a manager resetting a password makes the employee change it again', async ({ request }) => {
    const agent = await admin.get('/users');
    const target = agent.find((u: any) => u.username === 'agent2');
    expect((await admin.call('put', `/users/${target.id}`, { password: 'Reset-By-Admin-1' })).status).toBeLessThan(300);
    const relogged = await signIn(request, 'agent2', 'Reset-By-Admin-1');
    expect(relogged.user.mustChangePassword).toBe(true);
    expect((await relogged.call('post', '/users/change-password', { currentPass: 'Reset-By-Admin-1', newPass: 'Isfara-Own-Pass-7' })).status).toBeLessThan(300);
    expect((await relogged.call('get', '/orders')).status).toBe(200);
  });
});
