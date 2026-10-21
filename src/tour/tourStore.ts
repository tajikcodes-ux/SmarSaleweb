// Tiny external store so the tour survives route changes (Layout is mounted per route).
type TourState = { active: boolean; index: number };

const KEY = 'smartsale_tour_state';

function load(): TourState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.active === 'boolean' && typeof p.index === 'number') return p;
    }
  } catch {
    /* ignore */
  }
  return { active: false, index: 0 };
}

let state: TourState = load();
const listeners = new Set<() => void>();

function commit(next: TourState) {
  state = next;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const tourStore = {
  getSnapshot: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  start: () => commit({ active: true, index: 0 }),
  stop: () => commit({ active: false, index: 0 }),
  setIndex: (index: number) => commit({ active: true, index }),
};

export function tourSeenKey(user: { id?: string; username?: string }) {
  return `smartsale_tour_seen_${user.id || user.username || 'u'}`;
}
