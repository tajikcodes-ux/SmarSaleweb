import { useEffect, useState } from 'react';
import api from '../services/api';

const REASON_LABELS: Record<string, string> = {
  manual_adjust: 'Ручная правка',
  procurement: 'Приход',
  inventory: 'Инвентаризация',
  order: 'Заказ',
  order_release: 'Отмена заказа',
  return: 'Возврат',
  return_revoke: 'Отзыв возврата',
  transfer_out: 'Перемещение (расход)',
  transfer_in: 'Перемещение (приход)',
};

/** Stock movement journal of one warehouse: every change of every batch, newest first. */
export default function StockJournal({ warehouses }: { warehouses: Array<{ id: string; name: string }> }) {
  const [warehouseId, setWarehouseId] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) setWarehouseId(warehouses[0].id);
  }, [warehouses, warehouseId]);

  useEffect(() => {
    if (!warehouseId) return;
    setLoading(true);
    api.get('/stocks/journal', { params: { warehouseId, limit: 200 } })
      .then((res) => setEntries(Array.isArray(res.data) ? res.data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [warehouseId]);

  return (
    <div className="bg-white border border-[#e3e3e8] rounded-2xl p-5 shadow-sm mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold text-[#1d1d1f]">Журнал движения остатков</h3>
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs"
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="text-xs text-[#86868b] py-4 text-center">Загрузка…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-[#86868b] py-4 text-center">Движений по складу пока нет.</p>
      ) : (
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[#86868b] border-b border-[#e9e9e7]">
                <th className="py-2 pr-3 font-semibold">Дата</th>
                <th className="py-2 pr-3 font-semibold">Товар</th>
                <th className="py-2 pr-3 font-semibold">Партия</th>
                <th className="py-2 pr-3 font-semibold">Операция</th>
                <th className="py-2 pr-3 font-semibold text-right">Кол-во</th>
                <th className="py-2 font-semibold">Документ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9e9e7]/60">
              {entries.map((e) => {
                const qty = Number(e.quantity);
                return (
                  <tr key={e.id}>
                    <td className="py-2 pr-3 font-mono text-[#6a6a65]">{new Date(e.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="py-2 pr-3">{e.product?.name || e.productId}</td>
                    <td className="py-2 pr-3 font-mono">{e.batchNumber || '—'}</td>
                    <td className="py-2 pr-3">{REASON_LABELS[e.reason] || e.reason}{e.note ? ` (${e.note})` : ''}</td>
                    <td className={`py-2 pr-3 text-right font-mono font-bold ${qty < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {qty > 0 ? '+' : ''}{qty}
                    </td>
                    <td className="py-2 font-mono text-[#86868b]">{e.documentId ? `${e.documentType} №${String(e.documentId).slice(0, 8).toUpperCase()}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
