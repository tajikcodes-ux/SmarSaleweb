import { useEffect, useState } from 'react';
import api from '../services/api';

/** Whether the company loads Smartup backups and how fresh the loaded data is (GET /integrations/smartup/status) */
export interface SmartupStatus {
  enabled: boolean;
  connected: boolean;
  dataDate?: string;
  appliedBy?: string | null;
}

const NONE: SmartupStatus = { enabled: false, connected: false };
let cached: { token: string | null; request: Promise<SmartupStatus> } | null = null;

function load(): Promise<SmartupStatus> {
  const token = localStorage.getItem('access_token');
  if (!token) return Promise.resolve(NONE);
  try {
    // The platform admin outside a company has nothing to load
    if (JSON.parse(localStorage.getItem('user') || 'null')?.role === 'SUPER_ADMIN') return Promise.resolve(NONE);
  } catch {
    /* an unreadable profile: ask the server */
  }
  if (cached?.token === token) return cached.request;
  const request = api.get('/integrations/smartup/status').then((res) => ({ ...NONE, ...res.data })).catch(() => NONE);
  cached = { token, request };
  return request;
}

/** Forget the answer, e.g. after a load or a settings change */
export function refreshSmartupStatus() {
  cached = null;
}

export function useSmartupStatus(): SmartupStatus {
  const [state, setState] = useState<SmartupStatus>(NONE);
  useEffect(() => {
    let alive = true;
    load().then((value) => alive && setState(value));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
