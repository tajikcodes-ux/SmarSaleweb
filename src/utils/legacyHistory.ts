import { useEffect, useState } from 'react';
import api from '../services/api';

/** The company's archive from its previous system (GET /legacy-history/availability) */
export interface LegacyAvailability {
  available: boolean;
  canViewSummary: boolean;
  sources: Array<{ source: string; label: string; documents: number; from: string; to: string }>;
  /** "Smartup", "Smartup и 1С"; empty without an archive */
  label: string;
}

const NONE: LegacyAvailability = { available: false, canViewSummary: false, sources: [], label: '' };

// One request per signed-in session (token): the menu, the client list and the page share it
let cached: { token: string | null; request: Promise<LegacyAvailability> } | null = null;

function load(): Promise<LegacyAvailability> {
  const token = localStorage.getItem('access_token');
  if (!token) return Promise.resolve(NONE);
  try {
    // The platform admin outside a company has no archive to ask about
    if (JSON.parse(localStorage.getItem('user') || 'null')?.role === 'SUPER_ADMIN') return Promise.resolve(NONE);
  } catch {
    /* an unreadable profile: ask the server */
  }
  if (cached?.token === token) return cached.request;
  const request = api
    .get('/legacy-history/availability')
    .then((res) => ({
      ...NONE,
      ...res.data,
      label: (res.data?.sources ?? []).map((s: any) => s.label).join(' и '),
    }))
    // No permission or an older server: the archive is simply not shown
    .catch(() => NONE);
  cached = { token, request };
  return request;
}

/** Whether to show the archive at all, from the server: the permissions saved at sign-in can be out of date */
export function useLegacyHistory(): LegacyAvailability {
  const [state, setState] = useState<LegacyAvailability>(NONE);
  useEffect(() => {
    let alive = true;
    load().then((value) => alive && setState(value));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
