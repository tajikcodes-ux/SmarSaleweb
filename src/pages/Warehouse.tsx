import { useEffect, useState } from 'react';
import api from '../services/api';
import { Warehouse as WarehouseIcon, Package, Check, Play, Printer, Plus, Edit, Trash, MapPin, Building2, Boxes, ClipboardCheck, CheckCircle2, Save, ArrowLeft } from 'lucide-react';

export default function Warehouse() {
  const [activeTab, setActiveTab] = useState<'management' | 'picking' | 'audits'>('management');

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

  // Inventory Audit state
  const [audits, setAudits] = useState<any[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [activeAudit, setActiveAudit] = useState<any>(null);
  const [showNewAuditModal, setShowNewAuditModal] = useState(false);
  const [newAuditWarehouseId, setNewAuditWarehouseId] = useState('');
  const [newAuditNotes, setNewAuditNotes] = useState('');
  const [auditActuals, setAuditActuals] = useState<Record<string, number>>({});
  const [savingAudit, setSavingAudit] = useState(false);
  const [committingAudit, setCommittingAudit] = useState(false);

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

  const loadAudits = async () => {
    try {
      setLoadingAudits(true);
      const res = await api.get('/stocks/audits');
      setAudits(res.data || []);
    } catch (err) {
      console.error('Failed to load audits', err);
    } finally {
      setLoadingAudits(false);
    }
  };

  const openAudit = async (id: string) => {
    try {
      const res = await api.get(`/stocks/audits/${id}`);
      setActiveAudit(res.data);
      const initialCounts: Record<string, number> = {};
      (res.data.items || []).forEach((item: any) => {
        initialCounts[item.productId] = Number(item.actualQuantity);
      });
      setAuditActuals(initialCounts);
    } catch (err) {
      console.error('Failed to load audit detail', err);
      alert('Не удалось загрузить документ инвентаризации');
    }
  };

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuditWarehouseId) {
      alert('Выберите склад для инвентаризации');
      return;
    }
    try {
      const res = await api.post('/stocks/audits', {
        warehouseId: newAuditWarehouseId,
        notes: newAuditNotes || undefined,
      });
      setShowNewAuditModal(false);
      setNewAuditNotes('');
      await loadAudits();
      await openAudit(res.data.id);
    } catch (err: any) {
      console.error('Failed to create audit', err);
      alert(err.response?.data?.message || 'Ошибка создания документа инвентаризации');
    }
  };

  const handleSaveAuditItems = async () => {
    if (!activeAudit) return;
    try {
      setSavingAudit(true);
      const itemsPayload = Object.entries(auditActuals).map(([productId, actualQuantity]) => ({
        productId,
        actualQuantity: Number(actualQuantity || 0),
      }));
      const res = await api.put(`/stocks/audits/${activeAudit.id}/items`, { items: itemsPayload });
      setActiveAudit(res.data);
      alert('Данные фактических остатков сохранены!');
      loadAudits();
    } catch (err: any) {
      console.error('Failed to save audit items', err);
      alert(err.response?.data?.message || 'Ошибка сохранения фактических остатков');
    } finally {
      setSavingAudit(false);
    }
  };

  const handleCommitAudit = async () => {
    if (!activeAudit) return;
    if (!window.confirm('Вы уверены, что хотите провести инвентаризацию? Учетные остатки склада будут безвозвратно скорректированы в соответствии с фактическими данными!')) {
      return;
    }
    try {
      setCommittingAudit(true);
      const itemsPayload = Object.entries(auditActuals).map(([productId, actualQuantity]) => ({
        productId,
        actualQuantity: Number(actualQuantity || 0),
      }));
      await api.put(`/stocks/audits/${activeAudit.id}/items`, { items: itemsPayload });
      await api.post(`/stocks/audits/${activeAudit.id}/commit`);
      alert('Инвентаризация успешно проведена! Остатки на складе синхронизированы.');
      await openAudit(activeAudit.id);
      loadAudits();
      loadWarehouses();
    } catch (err: any) {
      console.error('Failed to commit audit', err);
      alert(err.response?.data?.message || 'Ошибка проведения инвентаризации');
    } finally {
      setCommittingAudit(false);
    }
  };

  const printAuditSheet = (auditDoc: any) => {
    const doc = auditDoc || activeAudit;
    if (!doc) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsRows = (doc.items || []).map((item: any, idx: number) => {
      const book = Number(item.bookQuantity || 0);
      const actual = Number(auditActuals[item.productId] !== undefined ? auditActuals[item.productId] : item.actualQuantity || 0);
      const diff = actual - book;
      const cost = Number(item.costPrice || 0);
      const diffAmt = diff * cost;
      const diffColor = diff > 0 ? '#15803d' : diff < 0 ? '#b91c1c' : '#334155';

      return `
        <tr>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-family: monospace;">${item.product?.sku || '—'}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px;">${item.product?.name || '—'}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${item.product?.unit || 'шт'}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${book.toFixed(2)}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${actual.toFixed(2)}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px; color: ${diffColor}; font-weight: bold;">
            ${diff > 0 ? '+' : ''}${diff.toFixed(2)}
          </td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px;">${cost.toFixed(2)}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px; color: ${diffColor}; font-weight: bold;">
            ${diffAmt > 0 ? '+' : ''}${diffAmt.toFixed(2)}
          </td>
        </tr>
      `;
    }).join('');

    const stats = doc.calculatedStats || {};
    const surplus = Number(stats.totalSurplus || doc.totalSurplus || 0);
    const shortage = Number(stats.totalShortage || doc.totalShortage || 0);
    const net = Number(stats.netVariance || doc.netVariance || 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Сличительная ведомость № ${doc.id.slice(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; font-size: 12px; }
            h2 { margin: 0 0 4px 0; font-size: 16px; text-transform: uppercase; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background: #f1f5f9; padding: 7px; border: 1px solid #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: bold; }
            .totals-box { margin-top: 16px; display: flex; justify-content: flex-end; gap: 24px; font-size: 13px; font-weight: bold; }
            .signatures { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; }
            .sig-line { border-bottom: 1px solid #000; width: 180px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <div>
              <h2>СЛИЧИТЕЛЬНАЯ ВЕДОМОСТЬ РЕЗУЛЬТАТОВ ИНВЕНТАРИЗАЦИИ ТМЦ</h2>
              <p style="margin: 3px 0;"><strong>Документ №:</strong> ${doc.id.toUpperCase()}</p>
              <p style="margin: 3px 0;"><strong>Склад:</strong> ${doc.warehouse?.name || '—'} (${doc.warehouse?.address || '—'})</p>
              <p style="margin: 3px 0;"><strong>Дата проведения:</strong> ${new Date(doc.auditDate || doc.createdAt).toLocaleString('ru-RU')}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 3px 0;"><strong>Организация:</strong> SmartSale FMCG Distribution</p>
              <p style="margin: 3px 0;"><strong>Статус:</strong> ${doc.status === 'completed' ? 'ПРОВЕДЕНА' : 'ЧЕРНОВИК'}</p>
              <p style="margin: 3px 0;"><strong>Провел:</strong> ${doc.conductedBy ? doc.conductedBy.firstName + ' ' + (doc.conductedBy.lastName || '') : 'Материально-ответственное лицо'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">№</th>
                <th style="width: 80px;">Артикул</th>
                <th>Наименование товара</th>
                <th style="width: 50px;">Ед.</th>
                <th style="width: 70px;">Учет</th>
                <th style="width: 70px;">Факт</th>
                <th style="width: 80px;">Разница</th>
                <th style="width: 70px;">Цена TJS</th>
                <th style="width: 90px;">Сумма TJS</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="totals-box">
            <div style="color: #15803d;">Излишки (+): ${surplus.toFixed(2)} TJS</div>
            <div style="color: #b91c1c;">Недостачи (-): ${shortage.toFixed(2)} TJS</div>
            <div style="color: ${net >= 0 ? '#15803d' : '#b91c1c'}; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 4px;">
              Сальдо: ${net >= 0 ? '+' : ''}${net.toFixed(2)} TJS
            </div>
          </div>

          <div class="signatures">
            <div>
              Председатель комиссии: <span class="sig-line"></span>
            </div>
            <div>
              Члены комиссии: <span class="sig-line"></span>
            </div>
            <div>
              Материально-ответственное лицо: <span class="sig-line"></span>
            </div>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    loadWarehouses();
    loadOrders();
    loadAudits();
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
          {activeTab === 'audits' && !activeAudit && (
            <button
              onClick={() => {
                setNewAuditWarehouseId(warehouses[0]?.id || '');
                setNewAuditNotes('');
                setShowNewAuditModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Новая инвентаризация</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-t border-[#e9e9e7] pt-3 flex-wrap">
          <button
            onClick={() => {
              setActiveTab('management');
              setActiveAudit(null);
            }}
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
            onClick={() => {
              setActiveTab('picking');
              setActiveAudit(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'picking'
                ? 'bg-[#37352f] text-white shadow-sm'
                : 'bg-[#fbfbfa] text-[#6a6a65] hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Рабочее место кладовщика ({orders.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('audits');
              setActiveAudit(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'audits'
                ? 'bg-[#37352f] text-white shadow-sm'
                : 'bg-[#fbfbfa] text-[#6a6a65] hover:bg-slate-100'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Инвентаризация и сличительная ведомость ({audits.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Warehouse Management */}
      {activeTab === 'management' && (
        <>
          {loadingWarehouses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white border border-[#e9e9e7] rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-slate-200 rounded"></div>
                      <div className="h-3 w-48 bg-slate-100 rounded"></div>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-6 h-6 rounded bg-slate-100"></div>
                      <div className="w-6 h-6 rounded bg-slate-100"></div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                    <div className="h-3 w-28 bg-slate-100 rounded"></div>
                    <div className="h-5 w-20 bg-slate-100 rounded-full"></div>
                  </div>
                </div>
              ))}
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
            <div className="grid grid-cols-1 gap-6 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-[#e9e9e7] rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-28 bg-slate-200 rounded"></div>
                        <div className="h-4 w-16 bg-slate-100 rounded"></div>
                      </div>
                      <div className="h-3.5 w-44 bg-slate-200 rounded"></div>
                      <div className="h-2.5 w-32 bg-slate-100 rounded"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-24 bg-slate-100 rounded-lg"></div>
                      <div className="h-8 w-28 bg-slate-200 rounded-lg"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-10 bg-slate-50 border border-slate-100 rounded-lg"></div>
                    <div className="h-10 bg-slate-50 border border-slate-100 rounded-lg"></div>
                  </div>
                </div>
              ))}
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

      {/* TAB 3: Inventory Audits & Discrepancy Reconciliation */}
      {activeTab === 'audits' && (
        <div className="space-y-6">
          {!activeAudit ? (
            <>
              {/* Audits Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                    Всего инвентаризаций
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-bold text-[#1d1d1f] font-mono">{audits.length}</span>
                    <span className="text-xs text-[#86868b]">документов</span>
                  </div>
                  <span className="text-[10px] text-[#86868b] block mt-1">Полный аудит складских запасов ТМЦ</span>
                </div>

                <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                    Проведено (Синхронизировано)
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-bold text-emerald-600 font-mono">
                      {audits.filter((a) => a.status === 'completed').length}
                    </span>
                    <span className="text-xs text-[#86868b]">актов</span>
                  </div>
                  <span className="text-[10px] text-[#86868b] block mt-1">Остатки на складе приведены к факту</span>
                </div>

                <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                    В работе (Черновики)
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-bold text-amber-600 font-mono">
                      {audits.filter((a) => a.status === 'draft').length}
                    </span>
                    <span className="text-xs text-[#86868b]">актов</span>
                  </div>
                  <span className="text-[10px] text-[#86868b] block mt-1">Сверка фактических остатков</span>
                </div>
              </div>

              {/* Audits Table */}
              <div className="bg-white border border-[#e9e9e7] rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#e9e9e7] flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-[#0071e3]" />
                      Журнал документов инвентаризации
                    </h4>
                    <p className="text-[11px] text-[#86868b] mt-0.5">
                      Сличительные ведомости, фиксация расхождений и оприходование/списание ТМЦ
                    </p>
                  </div>
                </div>

                {loadingAudits ? (
                  <div className="p-12 text-center text-slate-400">
                    <span className="w-6 h-6 border-2 border-slate-200 border-t-[#0071e3] rounded-full animate-spin inline-block mb-2"></span>
                    <p className="text-xs">Загрузка документов инвентаризации...</p>
                  </div>
                ) : audits.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto" />
                    <h5 className="font-bold text-sm text-[#1d1d1f]">Инвентаризации еще не проводились</h5>
                    <p className="text-xs text-[#86868b] max-w-md mx-auto">
                      Создайте новый документ инвентаризации, чтобы зафиксировать книжные остатки склада и сверить фактическое наличие товара.
                    </p>
                    <button
                      onClick={() => {
                        setNewAuditWarehouseId(warehouses[0]?.id || '');
                        setNewAuditNotes('');
                        setShowNewAuditModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] text-white rounded-lg text-xs font-bold hover:bg-[#0077ed] transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Начать первую инвентаризацию
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#e9e9e7] bg-[#fbfbfa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                          <th className="p-3.5">Документ №</th>
                          <th className="p-3.5">Дата</th>
                          <th className="p-3.5">Склад</th>
                          <th className="p-3.5">Ответственный</th>
                          <th className="p-3.5">Позиций</th>
                          <th className="p-3.5">Излишки (+)</th>
                          <th className="p-3.5">Недостачи (-)</th>
                          <th className="p-3.5">Сальдо</th>
                          <th className="p-3.5">Статус</th>
                          <th className="p-3.5 text-right">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e9e9e7]/70 text-xs">
                        {audits.map((a) => {
                          const surplus = Number(a.totalSurplus || 0);
                          const shortage = Number(a.totalShortage || 0);
                          const net = Number(a.netVariance || 0);
                          const isCompleted = a.status === 'completed';

                          return (
                            <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3.5 font-mono font-bold text-[#1d1d1f]">
                                #{a.id.slice(0, 8).toUpperCase()}
                              </td>
                              <td className="p-3.5 text-slate-600">
                                {new Date(a.auditDate || a.createdAt).toLocaleDateString('ru-RU')}
                              </td>
                              <td className="p-3.5 font-semibold text-[#1d1d1f]">
                                {a.warehouse?.name || '—'}
                              </td>
                              <td className="p-3.5 text-slate-600">
                                {a.conductedBy ? `${a.conductedBy.firstName} ${a.conductedBy.lastName || ''}` : '—'}
                              </td>
                              <td className="p-3.5 font-mono">
                                {a._count?.items || a.totalItems || 0} шт.
                              </td>
                              <td className="p-3.5 font-mono font-semibold text-emerald-600">
                                {surplus > 0 ? `+${surplus.toFixed(2)}` : '0.00'} TJS
                              </td>
                              <td className="p-3.5 font-mono font-semibold text-rose-600">
                                {shortage > 0 ? `-${shortage.toFixed(2)}` : '0.00'} TJS
                              </td>
                              <td className="p-3.5 font-mono font-bold">
                                <span className={net > 0 ? 'text-emerald-600' : net < 0 ? 'text-rose-600' : 'text-slate-600'}>
                                  {net > 0 ? `+${net.toFixed(2)}` : net.toFixed(2)} TJS
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isCompleted
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                                  }`}
                                >
                                  {isCompleted ? 'Проведена' : 'Черновик'}
                                </span>
                              </td>
                              <td className="p-3.5 text-right space-x-2">
                                <button
                                  onClick={() => openAudit(a.id)}
                                  className="px-2.5 py-1 bg-[#0071e3] text-white hover:bg-[#0077ed] rounded-lg text-xs font-semibold transition-all shadow-xs"
                                >
                                  Открыть
                                </button>
                                <button
                                  onClick={() => printAuditSheet(a)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                                  title="Печать сличительной ведомости"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Active Audit Detail View */
            <div className="space-y-6">
              {/* Back & Title Header */}
              <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
                <button
                  onClick={() => setActiveAudit(null)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold mb-3 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Назад к списку документов
                </button>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-base text-[#1d1d1f]">
                        Сличительная ведомость #{activeAudit.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          activeAudit.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {activeAudit.status === 'completed' ? '✓ Проведена (Остатки обновлены)' : 'Черновик (Режим сверки)'}
                      </span>
                    </div>
                    <p className="text-xs text-[#86868b] mt-1">
                      Склад: <strong className="text-slate-700">{activeAudit.warehouse?.name}</strong> ({activeAudit.warehouse?.address || 'Без адреса'}) • Дата: {new Date(activeAudit.auditDate || activeAudit.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>

                  {/* Top Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => printAuditSheet(activeAudit)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e9e9e7] hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Печать ведомости (A4)</span>
                    </button>
                    {activeAudit.status === 'draft' && (
                      <>
                        <button
                          onClick={handleSaveAuditItems}
                          disabled={savingAudit}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingAudit ? 'Сохранение...' : 'Сохранить факт'}</span>
                        </button>
                        <button
                          onClick={handleCommitAudit}
                          disabled={committingAudit}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{committingAudit ? 'Проведение...' : 'Провести инвентаризацию'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Real-time Audit KPI Cards */}
              {(() => {
                let liveSurplus = 0;
                let liveShortage = 0;
                let liveDiscrepancies = 0;

                (activeAudit.items || []).forEach((item: any) => {
                  const book = Number(item.bookQuantity || 0);
                  const actual = Number(auditActuals[item.productId] !== undefined ? auditActuals[item.productId] : item.actualQuantity || 0);
                  const diff = actual - book;
                  const cost = Number(item.costPrice || 0);
                  const amt = diff * cost;
                  if (amt > 0) {
                    liveSurplus += amt;
                    liveDiscrepancies++;
                  } else if (amt < 0) {
                    liveShortage += Math.abs(amt);
                    liveDiscrepancies++;
                  }
                });

                const liveNet = liveSurplus - liveShortage;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 border border-[#e9e9e7] rounded-xl shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                        Излишки (+)
                      </span>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <span className="text-xl font-bold text-emerald-600 font-mono">
                          +{liveSurplus.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-emerald-600 font-bold">TJS</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 border border-[#e9e9e7] rounded-xl shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider block">
                        Недостачи (-)
                      </span>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <span className="text-xl font-bold text-rose-600 font-mono">
                          -{liveShortage.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-rose-600 font-bold">TJS</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 border border-[#e9e9e7] rounded-xl shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                        Итоговое сальдо
                      </span>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <span className={`text-xl font-bold font-mono ${liveNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {liveNet >= 0 ? `+${liveNet.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : liveNet.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-slate-500 font-bold">TJS</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 border border-[#e9e9e7] rounded-xl shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                        Позиций с расхождением
                      </span>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <span className={`text-xl font-bold font-mono ${liveDiscrepancies > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {liveDiscrepancies}
                        </span>
                        <span className="text-[11px] text-slate-500">из {(activeAudit.items || []).length} товаров</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Products Audit Table */}
              <div className="bg-white border border-[#e9e9e7] rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#e9e9e7] flex justify-between items-center">
                  <span className="font-bold text-xs text-[#1d1d1f]">
                    Номенклатурный перечень и фактический подсчет ({(activeAudit.items || []).length} позиций)
                  </span>
                  {activeAudit.status === 'draft' && (
                    <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Введите фактическое количество товара. Расхождения и суммы пересчитываются моментально.
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#e9e9e7] bg-[#fbfbfa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                        <th className="p-3 w-10 text-center">№</th>
                        <th className="p-3">Артикул</th>
                        <th className="p-3">Наименование товара</th>
                        <th className="p-3">Категория</th>
                        <th className="p-3 text-right">Учет (книжный)</th>
                        <th className="p-3 text-right w-32">Факт (наличие)</th>
                        <th className="p-3 text-right">Расхождение</th>
                        <th className="p-3 text-right">Цена (TJS)</th>
                        <th className="p-3 text-right">Сумма (TJS)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e9e9e7]/70">
                      {(activeAudit.items || []).map((item: any, idx: number) => {
                        const book = Number(item.bookQuantity || 0);
                        const actual = Number(auditActuals[item.productId] !== undefined ? auditActuals[item.productId] : item.actualQuantity || 0);
                        const diff = actual - book;
                        const cost = Number(item.costPrice || 0);
                        const diffAmt = diff * cost;
                        const isDraft = activeAudit.status === 'draft';

                        return (
                          <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${diff !== 0 ? (diff > 0 ? 'bg-emerald-50/20' : 'bg-rose-50/20') : ''}`}>
                            <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="p-3 font-mono font-bold text-slate-700">{item.product?.sku}</td>
                            <td className="p-3">
                              <span className="font-bold text-[#1d1d1f] block">{item.product?.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{item.product?.unit}</span>
                            </td>
                            <td className="p-3 text-slate-500">{item.product?.category?.name || '—'}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800">
                              {book.toFixed(2)}
                            </td>
                            <td className="p-3 text-right">
                              {isDraft ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={auditActuals[item.productId] !== undefined ? auditActuals[item.productId] : actual}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setAuditActuals((prev) => ({ ...prev, [item.productId]: val }));
                                  }}
                                  className="w-24 text-right bg-white border border-[#e9e9e7] rounded-lg px-2 py-1 font-mono font-bold text-xs focus:outline-none focus:border-[#0071e3] shadow-2xs"
                                />
                              ) : (
                                <span className="font-mono font-bold text-slate-900">{actual.toFixed(2)}</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold">
                              {diff === 0 ? (
                                <span className="text-slate-400">0.00</span>
                              ) : (
                                <span className={diff > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                  {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600">
                              {cost.toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold">
                              {diffAmt === 0 ? (
                                <span className="text-slate-400">0.00</span>
                              ) : (
                                <span className={diffAmt > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                  {diffAmt > 0 ? `+${diffAmt.toFixed(2)}` : diffAmt.toFixed(2)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: New Inventory Audit */}
      {showNewAuditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateAudit} className="bg-white border border-[#e9e9e7] rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-[#e9e9e7] pb-3">
              <h4 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#0071e3]" />
                Новая инвентаризация склада
              </h4>
              <button
                type="button"
                onClick={() => setShowNewAuditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-[11px] text-blue-800 space-y-1">
                <p className="font-bold">Как работает инвентаризация:</p>
                <p>
                  Система автоматически зафиксирует текущие учетные остатки всех товаров на выбранном складе в виде сличительной ведомости (книжный учет). Вы сможете внести фактические остатки и провести корректировку остатков в один клик.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Склад для инвентаризации*</label>
                <select
                  required
                  value={newAuditWarehouseId}
                  onChange={(e) => setNewAuditWarehouseId(e.target.value)}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3]"
                >
                  <option value="">Выберите склад</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.address ? `(${w.address})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Заметки / Основание инвентаризации</label>
                <textarea
                  value={newAuditNotes}
                  onChange={(e) => setNewAuditNotes(e.target.value)}
                  rows={2}
                  placeholder="Например, Плановая ежемесячная инвентаризация перед закрытием периода..."
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#e9e9e7]">
              <button
                type="button"
                onClick={() => setShowNewAuditModal(false)}
                className="px-3.5 py-1.5 border border-[#e9e9e7] rounded-lg text-xs font-semibold text-[#6a6a65] hover:bg-[#fbfbfa]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                Создать документ
              </button>
            </div>
          </form>
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
