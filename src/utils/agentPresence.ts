// Whether an agent is online, from the last GPS point the phone sent (GET /gps/live)

export const ONLINE_MINUTES = 10;

export const minutesSince = (recordedAt?: string | null): number | null =>
  recordedAt ? Math.max(0, Math.floor((Date.now() - new Date(recordedAt).getTime()) / 60000)) : null;

export const isOnline = (agent: { recordedAt?: string | null; onShift?: boolean | null }): boolean => {
  if (agent.onShift === false) return false;
  const mins = minutesSince(agent.recordedAt);
  return mins !== null && mins < ONLINE_MINUTES;
};

// "5 мин назад", "3 ч назад", "2 дн назад", or null without a point
export const lastSeenText = (recordedAt?: string | null): string | null => {
  const mins = minutesSince(recordedAt);
  if (mins === null) return null;
  if (mins === 0) return 'сейчас';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  return hours < 24 ? `${hours} ч назад` : `${Math.floor(hours / 24)} дн назад`;
};

// Battery from the last point; null when the phone did not send it
export const batteryText = (level: unknown): string | null =>
  level === null || level === undefined || level === '' ? null : `${Math.round(Number(level))}%`;
