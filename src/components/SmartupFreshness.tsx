import { useEffect, useState } from 'react';
import api from '../services/api';
import { Database } from 'lucide-react';

interface Status { connected: boolean; dataDate?: string; appliedBy?: string | null }

const DAY_MS = 24 * 60 * 60 * 1000;

/** How fresh the data loaded from Smartup is; yellow once it is older than a day. Nothing for a company without it */
export default function SmartupFreshness() {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    api.get('/integrations/smartup/status').then((res) => setStatus(res.data)).catch(() => setStatus(null));
  }, []);
  if (!status?.connected || !status.dataDate) return null;
  const old = Date.now() - new Date(status.dataDate).getTime() > DAY_MS;
  const date = new Date(status.dataDate).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${old ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-[#f8f9fa] border-[#e3e3e8] text-[#6a6a65]'}`}>
      <Database className="w-3.5 h-3.5 shrink-0" />
      <span>
        Долги, остатки и клиенты — по Smartup на <strong>{date}</strong>
        {status.appliedBy ? ` (загрузил ${status.appliedBy})` : ''}
        {old ? '. Данные старше суток: загрузите свежую выгрузку.' : ''}
      </span>
    </div>
  );
}
