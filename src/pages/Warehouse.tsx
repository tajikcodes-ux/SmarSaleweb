import { useEffect, useState } from 'react';
import api from '../services/api';
import { Warehouse as WarehouseIcon, Package, Check, Play, Printer, Plus, Edit, Trash, MapPin, Building2, Boxes } from 'lucide-react';

export default function Warehouse() {
  const [activeTab, setActiveTab] = useState<'management' | 'picking'>('management');

  // Warehouses state
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', address: '', branchId: '' });

  // Picking orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const loadWarehouses = async () => {
    try {
      setLoadingWarehouses(true);
      const [whRes, brRes] = await Promise.all([
        api.get('/stocks/warehouses'),
        api.get('/branches'),
      ]);
      setWarehouses(whRes.data || []);
      setBranches(brRes.data || []);
    } catch (err) {
      console.error('Failed to load warehouses', err);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await api.get('/orders');
      setOrders(res.data.filter((o: any) => ['pending', 'assembling', 'assembled'].includes(o.status)));
    } catch (err) {
      console.error('Failed to load picking orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
    loadOrders();
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    try {
      await api.post('/stocks/warehouses', {
        name: formData.name,
        address: formData.address || null,
        branchId: formData.branchId || null,
      });
      setShowAddModal(false);
      setFormData({ name: '', address: '', branchId: '' });
      loadWarehouses();
    } catch (err) {
      console.error('Failed to create warehouse', err);
      alert('Ошибка при создании склада');
    }
  };

  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse || !formData.name.trim()) return;
    try {
      await api.put(`/stocks/warehouses/${editingWarehouse.id}`, {
        name: formData.name,
        address: formData.address || null,
        branchId: formData.branchId || null,
      });
      setEditingWarehouse(null);
      setFormData({ name: '', address: '', branchId: '' });
      loadWarehouses();
    } catch (err) {
      console.error('Failed to update warehouse', err);
      alert('Ошибка при обновлении склада');
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот склад?')) return;
    try {
      await api.delete(`/stocks/warehouses/${id}`);
      loadWarehouses();
    } catch (err) {
      console.error('Failed to delete warehouse', err);
      alert('Не удалось удалить склад (возможно, к нему привязаны товары или заказы)');
    }
  };

  const openEditModal = (wh: any) => {
    setEditingWarehouse(wh);
    setFormData({
      name: wh.name || '',
      address: wh.address || '',
      branchId: wh.branchId || wh.branch?.id || '',
    });
  };

  const toggleCheckItem = (itemId: string) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handlePrintPickingList = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsRows = (order.items || []).map((item: any, idx: number) => `
      <tr>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #ccc;">${item.product?.name || 'Товар'}</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-family: monospace;">${item.product?.sku || '—'}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: right; font-weight: bold;">${parseFloat(item.quantity).toFixed(0)} ${item.product?.unit || 'шт'}</td>
        <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">[  ]</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Сборочный лист Заказ #${order.id.slice(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h2 { margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th { background: #f0f0f0; padding: 8px; border: 1px solid #ccc; }
          </style>
        </head>
        <body>
          <h2>СБОРОЧНЫЙ ЛИСТ КЛАДОВЩИКА</h2>
          <p><strong>Заказ №:</strong> ${order.id.toUpperCase()}</p>
          <p><strong>Клиент:</strong> ${order.client?.name || '—'} (${order.client?.address || '—'})</p>
          <p><strong>Торговый агент:</strong> ${order.salesRep?.firstName || ''} ${order.salesRep?.lastName || ''}</p>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Наименование товара</th>
                <th>Артикул (SKU)</th>
                <th>Кол-во к сборке</th>
                <th>Отметка</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <br/><br/>
          <p style="text-align: right;"><strong>Подпись кладовщика: ____________________</strong></p>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      loadOrders();
    } catch (err) {
      console.error(err);
      alert('Ошибка обновления статуса сборки');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#37352f]">
      {/* Header & Tabs */}
      <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[#1d1d1f] text-base flex items-center gap-2">
              <WarehouseIcon className="w-5 h-5 text-[#37352f]" />
              Складской учёт и сборка
            </h3>
            <p className="text-[11px] text-[#86868b] mt-0.5">
              Управление складами компании, географическая привязка к филиалам и сборка заказов
            </p>
          </div>
          {activeTab === 'management' && (
            <button
              onClick={() => {
                setFormData({ name: '', address: '', branchId: '' });
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Создать склад</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-t border-[#e9e9e7] pt-3">
          <button
            onClick={() => setActiveTab('management')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'management'
                ? 'bg-[#37352f] text-white shadow-sm'
                : 'bg-[#fbfbfa] text-[#6a6a65] hover:bg-slate-100'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Управление складами ({warehouses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('picking')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'picking'
                ? 'bg-[#37352f] text-white shadow-sm'
                : 'bg-[#fbfbfa] text-[#6a6a65] hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Рабочее место кладовщика ({orders.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Warehouse Management */}
      {activeTab === 'management' && (
        <>
          {loadingWarehouses ? (
            <div className="flex h-48 items-center justify-center">
              <span className="w-8 h-8 border-4 border-slate-200 border-t-[#37352f] rounded-full animate-spin"></span>
            </div>
          ) : warehouses.length === 0 ? (
            <div className="bg-white border border-[#e9e9e7] rounded-xl p-12 text-center text-xs text-[#86868b] italic">
              Склады еще не созданы. Нажмите "Создать склад" для добавления первого склада.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {warehouses.map((wh) => (
                <div
                  key={wh.id}
                  className="bg-white border border-[#e9e9e7] rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#1d1d1f] text-sm">{wh.name}</h4>
                      </div>
                      {wh.address ? (
                        <p className="text-[11px] text-[#6a6a65] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{wh.address}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">Адрес не указан</p>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openEditModal(wh)}
                        className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-[#0071e3] rounded-lg transition-colors border border-transparent hover:border-slate-100"
                        title="Редактировать склад"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWarehouse(wh.id)}
                        className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-slate-100"
                        title="Удалить склад"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Branch Pill */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[9px] uppercase font-bold text-[#86868b] tracking-wider">Филиал:</span>
                    {wh.branch ? (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-[#0071e3] border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Building2 className="w-3 h-3" />
                        {wh.branch.name}
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-medium px-2 py-0.5 rounded-full">
                        Центральный / Без филиала
                      </span>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 border-t border-[#e9e9e7]/60 pt-3 text-center">
                    <div className="bg-[#fbfbfa] p-2 rounded-lg border border-[#e9e9e7]/40">
                      <div className="text-sm font-bold text-slate-700">{wh._count?.stocks ?? 0}</div>
                      <div className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider mt-0.5">Товарных позиций</div>
                    </div>
                    <div className="bg-[#fbfbfa] p-2 rounded-lg border border-[#e9e9e7]/40">
                      <div className="text-sm font-bold text-slate-700">{wh._count?.orders ?? 0}</div>
                      <div className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider mt-0.5">Заказов отгружено</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: Picking Workspace */}
      {activeTab === 'picking' && (
        <div className="grid grid-cols-1 gap-6">
          {loadingOrders ? (
            <div className="flex h-48 items-center justify-center">
              <span className="w-8 h-8 border-4 border-slate-200 border-t-[#37352f] rounded-full animate-spin"></span>
            </div>
          ) : orders.length === 0 ? (
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
                    <button
                      onClick={() => handlePrintPickingList(order)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e9e9e7] hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs transition-all bg-white shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Печать сборочного листа</span>
                    </button>

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
                    {order.items?.map((item: any) => {
                      const isChecked = !!checkedItems[item.id];
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleCheckItem(item.id)}
                          className={`flex justify-between items-center p-3 text-xs cursor-pointer transition-colors ${
                            isChecked ? 'bg-emerald-50/50' : 'bg-[#fbfbfa] hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCheckItem(item.id)}
                              className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                            />
                            <Package className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className={`font-semibold ${isChecked ? 'line-through text-slate-400' : 'text-[#37352f]'}`}>
                                {item.product?.name}
                              </p>
                              <span className="text-[9px] text-[#86868b] font-mono">SKU: {item.product?.sku}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-[#0071e3] bg-blue-50 px-2.5 py-1 rounded-lg font-mono">
                              {parseFloat(item.quantity).toFixed(0)} {item.product?.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Add Warehouse */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateWarehouse} className="bg-white border border-[#e9e9e7] rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#e9e9e7] pb-3">
              <h4 className="font-bold text-[#1d1d1f] text-sm">Добавить новый склад</h4>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Название склада*</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например, Центральный склад Худжанд"
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Адрес склада</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Например, ул. Ленина 45"
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Привязка к филиалу</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3]"
                >
                  <option value="">Без привязки (Центральный)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#e9e9e7]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-1.5 border border-[#e9e9e7] rounded-lg text-xs font-semibold text-[#6a6a65] hover:bg-[#fbfbfa]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg text-xs font-bold"
              >
                Создать
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Warehouse */}
      {editingWarehouse && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdateWarehouse} className="bg-white border border-[#e9e9e7] rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#e9e9e7] pb-3">
              <h4 className="font-bold text-[#1d1d1f] text-sm">Редактировать склад</h4>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Название склада*</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Адрес склада</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Привязка к филиалу</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3]"
                >
                  <option value="">Без привязки (Центральный)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#e9e9e7]">
              <button
                type="button"
                onClick={() => setEditingWarehouse(null)}
                className="px-3.5 py-1.5 border border-[#e9e9e7] rounded-lg text-xs font-semibold text-[#6a6a65] hover:bg-[#fbfbfa]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg text-xs font-bold"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
