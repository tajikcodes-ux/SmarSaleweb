import { execSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { API_URL, PASSWORD } from './env';

/** Recreates the e2e company before every run, so each run starts from the same data. */
export default async function globalSetup() {
  const command = process.env.E2E_SEED_COMMAND || 'npx ts-node --transpile-only src/scripts/seed-e2e.ts';
  const cwd = process.env.E2E_BACKEND_DIR || resolve(dirname(fileURLToPath(import.meta.url)), '../../smartsale_backend');
  execSync(command, { cwd, stdio: 'inherit', env: { ...process.env, E2E_PASSWORD: PASSWORD } });
  const health = await fetch(`${API_URL}/health`).catch(() => null);
  if (!health?.ok) throw new Error(`Backend is not reachable at ${API_URL}`);
}
