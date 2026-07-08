import { useEffect, useState } from 'react';
import api from '../services/api';
import { Package, Check, Play } from 'lucide-react';

export default function Warehouse() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      // Show only orders that are pending, assembling or assembled
      setOrders(res.data.filter((o: any) => ['pending', 'assembling', 'assembled'].includes(o.status)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      loadOrders();
    } catch (err) {
      console.error(err);
      alert('Ошибка обновления статуса сборки');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="w-8 h-8 border-4 border-slate-200 border-t-[#37352f] rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
        <h3 className="font-bold text-[#1d1d1f] text-base">Рабочее место кладовщика</h3>
        <p className="text-[11px] text-[#86868b] mt-0.5">Комплектация, сборка заказов торговых представителей и отгрузка</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {orders.length === 0 ? (
          <div className="bg-white border border-[#e9e9e7] rounded-xl p-8 text-center text-xs text-[#86868b] italic">
            Нет заказов на сборку в данный момент.
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white border border-[#e9e9e7] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-[#e9e9e7] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-[#6a6a65]">
                      Заказ #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      order.status === 'assembled'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : order.status === 'assembling'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {order.status === 'pending' ? 'Новый' : order.status === 'assembling' ? 'Сборка' : 'Собран'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#37352f] mt-1">Клиент: {order.client?.name}</h4>
                  <p className="text-[10px] text-[#86868b]">{order.client?.address}</p>
                </div>

                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'assembling')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Начать сборку</span>
                    </button>
                  )}
                  {order.status === 'assembling' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'assembled')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Завершить сборку</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-bold text-[#86868b] tracking-wider">Спецификация заказа:</span>
                <div className="divide-y divide-[#e9e9e7]/60 border border-[#e9e9e7] rounded-lg overflow-hidden">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-[#fbfbfa] text-xs">
                      <div className="flex items-center gap-2.5">
                        <Package className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="font-semibold text-[#37352f]">{item.product?.name}</p>
                          <span className="text-[9px] text-[#86868b] font-mono">SKU: {item.product?.sku}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-[#0071e3] bg-blue-50 px-2 py-0.5 rounded font-mono">
                          {parseFloat(item.quantity).toFixed(0)} {item.product?.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
