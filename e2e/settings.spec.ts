import { APIRequestContext, expect, request as playwrightRequest, test } from '@playwright/test';
import { Session, signIn } from './api';

/**
 * Company settings through the real API: who may change which group, that a change takes effect at
 * once in orders and check-ins, that two editors do not overwrite each other, and the journal.
 * Every test puts back what it changed, so the order of the files does not matter.
 */
test.describe.configure({ mode: 'serial' });

let owner: Session;
let manager: Session;
let financier: Session;
let agent: Session;
let shared: APIRequestContext;

const settings = async (s: Session) => (await s.get('/settings')).values;
const change = (s: Session, changes: Record<string, unknown>, expected?: Record<string, unknown>) =>
  s.call('patch', '/settings', { changes, ...(expected ? { expected } : {}) });

test.beforeAll(async () => {
  shared = await playwrightRequest.newContext();
  [owner, manager, financier, agent] = await Promise.all(['admin', 'manager', 'financier', 'agent1'].map((u) => signIn(shared, u)));
  await agent.call('post', '/users/shift', { onShift: true });
});

test.afterAll(async () => {
  await change(owner, {
    'visit.radiusMeters': 150, 'visit.allowRemoteWithReason': true, 'credit.overLimit': 'hold',
    'visit.autoPinCoordinates': false, 'visit.autoPinMinVisits': 2, 'visit.autoPinRadiusMeters': 100,
  });
  await shared?.dispose();
});

test('a new company works by the defaults', async () => {
  const s = await settings(owner);
  expect(s['visit.radiusMeters']).toBe(150);
  expect(s['credit.overLimit']).toBe('hold');
  expect(s['visit.requireShift']).toBe(true);
});

test('each group is changed only by its roles', async () => {
  // Sales manager: field rules yes, money no
  expect((await change(manager, { 'visit.radiusMeters': 200 })).status).toBe(200);
  expect((await change(manager, { 'credit.overLimit': 'block' })).status).toBe(403);
  // Financier: money yes, field rules no
  expect((await change(financier, { 'credit.overLimit': 'block' })).status).toBe(200);
  expect((await change(financier, { 'visit.radiusMeters': 300 })).status).toBe(403);
  // One forbidden key refuses the whole set, nothing is half-saved
  expect((await change(manager, { 'visit.radiusMeters': 250, 'payments.salesRepCanCollect': false })).status).toBe(403);
  expect((await settings(owner))['visit.radiusMeters']).toBe(200);
  // An agent does not see the settings, but his phone gets the rules it needs
  expect((await agent.call('get', '/settings')).status).toBe(403);
  const field = await agent.get('/settings/field');
  expect(field.visitRadiusMeters).toBe(200);
  expect(field.canCollectPayments).toBe(true);
  await change(owner, { 'visit.radiusMeters': 150, 'credit.overLimit': 'hold' });
});

test('coordinates from check-ins: off by default, tuned by field managers, issues for those who see the whole base', async () => {
  const s = await settings(owner);
  expect([s['visit.autoPinCoordinates'], s['visit.autoPinMinVisits'], s['visit.autoPinRadiusMeters']]).toEqual([false, 2, 100]);
  expect((await change(manager, { 'visit.autoPinCoordinates': true, 'visit.autoPinMinVisits': 3 })).status).toBe(200);
  expect((await change(financier, { 'visit.autoPinRadiusMeters': 80 })).status).toBe(403);
  for (const bad of [{ 'visit.autoPinMinVisits': 1 }, { 'visit.autoPinRadiusMeters': 500 }]) {
    expect((await change(owner, bad)).status, JSON.stringify(bad)).toBe(400);
  }
  const issues = await owner.get('/clients/location-issues');
  expect(issues).toMatchObject({ scattered: [] });
  expect(issues.withoutCoordinates).toBeGreaterThanOrEqual(0);
  expect((await agent.call('get', '/clients/location-issues')).status).toBe(403);
  await change(owner, { 'visit.autoPinCoordinates': false, 'visit.autoPinMinVisits': 2 });
});

test('wrong values are refused with a reason', async () => {
  for (const bad of [{ 'visit.radiusMeters': 5 }, { 'credit.overLimit': 'maybe' }, { 'visit.requireShift': 'yes' }, { unknown: 1 }]) {
    const r = await change(owner, bad);
    expect(r.status, JSON.stringify(bad)).toBe(400);
  }
});

test('a second editor does not overwrite a change he has not seen', async () => {
  expect((await change(owner, { 'visit.radiusMeters': 180 }, { 'visit.radiusMeters': 150 })).status).toBe(200);
  // The manager still had the page with 150 open
  const stale = await change(manager, { 'visit.radiusMeters': 220 }, { 'visit.radiusMeters': 150 });
  expect(stale.status).toBe(409);
  expect(stale.body.code).toBe('SETTINGS_CHANGED');
  expect((await settings(owner))['visit.radiusMeters']).toBe(180);
  await change(owner, { 'visit.radiusMeters': 150 });
});

test('the credit rule applies to the next order at once', async () => {
  const clients = await owner.get('/clients');
  const amid = clients.find((c: any) => c.name === 'Супермаркет Амид');
  const product = (await owner.get('/catalog/products')).find((p: any) => p.sku === 'E2E-002');
  await owner.call('put', `/clients/${amid.id}`, { creditLimit: 5 });
  const order = () => agent.call('post', '/orders', { clientId: amid.id, items: [{ productId: product.id, quantity: 2 }] });

  await change(financier, { 'credit.overLimit': 'block' });
  const blocked = await order();
  expect(blocked.status).toBe(400);
  expect(String(blocked.body.message)).toMatch(/кредитный лимит/);

  await change(financier, { 'credit.overLimit': 'hold' });
  expect((await order()).body.status).toBe('on_hold');

  await change(financier, { 'credit.overLimit': 'allow' });
  expect((await order()).body.status).toBe('pending');

  await change(financier, { 'credit.overLimit': 'hold' });
  await owner.call('put', `/clients/${amid.id}`, { creditLimit: 0 });
});

test('the radius and the reason rule decide a check-in from afar', async () => {
  const clients = await owner.get('/clients');
  const bahor = clients.find((c: any) => c.name === 'Магазин Бахор'); // 40.1139, 70.6041
  const route = async () =>
    (await owner.call('post', '/routes/assign', { salesRepId: agent.user.id, clientId: bahor.id, plannedDate: new Date().toISOString().slice(0, 10) })).body.id;
  const about300m = { latitude: 40.1166, longitude: 70.6041 };

  expect((await agent.call('post', `/routes/${await route()}/checkin`, about300m)).status).toBe(400);
  await change(manager, { 'visit.radiusMeters': 400 });
  expect((await agent.call('post', `/routes/${await route()}/checkin`, about300m)).status).toBeLessThan(300);
  await change(manager, { 'visit.radiusMeters': 150 });

  // With a reason: let through while allowed, refused once the company turns it off
  expect((await agent.call('post', `/routes/${await route()}/checkin`, { ...about300m, notes: 'GPS не ловит' })).status).toBeLessThan(300);
  await change(manager, { 'visit.allowRemoteWithReason': false });
  expect((await agent.call('post', `/routes/${await route()}/checkin`, { ...about300m, notes: 'GPS не ловит' })).status).toBe(400);
  await change(manager, { 'visit.allowRemoteWithReason': true });
});

test('an agent adds clients only when the company allows it', async () => {
  const add = () => agent.call('post', '/clients/create-map', { name: 'Новая точка e2e', address: 'Исфара', phone: '+992900000001' });
  expect((await add()).status).toBe(403);
  await change(manager, { 'clients.salesRepCanCreate': true });
  expect((await add()).status).toBeLessThan(300);
  await change(manager, { 'clients.salesRepCanCreate': false });
});

test('every change is in the journal with who and what', async () => {
  const history = await owner.get('/settings/history?limit=100');
  const radius = history.find((h: any) => h.key === 'visit.radiusMeters' && h.to === 400);
  expect(radius?.by).toBe('Менеджер Продаж');
  expect(radius?.from).toBe(150);
  expect(history.some((h: any) => h.key === 'credit.overLimit' && h.by === 'Финансист Тестовый')).toBe(true);
});
