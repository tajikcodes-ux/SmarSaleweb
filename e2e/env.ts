/** Where the browser tests run: a local or CI stack with the e2e company from smartsale_backend/src/scripts/seed-e2e.ts. */
export const WEB_URL = process.env.E2E_WEB_URL || 'http://localhost:3000';
export const API_URL = process.env.E2E_API_URL || 'http://localhost:4000/api/v1';
/** Test-only password of every e2e account; the seed and the tests read the same variable. */
export const PASSWORD = process.env.E2E_PASSWORD || 'E2e-Local-Pass-2026';
export const COMPANY = 'e2e';
export const login = (user: string) => `${user}@${COMPANY}`;
