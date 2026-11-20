import { APIRequestContext, expect } from '@playwright/test';
import { API_URL, PASSWORD, login } from './env';

export interface Session {
  token: string;
  user: any;
  get: (path: string) => Promise<any>;
  call: (method: 'post' | 'put' | 'patch' | 'delete' | 'get', path: string, data?: unknown) => Promise<{ status: number; body: any }>;
}

export async function signIn(request: APIRequestContext, user: string, password = PASSWORD): Promise<Session> {
  const res = await request.post(`${API_URL}/auth/login`, { data: { username: login(user), password } });
  expect(res.status(), `login ${user}`).toBeLessThan(300);
  const { access_token: token, user: profile } = await res.json();
  const headers = { Authorization: `Bearer ${token}` };
  const call: Session['call'] = async (method, path, data) => {
    const r = await request[method](`${API_URL}${path}`, { headers, data });
    const text = await r.text();
    let body: any = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* not JSON */
    }
    return { status: r.status(), body };
  };
  const get = async (path: string) => {
    const r = await call('get', path);
    expect(r.status, `GET ${path}: ${JSON.stringify(r.body).slice(0, 200)}`).toBe(200);
    return r.body;
  };
  return { token, user: profile, get, call };
}

export const money = (value: unknown) => Math.round(Number(value) * 100) / 100;
