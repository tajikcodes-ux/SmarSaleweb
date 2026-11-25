import { useEffect, useState } from 'react';
import api from '../services/api';
import { History, X } from 'lucide-react';

interface Props { clientId: string; clientName: string; onClose: () => void }

const KIND_LABELS: Record<string, string> = { order: 'Заказ', return: 'Возврат', payment: 'Оплата' };
const money = (v: number) => v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A client's history in the previous system (Smartup), read only */
export default function LegacyClientHistory({ clientId, clientName, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/legacy-history/client/${clientId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Не удалось загрузить историю'));
  }, [clientId]);

  return (
    <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#e3e3e8]">
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
              <History className="w-4 h-4 text-[#0b57d0]" /> История в Smartup: {clientName}
            </h3>
            <p className="text-[11px] text-[#86868b] mt-0.5">Архив до перехода на SmartSale. Долг клиента он не меняет.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#86868b]" aria-label="Закрыть">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {error ? (
            <p className="text-xs text-rose-600 text-center py-10">{error}</p>
          ) : !data ? (
            <p className="text-xs text-[#86868b] text-center py-10">Загрузка…</p>
          ) : data.total === 0 ? (
            <p className="text-xs text-[#86868b] text-center py-10">По этой точке в Smartup нет заказов, возвратов и оплат.</p>
          ) : (
            <>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9fa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                  <tr>
                    <th className="p-2.5">Месяц</th><th className="p-2.5 text-right">Заказы</th><th className="p-2.5 text-right">Возвраты</th>
                    <th className="p-2.5 text-right">Оплаты</th><th className="p-2.5 text-right">Заказов</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e3e8]/60">
                  {data.months.map((m: any) => (
                    <tr key={m.month}>
                      <td className="p-2.5 font-semibold">{m.month.split('-').reverse().join('.')}</td>
                      <td className="p-2.5 text-right font-mono">{m.orders ? money(m.orders) : '—'}</td>
                      <td className={`p-2.5 text-right font-mono ${m.returns ? 'text-rose-600' : ''}`}>{m.returns ? money(m.returns) : '—'}</td>
                      <td className={`p-2.5 text-right font-mono ${m.payments ? 'text-emerald-700' : ''}`}>{m.payments ? money(m.payments) : '—'}</td>
                      <td className="p-2.5 text-right font-mono">{m.orderCount || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div>
                <h4 className="text-xs font-bold text-[#1d1d1f] mb-2">
                  Документы {data.total > data.documents.length ? `(последние ${data.documents.length} из ${data.total})` : `(${data.total})`}
                </h4>
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-[#e3e3e8]/60">
                    {data.documents.map((d: any) => (
                      <tr key={d.id}>
                        <td className="p-2 text-[#86868b] font-mono whitespace-nowrap">{new Date(d.occurredAt).toLocaleDateString('ru-RU')}</td>
                        <td className="p-2">{KIND_LABELS[d.kind] ?? d.kind}</td>
                        <td className="p-2 text-[#86868b]">{d.agentName || ''}</td>
                        <td className={`p-2 text-right font-mono ${d.kind === 'payment' ? 'text-emerald-700' : d.kind === 'return' ? 'text-rose-600' : ''}`}>
                          {money(d.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
