import { useEffect, useState } from 'react';
import api from '../services/api';
import { RotateCcw, CheckCircle, Plus, Filter, FileText, Scale, Droplet } from 'lucide-react';

export default function Returns() {
  const [returns, setReturns] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedRep, setSelectedRep] = useState('all');

  // Modal states
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [reason, setReason] = useState('');
  const [returnItems, setReturnItems] = useState<{ productId: string; quantity: number; price: number }[]>([]);

  const loadData = async () => {
    try {
      const [retRes, cliRes, prodRes, userRes, whRes] = await Promise.all([
        api.get('/returns').catch(() => ({ data: [] })),
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/catalog/products').catch(() => ({ data: [] })),
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/stocks/warehouses').catch(() => ({ data: [] })),
      ]);
      setReturns(retRes.data);
      setClients(cliRes.data);
      setProducts(prodRes.data);
      setUsers(userRes.data);
      setWarehouses(whRes.data);

      if (whRes.data.length > 0) {
        setSelectedWarehouse(whRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load returns data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = () => {
    setReturnItems([...returnItems, { productId: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...returnItems];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      updated[index] = {
        productId: value,
        price: prod ? parseFloat(prod.price) : 0,
        quantity: updated[index].quantity,
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setReturnItems(updated);
  };

  const closeForm = () => {
    setShowAddForm(false);
    setSelectedClient('');
    setReason('');
    setReturnItems([]);
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totalAmount = returnItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

      await api.post('/returns', {
        clientId: selectedClient,
        warehouseId: selectedWarehouse,
        reason,
        totalAmount,
        items: returnItems,
      });

      closeForm();
      loadData();
    } catch (err) {
      console.error('Failed to create return', err);
      alert('Ошибка при создании возврата.');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/returns/${id}/status`, { status: newStatus });
      loadData();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const processedReturns = returns.map((r) => {
    // Determine a zone from client address or fallback
    const matchedClient = clients.find((c) => c.id === r.clientId);
    let workZone = 'Сино';
    if (matchedClient) {
      if (matchedClient.address.includes('Сомони')) workZone = 'И. Сомони';
      else if (matchedClient.address.includes('Фирдавси')) workZone = 'Фирдавси';
      else if (matchedClient.address.includes('Шохмансур')) workZone = 'Шохмансур';
      else if (matchedClient.address.includes('Худжанд')) workZone = 'Худжанд';
    }
    return {
      ...r,
      workZone,
    };
  });

  const defaultPresets = ['Сино', 'Фирдавси', 'И. Сомони', 'Шохмансур', 'Худжанд'];
  const allZones = Array.from(new Set([...defaultPresets, ...processedReturns.map((r) => r.workZone)]));

  const filteredReturns = processedReturns.filter((r) => {
    const zoneMatch = selectedZone === 'all' || r.workZone === selectedZone;
    const repMatch = selectedRep === 'all' || r.salesRepId === selectedRep;
    return zoneMatch && repMatch;
  });

  // KPI/Totals
  const totalDeals = filteredReturns.length;
  const totalAmount = filteredReturns.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);

  // Dynamic calculations based on actual item quantities
  const totalReturnedQty = filteredReturns.reduce((sum, r) => {
    const items = r.items || [];
    return sum + items.reduce((iSum: number, item: any) => iSum + parseFloat(item.quantity || 0), 0);
  }, 0);

  const totalWeight = totalReturnedQty * 1.5; // Calculated based on 1.5 kg per product unit
  const totalVolume = totalReturnedQty * 0.003; // Calculated based on 0.003 m3 per product unit

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight">Возвраты продукции</h1>
          <p className="text-xs text-[#86868b] mt-0.5">Реестр возвратов товаров от розничных клиентов</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#37352f] hover:bg-[#4a4944] text-white font-semibold text-xs transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Оформить возврат</span>
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-[#ffffff] border border-[#e9e9e7] rounded-xl p-4 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#86868b]">
          <Filter className="w-3.5 h-3.5" />
          <span>Фильтры:</span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Рабочая зона</label>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-[#f5f5f7] border border-[#e9e9e7] rounded-lg px-2.5 py-1 text-xs text-[#37352f] font-medium focus:outline-none"
          >
            <option value="all">Все зоны</option>
            {allZones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Торговый агент</label>
          <select
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
            className="bg-[#f5f5f7] border border-[#e9e9e7] rounded-lg px-2.5 py-1 text-xs text-[#37352f] font-medium focus:outline-none"
          >
            <option value="all">Все сотрудники</option>
            {users
              .filter((u) => u.role === 'SALES_REP')
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Main Returns Table */}
      <div className="bg-white border border-[#e9e9e7] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f5f5f7] border-b border-[#e9e9e7]">
                <th className="px-6 py-3 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Клиент</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Агент</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Рабочая Зона</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Причина</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Товары</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Сумма (TJS)</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Статус</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9e9e7]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-xs text-[#86868b]">
                    Загрузка возвратов...
                  </td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-xs text-[#86868b]">
                    Нет оформленных возвратов
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-[#fafaf9] transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-[#1d1d1f]">{ret.client?.name}</div>
                      <div className="text-[10px] text-[#86868b] mt-0.5">ID: {ret.clientId.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-[#37352f]">
                      {ret.salesRep ? `${ret.salesRep.firstName} ${ret.salesRep.lastName}` : 'Неизвестно'}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-[#37352f]">
                      {ret.workZone}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#6a6a65] italic">
                      {ret.reason}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[200px] text-[10px] text-[#515154] leading-relaxed">
                        {ret.items?.map((it: any) => (
                          <div key={it.id}>
                            • {it.product?.name} x{parseFloat(it.quantity)}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-[#1d1d1f]">
                      {parseFloat(ret.totalAmount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} TJS
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          ret.status === 'completed'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : ret.status === 'approved'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {ret.status === 'completed' ? 'Принят' : ret.status === 'approved' ? 'Подтвержден' : 'Ожидает'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {ret.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusChange(ret.id, 'approved')}
                            className="px-2 py-1 rounded bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-[10px] transition-colors"
                          >
                            Одобрить
                          </button>
                          <button
                            onClick={() => handleStatusChange(ret.id, 'completed')}
                            className="px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] transition-colors"
                          >
                            Принять на склад
                          </button>
                        </div>
                      )}
                      {ret.status === 'approved' && (
                        <button
                          onClick={() => handleStatusChange(ret.id, 'completed')}
                          className="px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] transition-colors"
                        >
                          Принять на склад
                        </button>
                      )}
                      {ret.status === 'completed' && (
                        <span className="text-[#86868b] flex items-center gap-1 font-semibold text-[10px]">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" /> Готово
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Summary panel */}
        <div className="bg-[#f5f5f7] border-t border-[#e9e9e7] px-6 py-4 flex flex-wrap gap-6 items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#1d1d1f]">
            <FileText className="w-4 h-4 text-[#86868b]" />
            <span>Итоговые показатели возвратов:</span>
          </div>

          <div className="flex gap-6 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[#86868b]">Сделок:</span>
              <span className="font-bold text-[#1d1d1f]">{totalDeals}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-[#86868b]" />
              <span className="text-[#86868b]">Вес:</span>
              <span className="font-bold text-[#1d1d1f]">{totalWeight.toFixed(1)} кг</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5 text-[#86868b]" />
              <span className="text-[#86868b]">Объем:</span>
              <span className="font-bold text-[#1d1d1f]">{totalVolume.toFixed(1)} л</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#86868b]">Сумма возвратов:</span>
              <span className="font-bold text-[#0071e3]">{totalAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} TJS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Return Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#e9e9e7] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#f5f5f7] border-b border-[#e9e9e7] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#37352f]" />
                <h3 className="font-bold text-sm text-[#1d1d1f]">Оформление возврата продукции</h3>
              </div>
              <button onClick={closeForm} className="text-[#86868b] hover:text-[#1d1d1f] text-xs font-semibold">
                Закрыть
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Торговый склад возврата</label>
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    required
                    className="bg-white border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs text-[#37352f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Розничный клиент</label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    required
                    className="bg-white border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs text-[#37352f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                  >
                    <option value="">Выберите торговую точку...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.address})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Причина возврата</label>
                <input
                  type="text"
                  placeholder="Брак, истек срок годности, излишек..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="bg-white border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs text-[#37352f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                />
              </div>

              {/* Items specification */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Спецификация товаров</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-[#0071e3] hover:underline font-semibold"
                  >
                    + Добавить товар
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {returnItems.map((item, index) => (
                    <div key={index} className="flex gap-2.5 items-center">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        required
                        className="flex-1 bg-white border border-[#e9e9e7] rounded-lg px-2.5 py-1.5 text-xs text-[#37352f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                      >
                        <option value="">Выберите товар...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.price} TJS)
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        placeholder="Кол-во"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        required
                        className="w-20 bg-white border border-[#e9e9e7] rounded-lg px-2.5 py-1.5 text-xs text-[#37352f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                      />

                      <input
                        type="text"
                        disabled
                        value={`${(item.quantity * item.price).toFixed(2)} TJS`}
                        className="w-28 bg-[#f5f5f7] border border-[#e9e9e7] rounded-lg px-2.5 py-1.5 text-xs text-[#86868b] font-bold text-right"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold px-1.5"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#e9e9e7] flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider block">Итоговая сумма</span>
                  <span className="text-lg font-bold text-[#1d1d1f]">
                    {returnItems.reduce((sum, item) => sum + item.quantity * item.price, 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} TJS
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 rounded-lg bg-[#f5f5f7] hover:bg-[#e9e9e7] text-[#515154] font-semibold text-xs transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#37352f] hover:bg-[#4a4944] text-white font-semibold text-xs transition-colors"
                  >
                    Оформить возврат
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
