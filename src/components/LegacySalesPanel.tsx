import { useEffect, useState } from 'react';
import api from '../services/api';
import { useLegacyHistory } from '../utils/legacyHistory';
import { History, TrendingDown, TrendingUp } from 'lucide-react';

interface Period { sales: number; orders: number; averageCheck: number; returns: number; payments: number; activeClients: number }
interface Data {
  available: boolean;
  source?: string;
  branch?: string | null;
  lastDay?: string;
  day?: Period;
  month?: Period & { from: string; to: string };
  previousMonth?: Period & { from: string; to: string };
  topAgents?: Array<{ name: string; sales: number; activeClients: number }>;
}

const money = (v: number) => `${Math.round(v).toLocaleString('ru-RU')} TJS`;
const ru = (iso?: string) => (iso ? iso.split('-').reverse().slice(0, 2).join('.') : '');

function Change({ now, before, lowerIsBetter = false }: { now: number; before: number; lowerIsBetter?: boolean }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  const good = lowerIsBetter ? !up : up;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${good ? 'text-emerald-700' : 'text-rose-600'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{pct}%
    </span>
  );
}

/**
 * Sales from the company's previous system while it still sells there: SmartSale's own figures stay at zero until
 * the agents order in SmartSale, so the managers see the real business here, marked with the system it comes from.
 */
export default function LegacySalesPanel({ branchId }: { branchId: string | null }) {
  const legacy = useLegacyHistory();
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    if (!legacy.available || !legacy.canViewSummary) return;
    api.get('/legacy-history/dashboard', { params: branchId ? { branchId } : {} })
      .then((res) => setData(res.data))
      .catch(() => setData(null));
  }, [legacy.available, legacy.canViewSummary, branchId]);

  if (!data?.available || !data.month || !data.previousMonth || !data.day) return null;
  const m = data.month;
  const p = data.previousMonth;
  const cards: Array<[string, string, number, number]> = [
    [`Продажи ${ru(m.from)}–${ru(m.to)}`, money(m.sales), m.sales, p.sales],
    ['Заказов', m.orders.toLocaleString('ru-RU'), m.orders, p.orders],
    ['Средний чек', money(m.averageCheck), m.averageCheck, p.averageCheck],
    ['АКБ (клиентов с заказом)', m.activeClients.toLocaleString('ru-RU'), m.activeClients, p.activeClients],
    ['Возвраты', `${money(m.returns)} · ${m.sales ? ((m.returns / m.sales) * 100).toFixed(1) : '0'}%`, m.returns, p.returns],
    ['Оплаты', money(m.payments), m.payments, p.payments],
  ];

  return (
    <div className="bg-white border border-[#e3e3e8] p-5 rounded-2xl shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
          <History className="w-4 h-4 text-[#0b57d0]" /> Продажи по {data.source}{data.branch ? ` · ${data.branch}` : ''}
        </h3>
        <span className="text-[11px] text-[#86868b]">
          Сравнение с теми же днями прошлого месяца ({ru(p.from)}–{ru(p.to)}). Переброски между филиалами не считаются.
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {cards.map(([label, value, now, before]) => (
          <div key={label} className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e3e3e8]">
            <div className="text-[10px] font-bold text-[#86868b] uppercase tracking-wide">{label}</div>
            <div className="text-sm font-bold text-[#1d1d1f] mt-1">{value}</div>
            <Change now={now} before={before} lowerIsBetter={label === 'Возвраты'} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div>
          <div className="font-bold text-[#1d1d1f] mb-1.5">Последний день в выгрузке: {ru(data.lastDay)}</div>
          <div className="text-[#37352f]">
            {money(data.day.sales)} · заказов {data.day.orders} · клиентов {data.day.activeClients} · оплаты {money(data.day.payments)}
          </div>
          <div className="text-[10px] text-[#86868b] mt-0.5">День может быть неполным: выгрузка сделана в течение дня.</div>
        </div>
        <div>
          <div className="font-bold text-[#1d1d1f] mb-1.5">Лучшие агенты месяца</div>
          <ol className="space-y-0.5">
            {(data.topAgents ?? []).map((a, i) => (
              <li key={a.name} className="flex justify-between gap-3 text-[#37352f]">
                <span className="truncate">{i + 1}. {a.name}</span>
                <span className="font-mono whitespace-nowrap">{money(a.sales)} · АКБ {a.activeClients}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
