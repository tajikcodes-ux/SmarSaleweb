import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { History, Info } from 'lucide-react';

interface MonthRow {
  month: string;
  branch: string;
  orders: number;
  returns: number;
  payments: number;
  transfersOut: number;
  orderCount: number;
  activeClients: number;
}
interface TransferRow { month: string; from: string; to: string; amount: number; documents: number }
interface AgentRow { agentName: string; branch: string; orders: number; returns: number; orderCount: number; activeClients: number }
interface Summary {
  month: string | null;
  availableMonths: string[];
  months: MonthRow[];
  agents: AgentRow[];
  sources: Array<{ source: string; label: string }>;
  transfers: TransferRow[];
}

const money = (v: number) => (v ? v.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '—');
const MONTH_NAMES = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const monthLabel = (m: string) => `${MONTH_NAMES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

/** Sales history from the company's previous system: an archive to compare with, it does not affect debts */
export default function LegacyHistory() {
  const [data, setData] = useState<Summary | null>(null);
  const [month, setMonth] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/legacy-history/summary', { params: month ? { month } : {} })
      .then((res) => { setData(res.data); setError(''); })
      .catch((err) => setError(err.response?.data?.message || 'Не удалось загрузить историю'))
      .finally(() => setLoading(false));
  }, [month]);

  const months = useMemo(() => {
    const grouped = new Map<string, MonthRow[]>();
    for (const r of data?.months ?? []) grouped.set(r.month, [...(grouped.get(r.month) ?? []), r]);
    return [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  const systemName = (data?.sources ?? []).map((s) => s.label).join(' и ');
  const hasTransfers = (data?.transfers ?? []).length > 0;
  // Share of returns in sales: the signal to look at first
  const returnShare = (r: { orders: number; returns: number }) => (r.orders > 0 ? (r.returns / r.orders) * 100 : null);
  const shareClass = (v: number | null) => (v === null ? '' : v >= 8 ? 'text-rose-600 font-bold' : v >= 5 ? 'text-amber-600' : '');

  const branchesWithoutOrders = useMemo(() => {
    const all = new Set((data?.months ?? []).map((r) => r.branch));
    const withOrders = new Set((data?.months ?? []).filter((r) => r.orders > 0).map((r) => r.branch));
    return [...all].filter((b) => !withOrders.has(b)).sort();
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e3e3e8] p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2">
            <History className="w-5 h-5 text-[#0b57d0]" /> Архив продаж{systemName ? ` из ${systemName}` : ''}
          </h2>
          <p className="text-xs text-[#86868b] mt-1">Заказы, возвраты и оплаты до перехода на SmartSale</p>
        </div>
        {data && data.availableMonths.length > 0 && (
          <select
            value={data.month ?? ''}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl px-3 py-2 text-xs font-semibold text-[#1d1d1f]"
          >
            {[...data.availableMonths].reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        )}
      </div>

      <div className="flex items-start gap-2 p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Это архив для сравнения. Он не меняет долги клиентов, остатки и зарплату.
          {branchesWithoutOrders.length > 0 && ` Заказов в архиве нет по филиалам: ${branchesWithoutOrders.join(', ')}.`}
          {' '}Оплаты — только те, что проводились в прошлой системе.
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#86868b]">Загрузка истории…</div>
      ) : error ? (
        <div className="p-12 text-center text-xs text-rose-600">{error}</div>
      ) : !data || data.months.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#86868b]">История из прошлой системы не загружена.</div>
      ) : (
        <>
          <div className="bg-white border border-[#e3e3e8] rounded-2xl shadow-sm overflow-x-auto">
            <h3 className="text-sm font-bold text-[#1d1d1f] px-5 pt-4">По месяцам и филиалам, TJS</h3>
            <table className="w-full text-left text-xs mt-3">
              <thead className="bg-[#f8f9fa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                <tr>
                  <th className="p-3">Месяц</th><th className="p-3">Филиал</th>
                  <th className="p-3 text-right">Продажи</th><th className="p-3 text-right">Возвраты</th>
                  <th className="p-3 text-right">% возвр.</th><th className="p-3 text-right">Оплаты</th>
                  {hasTransfers && <th className="p-3 text-right">Переброски</th>}
                  <th className="p-3 text-right">Заказов</th><th className="p-3 text-right">АКБ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e3e8]/60">
                {months.map(([m, rows]) => rows.map((r, i) => (
                  <tr key={`${m}-${r.branch}`} className={m === data.month ? 'bg-blue-50/40' : ''}>
                    <td className="p-3 font-semibold text-[#1d1d1f]">{i === 0 ? monthLabel(m) : ''}</td>
                    <td className="p-3">{r.branch}</td>
                    <td className="p-3 text-right font-mono">{money(r.orders)}</td>
                    <td className="p-3 text-right font-mono text-rose-600">{money(r.returns)}</td>
                    <td className={`p-3 text-right font-mono ${shareClass(returnShare(r))}`}>
                      {returnShare(r) === null ? '—' : `${returnShare(r)!.toFixed(1)}%`}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-700">{money(r.payments)}</td>
                    {hasTransfers && <td className="p-3 text-right font-mono text-[#86868b]">{money(r.transfersOut)}</td>}
                    <td className="p-3 text-right font-mono">{r.orderCount || '—'}</td>
                    <td className="p-3 text-right font-mono">{r.activeClients && r.orders ? r.activeClients : '—'}</td>
                  </tr>
                )))}
              </tbody>
            </table>
            <p className="px-5 py-3 text-[11px] text-[#86868b]">
              Продажи — без перебросок товара между своими филиалами{hasTransfers ? ': они в колонке «Переброски» и в таблице ниже' : ''}.
            </p>
          </div>

          {hasTransfers && (
            <div className="bg-white border border-[#e3e3e8] rounded-2xl shadow-sm overflow-x-auto">
              <h3 className="text-sm font-bold text-[#1d1d1f] px-5 pt-4">Переброски между филиалами, TJS</h3>
              <p className="px-5 pt-1 text-[11px] text-[#86868b]">
                Товар, отправленный своим филиалам. В прошлой системе он оформлялся как заказ, здесь он не считается продажей.
              </p>
              <table className="w-full text-left text-xs mt-3">
                <thead className="bg-[#f8f9fa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Месяц</th><th className="p-3">Откуда</th><th className="p-3">Куда</th>
                    <th className="p-3 text-right">Сумма</th><th className="p-3 text-right">Документов</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e3e8]/60">
                  {data.transfers.map((t, i) => (
                    <tr key={`${t.month}-${t.from}-${t.to}`}>
                      <td className="p-3 font-semibold text-[#1d1d1f]">
                        {i === 0 || data.transfers[i - 1].month !== t.month ? monthLabel(t.month) : ''}
                      </td>
                      <td className="p-3">{t.from}</td>
                      <td className="p-3">→ {t.to}</td>
                      <td className="p-3 text-right font-mono">{money(t.amount)}</td>
                      <td className="p-3 text-right font-mono">{t.documents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white border border-[#e3e3e8] rounded-2xl shadow-sm overflow-x-auto">
            <h3 className="text-sm font-bold text-[#1d1d1f] px-5 pt-4">Агенты за {data.month ? monthLabel(data.month) : '—'}</h3>
            {data.agents.length === 0 ? (
              <p className="p-5 text-xs text-[#86868b]">За этот месяц нет заказов и возвратов.</p>
            ) : (
              <table className="w-full text-left text-xs mt-3">
                <thead className="bg-[#f8f9fa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Агент</th><th className="p-3">Филиал</th>
                    <th className="p-3 text-right">Продажи, TJS</th><th className="p-3 text-right">Возвраты, TJS</th>
                    <th className="p-3 text-right">Заказов</th><th className="p-3 text-right">АКБ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e3e8]/60">
                  {data.agents.map((a) => (
                    <tr key={`${a.agentName}-${a.branch}`}>
                      <td className="p-3 font-semibold text-[#1d1d1f]">{a.agentName}</td>
                      <td className="p-3">{a.branch}</td>
                      <td className="p-3 text-right font-mono">{money(a.orders)}</td>
                      <td className="p-3 text-right font-mono text-rose-600">{money(a.returns)}</td>
                      <td className="p-3 text-right font-mono">{a.orderCount || '—'}</td>
                      <td className="p-3 text-right font-mono">{a.activeClients && a.orders ? a.activeClients : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
