import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { ShoppingCart, Calendar, CreditCard, Plus, FileText, Scale, Droplet, Printer, Search, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, X, Download, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Smart Filter, Search, Sort & Selection States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'today' | 'on_hold' | 'unpaid' | 'paid' | 'delivered' | 'pending'>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortField, setSortField] = useState<'id' | 'client' | 'salesRep' | 'totalAmount' | 'deliveryDate' | 'createdAt' | 'status'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Filter states
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedRep, setSelectedRep] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState('all');

  // Modal states
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [workZone, setWorkZone] = useState('Сино');
  const [isNewZone, setIsNewZone] = useState(false);
  const [newZoneInput, setNewZoneInput] = useState('');
  const [contract, setContract] = useState('Договор №1');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number; price: number }[]>([]);
  const [printOrder, setPrintOrder] = useState<any>(null);

  // Loading sheet states
  const [showLoadingSheetModal, setShowLoadingSheetModal] = useState(false);
  const [selectedDriverForLoadingSheet, setSelectedDriverForLoadingSheet] = useState('');
  const [selectedDateForLoadingSheet, setSelectedDateForLoadingSheet] = useState(new Date().toISOString().substring(0, 10));

  // Columns visibility customizer
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['id', 'client', 'salesRep', 'workZone', 'contract', 'totalAmount', 'deliveryDate', 'paymentStatus', 'status', 'deliveryDriverId']);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [tableDensity, setTableDensity] = useState<'comfortable' | 'compact'>(() => {
    return (localStorage.getItem('orders_table_density') as 'comfortable' | 'compact') || 'comfortable';
  });

  const exportToCsv = () => {
    const headers = ['ID Заказа', 'Клиент', 'Агент', 'Рабочая зона', 'Договор', 'Сумма (TJS)', 'Дата доставки', 'Оплата', 'Статус', 'Водитель'];
    const rowsCsv = filteredOrders.map((o: any) => {
      const driver = users.find(u => u.id === o.deliveryDriverId);
      return [
        o.id.toUpperCase(),
        o.client?.name || '—',
        `${o.salesRep?.firstName || ''} ${o.salesRep?.lastName || ''}`,
        o.workZone || '—',
        o.contract || '—',
        o.totalAmount,
        o.deliveryDate ? o.deliveryDate.substring(0, 10) : '—',
        o.paymentStatus === 'paid' ? 'Оплачен' : 'Не оплачен',
        o.status,
        driver ? `${driver.firstName} ${driver.lastName}` : 'Не назначен'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(';'), ...rowsCsv.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateLoadingSheetData = () => {
    const filtered = orders.filter((o: any) => {
      const orderDateStr = o.createdAt ? o.createdAt.substring(0, 10) : '';
      const driverMatches = o.deliveryDriverId === selectedDriverForLoadingSheet;
      const dateMatches = orderDateStr === selectedDateForLoadingSheet;
      return driverMatches && dateMatches;
    });

    const totals: { [productId: string]: { name: string; sku: string; qty: number; unit: string } } = {};
    filtered.forEach((o: any) => {
      const items = o.items || [];
      items.forEach((item: any) => {
        const prod = item.product || {};
        const pId = prod.id || item.productId;
        const qty = parseFloat(item.quantity) || 0;
        if (totals[pId]) {
          totals[pId].qty += qty;
        } else {
          totals[pId] = {
            name: prod.name || 'Товар',
            sku: prod.sku || '—',
            qty,
            unit: prod.unit || 'шт',
          };
        }
      });
    });

    return Object.values(totals);
  };

  const loadData = async () => {
    try {
      const [ordRes, cliRes, prodRes, userRes] = await Promise.all([
        api.get('/orders').catch(() => ({ data: [] })),
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/catalog/products').catch(() => ({ data: [] })),
        api.get('/users').catch(() => ({ data: [] })),
      ]);
      setOrders(ordRes.data);
      setClients(cliRes.data);
      setProducts(prodRes.data);
      setUsers(userRes.data);
    } catch (err) {
      console.error('Failed to load orders data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Dynamic price category pricing when selectedClient changes
  useEffect(() => {
    if (!selectedClient) {
      api.get('/catalog/products').then((res) => setProducts(res.data)).catch(() => {});
      return;
    }
    api
      .get(`/catalog/products?clientId=${selectedClient}`)
      .then((res) => {
        setProducts(res.data);
        setOrderItems((prev) =>
          prev.map((item) => {
            if (!item.productId) return item;
            const matched = res.data.find((p: any) => p.id === item.productId);
            return matched ? { ...item, price: parseFloat(matched.price) } : item;
          })
        );
      })
      .catch((err) => console.error('Failed to load products for client', err));
  }, [selectedClient]);

  const handleAddItem = () => {
    setOrderItems([...orderItems, { productId: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...orderItems];
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
    setOrderItems(updated);
  };

  const closeForm = () => {
    setShowAddForm(false);
    setSelectedClient('');
    setDeliveryDate('');
    setNotes('');
    setOrderItems([]);
    setIsNewZone(false);
    setNewZoneInput('');
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totalAmount = orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
      
      const noteDetails = JSON.stringify({
        contract,
        workZone,
        userNotes: notes,
      });

      const clientObj = clients.find(c => c.id === selectedClient);
      if (clientObj?.status === 'blocked') {
        alert('Ошибка: Торговая точка находится в СТОП-ЛИСТЕ. Создание заказа заблокировано коммерческой политикой.');
        return;
      }

      await api.post('/orders', {
        clientId: selectedClient,
        totalAmount,
        notes: noteDetails,
        deliveryDate: deliveryDate || new Date().toISOString(),
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
      });

      closeForm();
      loadData();
    } catch (err: any) {
      console.error('Failed to create order', err);
      alert(err.response?.data?.message || 'Ошибка при создании заказа.');
    }
  };

  const handleApproveHold = async (orderId: string) => {
    if (!window.confirm('Одобрить данный заблокированный заказ (Hold)?')) return;
    try {
      await api.post(`/orders/${orderId}/approve-hold`);
      alert('Заказ успешно одобрен!');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка при одобрении заказа');
    }
  };

  const handleRejectHold = async (orderId: string) => {
    const reason = window.prompt('Укажите причину отклонения заказа:');
    if (!reason) return;
    try {
      await api.post(`/orders/${orderId}/reject-hold`, { reason });
      alert('Заказ отклонен.');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка при отклонении заказа');
    }
  };

  const handlePrintTorg12 = async (orderId: string) => {
    try {
      const res = await api.get(`/documents/order/${orderId}/torg12`, { responseType: 'text' });
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(res.data);
        win.document.close();
        win.print();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка при получении ТОРГ-12');
    }
  };

  const parseOrderDetails = (order: any) => {
    try {
      if (order.notes && order.notes.startsWith('{')) {
        const parsed = JSON.parse(order.notes);
        return {
          workZone: parsed.workZone || 'Сино',
          contract: parsed.contract || 'Договор №1',
          userNotes: parsed.userNotes || '',
        };
      }
    } catch (e) {}
    const mockZones = ['Сино', 'Фирдавси', 'И. Сомони', 'Шохмансур', 'Худжанд'];
    const mockContracts = ['Договор №1', 'Договор №2'];
    const seed = order.id.charCodeAt(0) + order.id.charCodeAt(1);
    return {
      workZone: mockZones[seed % mockZones.length],
      contract: mockContracts[seed % mockContracts.length],
      userNotes: order.notes || '',
    };
  };

  const processedOrders = orders.map((o) => {
    const { workZone, contract, userNotes } = parseOrderDetails(o);
    return {
      ...o,
      workZone,
      contract,
      userNotes,
    };
  });

  // Collect unique work zones dynamically from database orders
  const dynamicZones = Array.from(new Set(processedOrders.map((o) => o.workZone))).filter(Boolean);
  const defaultPresets = ['Сино', 'Фирдавси', 'И. Сомони', 'Шохмансур', 'Худжанд'];
  const allZones = Array.from(new Set([...defaultPresets, ...dynamicZones]));

  // Dynamic counts for status chips
  const todayStr = new Date().toISOString().substring(0, 10);
  const onHoldCount = useMemo(() => processedOrders.filter(o => o.status === 'on_hold' || o.status === 'hold').length, [processedOrders]);
  const unpaidCount = useMemo(() => processedOrders.filter(o => o.paymentStatus !== 'paid').length, [processedOrders]);
  const deliveredCount = useMemo(() => processedOrders.filter(o => o.status === 'delivered').length, [processedOrders]);
  const todayCount = useMemo(() => processedOrders.filter(o => (o.createdAt || '').substring(0, 10) === todayStr).length, [processedOrders, todayStr]);

  // Apply filters & search dynamically with useMemo
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const weekAgo = today - 7 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return processedOrders.filter((o) => {
      // 1. Text Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const idMatch = (o.id || '').toLowerCase().includes(q);
        const clientMatch = (o.client?.name || '').toLowerCase().includes(q);
        const phoneMatch = (o.client?.phone || '').toLowerCase().includes(q);
        const addressMatch = (o.client?.address || '').toLowerCase().includes(q);
        const repMatch = `${o.salesRep?.firstName || ''} ${o.salesRep?.lastName || ''}`.toLowerCase().includes(q);
        const notesMatch = (o.userNotes || o.notes || '').toLowerCase().includes(q);
        const zoneMatch = (o.workZone || '').toLowerCase().includes(q);

        if (!idMatch && !clientMatch && !phoneMatch && !addressMatch && !repMatch && !notesMatch && !zoneMatch) {
          return false;
        }
      }

      // 2. Status Chip Filter
      if (statusFilter === 'today') {
        if ((o.createdAt || '').substring(0, 10) !== todayStr) return false;
      } else if (statusFilter === 'on_hold') {
        if (o.status !== 'on_hold' && o.status !== 'hold') return false;
      } else if (statusFilter === 'unpaid') {
        if (o.paymentStatus === 'paid') return false;
      } else if (statusFilter === 'paid') {
        if (o.paymentStatus !== 'paid') return false;
      } else if (statusFilter === 'delivered') {
        if (o.status !== 'delivered') return false;
      } else if (statusFilter === 'pending') {
        if (o.status !== 'pending' && o.status !== 'approved') return false;
      }

      // 3. Date Presets Filter
      if (datePreset !== 'all') {
        const orderTime = new Date(o.createdAt || o.deliveryDate).getTime();
        if (datePreset === 'today') {
          if (orderTime < today) return false;
        } else if (datePreset === 'yesterday') {
          if (orderTime < yesterday || orderTime >= today) return false;
        } else if (datePreset === 'week') {
          if (orderTime < weekAgo) return false;
        } else if (datePreset === 'month') {
          if (orderTime < monthStart) return false;
        } else if (datePreset === 'custom') {
          if (customStartDate && (o.createdAt || '').substring(0, 10) < customStartDate) return false;
          if (customEndDate && (o.createdAt || '').substring(0, 10) > customEndDate) return false;
        }
      }

      // 4. Dropdown Filters
      const matchZone = selectedZone === 'all' || o.workZone === selectedZone;
      const matchRep = selectedRep === 'all' || o.salesRepId === selectedRep;
      const matchPayment = selectedPayment === 'all' || o.paymentStatus === selectedPayment;

      return matchZone && matchRep && matchPayment;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'totalAmount') {
        valA = parseFloat(valA || 0);
        valB = parseFloat(valB || 0);
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'deliveryDate' || sortField === 'createdAt') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'client') {
        valA = (a.client?.name || '').toLowerCase();
        valB = (b.client?.name || '').toLowerCase();
      } else if (sortField === 'salesRep') {
        valA = `${a.salesRep?.firstName || ''} ${a.salesRep?.lastName || ''}`.toLowerCase();
        valB = `${b.salesRep?.firstName || ''} ${b.salesRep?.lastName || ''}`.toLowerCase();
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processedOrders, searchTerm, statusFilter, datePreset, customStartDate, customEndDate, selectedZone, selectedRep, selectedPayment, sortField, sortDirection, todayStr]);

  const toggleOrderSort = (field: 'id' | 'client' | 'salesRep' | 'totalAmount' | 'deliveryDate' | 'createdAt' | 'status') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'totalAmount' || field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const toggleSelectAllOrders = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const totalAmountSum = filteredOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount.toString()), 0);
  const totalDeals = filteredOrders.length;
  const totalWeight = Math.round(totalAmountSum * 0.15);
  const totalVolume = Math.round(totalAmountSum * 0.11);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="w-8 h-8 border-4 border-slate-200 border-t-[#37352f] rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-[#37352f]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
        <div>
          <h3 className="font-bold text-[#1d1d1f] text-base flex items-center gap-1.5">
            <ShoppingCart className="w-4.5 h-4.5 text-[#37352f]" />
            Заказы и Продажи
          </h3>
          <p className="text-[11px] text-[#86868b] mt-0.5">
            Отслеживание заказов клиентов, рабочих зон дистрибуции и статусов оплат в реальном времени
          </p>
        </div>
        <div className="flex gap-2 flex-wrap no-print">
          <button
            type="button"
            onClick={() => setShowLoadingSheetModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e9e9e7] hover:bg-[#f5f5f7] text-[#515154] rounded-lg font-semibold text-xs transition-all bg-white"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Лист погрузки</span>
          </button>

          <button
            type="button"
            onClick={exportToCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e9e9e7] hover:bg-[#f5f5f7] text-[#515154] rounded-lg font-semibold text-xs transition-all bg-white"
          >
            <span>Экспорт в Excel</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e9e9e7] hover:bg-[#f5f5f7] text-[#515154] rounded-lg font-semibold text-xs transition-all bg-white"
            >
              <span>Колонки</span>
            </button>

            {showColumnCustomizer && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#e9e9e7] rounded-xl shadow-lg z-30 p-3 space-y-2 text-xs">
                <span className="font-bold text-[#86868b] text-[10px] uppercase tracking-wider block border-b pb-1">Показ колонок</span>
                {[
                  { id: 'id', label: 'ID Заказа' },
                  { id: 'client', label: 'Клиент' },
                  { id: 'salesRep', label: 'Агент' },
                  { id: 'workZone', label: 'Зона' },
                  { id: 'contract', label: 'Договор' },
                  { id: 'totalAmount', label: 'Сумма' },
                  { id: 'deliveryDate', label: 'Дата дост.' },
                  { id: 'paymentStatus', label: 'Оплата' },
                  { id: 'status', label: 'Статус' },
                  { id: 'deliveryDriverId', label: 'Водитель' },
                ].map((col) => (
                  <label key={col.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.id)}
                      onChange={() => {
                        if (visibleColumns.includes(col.id)) {
                          setVisibleColumns(visibleColumns.filter(c => c !== col.id));
                        } else {
                          setVisibleColumns([...visibleColumns, col.id]);
                        }
                      }}
                      className="rounded text-[#0071e3]"
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              const next = tableDensity === 'comfortable' ? 'compact' : 'comfortable';
              setTableDensity(next);
              localStorage.setItem('orders_table_density', next);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg font-semibold text-xs transition-all shadow-sm ${
              tableDensity === 'compact'
                ? 'bg-blue-50 border-blue-200 text-[#0071e3]'
                : 'border-[#e9e9e7] hover:bg-[#fbfbfa] text-[#6a6a65]'
            }`}
            title={tableDensity === 'comfortable' ? 'Включить компактный режим таблицы (для ноутбуков)' : 'Включить стандартный режим таблицы'}
          >
            <span>{tableDensity === 'compact' ? '⚡ Компактно' : 'Обычный вид'}</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Новый заказ</span>
          </button>
        </div>
      </div>

      {/* Smart Search & Filter Control Center */}
      <div className="space-y-3 no-print">
        {/* Search & Top Action Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 border border-[#e9e9e7] rounded-xl shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск заказа по номеру, клиенту, телефону, адресу, агенту или примечанию..."
              className="w-full pl-9 pr-8 py-2 bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg text-xs text-[#1d1d1f] placeholder:text-slate-400 focus:outline-none focus:border-[#0071e3] transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                title="Очистить поиск"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown Filters Group */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Zone Filter */}
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="px-2.5 py-2 bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg text-xs text-[#37352f] focus:outline-none focus:border-[#0071e3]"
            >
              <option value="all">Все зоны</option>
              {allZones.map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>

            {/* Rep Filter */}
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="px-2.5 py-2 bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg text-xs text-[#37352f] focus:outline-none focus:border-[#0071e3]"
            >
              <option value="all">Все агенты</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>

            {/* Date Preset Selector */}
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
              className="px-2.5 py-2 bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg text-xs text-[#37352f] focus:outline-none focus:border-[#0071e3] font-medium"
            >
              <option value="all">За все время</option>
              <option value="today">За сегодня</option>
              <option value="yesterday">За вчера</option>
              <option value="week">За 7 дней</option>
              <option value="month">За этот месяц</option>
              <option value="custom">Указать даты...</option>
            </select>

            {datePreset === 'custom' && (
              <div className="flex items-center gap-1.5 animate-fadeIn">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1.5 bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg text-xs text-[#37352f]"
                />
                <span className="text-xs text-slate-400">—</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1.5 bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg text-xs text-[#37352f]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Status Filter Badges (Chips) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-[#1d1d1f] dark:bg-white dark:text-slate-900 text-white shadow-sm'
                  : 'bg-white dark:bg-[#111113] hover:bg-slate-100 dark:hover:bg-[#1a1a1e] text-slate-600 dark:text-slate-300 border border-[#e9e9e7] dark:border-[#27272a]'
              }`}
            >
              Все заказы ({processedOrders.length})
            </button>

            <button
              onClick={() => setStatusFilter('today')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'today'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Сегодня</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                statusFilter === 'today'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              }`}>
                {todayCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('on_hold')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'on_hold'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>На удержании (Hold)</span>
              {onHoldCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  statusFilter === 'on_hold'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}>
                  {onHoldCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'unpaid'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Неоплаченные</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                statusFilter === 'unpaid'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
              }`}>
                {unpaidCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('delivered')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'delivered'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Доставленные ({deliveredCount})</span>
            </button>
          </div>

          <div className="text-[11px] text-[#86868b] font-medium">
            Найдено: <span className="font-bold text-[#1d1d1f]">{filteredOrders.length}</span> из {processedOrders.length}
          </div>
        </div>

        {/* Bulk Actions Bar for Orders */}
        {selectedOrderIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl shadow-md animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 bg-white/20 text-xs font-bold rounded-md">
                {selectedOrderIds.length}
              </span>
              <span className="text-xs font-medium">заказов выбрано</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const selectedItems = filteredOrders.filter(o => selectedOrderIds.includes(o.id));
                  const headers = ['ID Заказа', 'Клиент', 'Агент', 'Рабочая зона', 'Договор', 'Сумма (TJS)', 'Дата доставки', 'Оплата', 'Статус'];
                  const rows = selectedItems.map(o => [
                    o.id.slice(0, 8).toUpperCase(),
                    o.client?.name || '—',
                    `${o.salesRep?.firstName || ''} ${o.salesRep?.lastName || ''}`,
                    o.workZone || '—',
                    o.contract || '—',
                    o.totalAmount,
                    o.deliveryDate ? o.deliveryDate.substring(0, 10) : '—',
                    o.paymentStatus === 'paid' ? 'Оплачен' : 'Не оплачен',
                    o.status
                  ]);
                  const csvContent = "data:text/csv;charset=utf-8,﻿" + [headers.join(';'), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `selected_orders_${new Date().toISOString().substring(0, 10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Выгрузить ({selectedOrderIds.length}) в Excel</span>
              </button>
              <button
                onClick={() => setSelectedOrderIds([])}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Снять выбор
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Creation Wizard */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateOrder} className="bg-white border border-[#e9e9e7] rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#e9e9e7] pb-3">
              <h4 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#0071e3]" />
                Оформление нового заказа
              </h4>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-[#86868b] hover:text-[#37352f] font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block border-b border-[#e9e9e7] pb-1">
                Шаг 1: Основное
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6a65]">Рабочая зона*</label>
                  <select
                    value={isNewZone ? 'add_new' : workZone}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'add_new') {
                        setIsNewZone(true);
                        setWorkZone(newZoneInput);
                      } else {
                        setIsNewZone(false);
                        setWorkZone(val);
                      }
                    }}
                    className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] cursor-pointer"
                  >
                    {allZones.map((zone) => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                    <option value="add_new">+ Добавить новую зону...</option>
                  </select>
                  {isNewZone && (
                    <input
                      type="text"
                      placeholder="Название новой зоны*"
                      required
                      value={newZoneInput}
                      onChange={(e) => {
                        setNewZoneInput(e.target.value);
                        setWorkZone(e.target.value);
                      }}
                      className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] mt-2 placeholder-slate-400"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6a65]">Договор*</label>
                  <select
                    value={contract}
                    onChange={(e) => setContract(e.target.value)}
                    className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3]"
                  >
                    <option value="Договор №1">Договор №1 (Предоплата)</option>
                    <option value="Договор №2">Договор №2 (Консигнация)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6a65]">Клиент (Торговая точка)*</label>
                  <select
                    required
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3]"
                  >
                    <option value="">Выберите клиента...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6a65]">Дата доставки (отгрузки)*</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f]"
                  />
                </div>
              </div>

              {/* Real-time Client Credit & Stop-list Status */}
              {(() => {
                const clientObj = clients.find(c => c.id === selectedClient);
                if (!clientObj) return null;
                if (clientObj.status === 'blocked') {
                  return (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-fadeIn">
                      <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">⚠️ ВНИМАНИЕ: Клиент находится в СТОП-ЛИСТЕ!</div>
                        <div className="text-[11px] mt-0.5">
                          Отгрузка данному магазину заблокирована руководством из-за просроченной задолженности ({Number(clientObj.currentDebt || 0).toFixed(2)} TJS).
                          Создание накладной заблокировано до погашения долга.
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900">Кредитный контроль:</span>
                      <span className="ml-2 font-mono">Долг: <strong className="text-rose-600">{Number(clientObj.currentDebt || 0).toFixed(2)} TJS</strong></span>
                      <span className="ml-2 font-mono">/ Лимит: <strong className="text-emerald-700">{Number(clientObj.creditLimit || 0) > 0 ? `${Number(clientObj.creditLimit).toFixed(2)} TJS` : 'Без ограничений'}</strong></span>
                    </div>
                    {Number(clientObj.creditLimit || 0) > 0 && Number(clientObj.currentDebt || 0) > Number(clientObj.creditLimit || 0) && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                        Превышен кредитный лимит (Заказ уйдет на Hold)
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-[#e9e9e7] pb-1">
                <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                  Шаг 2: Спецификация товаров
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-[10px] font-bold text-[#0071e3] hover:underline"
                >
                  + Добавить товар
                </button>
              </div>

              {orderItems.length === 0 ? (
                <p className="text-xs text-[#86868b] italic py-2">Спецификация пуста. Добавьте хотя бы один товар.</p>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        className="flex-1 bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none text-[#37352f]"
                      >
                        <option value="">Выберите продукт...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — {parseFloat(p.price || 0).toFixed(2)} TJS{p.customPriceApplied ? ' 🏷️ (Спецпрайс)' : ''}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        placeholder="Кол-во"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20 bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                      />

                      <input
                        type="number"
                        placeholder="Цена"
                        step="any"
                        required
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none font-mono"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-rose-600 hover:text-rose-700 font-bold text-xs px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6a6a65]">Примечания</label>
              <textarea
                placeholder="Дополнительные комментарии к заказу..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] h-16 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#e9e9e7]">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 border border-[#e9e9e7] rounded-lg text-xs font-semibold text-[#6a6a65] hover:bg-[#fbfbfa]"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={orderItems.length === 0 || !selectedClient || clients.find(c => c.id === selectedClient)?.status === 'blocked'}
                className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {clients.find(c => c.id === selectedClient)?.status === 'blocked' ? 'Отгрузка запрещена (Стоп-лист)' : 'Создать заказ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white border border-[#e9e9e7] rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b border-[#e9e9e7] bg-[#fbfbfa] font-bold text-[#86868b] uppercase tracking-wider select-none ${
              tableDensity === 'compact' ? 'text-[9px]' : 'text-[10px]'
            }`}>
              <th className="p-3 w-8 text-center no-print">
                <input
                  type="checkbox"
                  checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                  onChange={toggleSelectAllOrders}
                  className="rounded border-slate-300 text-[#0071e3] focus:ring-0 cursor-pointer"
                  title="Выбрать все заказы"
                />
              </th>
              {visibleColumns.includes('id') && (
                <th onClick={() => toggleOrderSort('id')} className={`${tableDensity === 'compact' ? 'py-2 px-2' : 'p-3'} cursor-pointer hover:text-[#1d1d1f] transition-colors`}>
                  <div className="flex items-center gap-1">
                    <span>ID</span>
                    {sortField === 'id' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#0071e3]" /> : <ArrowDown className="w-3 h-3 text-[#0071e3]" />)}
                  </div>
                </th>
              )}
              {visibleColumns.includes('client') && (
                <th onClick={() => toggleOrderSort('client')} className={`${tableDensity === 'compact' ? 'py-2 px-2' : 'p-3'} cursor-pointer hover:text-[#1d1d1f] transition-colors`}>
                  <div className="flex items-center gap-1">
                    <span>Клиент</span>
                    {sortField === 'client' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#0071e3]" /> : <ArrowDown className="w-3 h-3 text-[#0071e3]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.includes('salesRep') && (
                <th onClick={() => toggleOrderSort('salesRep')} className={`${tableDensity === 'compact' ? 'py-2 px-2' : 'p-3'} cursor-pointer hover:text-[#1d1d1f] transition-colors`}>
                  <div className="flex items-center gap-1">
                    <span>Агент</span>
                    {sortField === 'salesRep' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#0071e3]" /> : <ArrowDown className="w-3 h-3 text-[#0071e3]" />)}
                  </div>
                </th>
              )}
              {visibleColumns.includes('workZone') && <th className={tableDensity === 'compact' ? 'py-2 px-2.5' : 'p-3.5'}>Рабочая зона</th>}
              {visibleColumns.includes('contract') && <th className={tableDensity === 'compact' ? 'py-2 px-2.5' : 'p-3.5'}>Договор</th>}
              {visibleColumns.includes('totalAmount') && (
                <th onClick={() => toggleOrderSort('totalAmount')} className={`${tableDensity === 'compact' ? 'py-2 px-2' : 'p-3'} cursor-pointer hover:text-[#1d1d1f] transition-colors`}>
                  <div className="flex items-center gap-1 text-emerald-700">
                    <span>Сумма</span>
                    {sortField === 'totalAmount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-700" /> : <ArrowDown className="w-3 h-3 text-emerald-700" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-emerald-300" />
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.includes('deliveryDate') && (
                <th onClick={() => toggleOrderSort('deliveryDate')} className={`${tableDensity === 'compact' ? 'py-2 px-2' : 'p-3'} cursor-pointer hover:text-[#1d1d1f] transition-colors`}>
                  <div className="flex items-center gap-1">
                    <span>Доставка</span>
                    {sortField === 'deliveryDate' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#0071e3]" /> : <ArrowDown className="w-3 h-3 text-[#0071e3]" />)}
                  </div>
                </th>
              )}
              {visibleColumns.includes('paymentStatus') && <th className={tableDensity === 'compact' ? 'py-2 px-2.5' : 'p-3.5'}>Оплата</th>}
              {visibleColumns.includes('status') && (
                <th onClick={() => toggleOrderSort('status')} className={`${tableDensity === 'compact' ? 'py-2 px-2' : 'p-3'} cursor-pointer hover:text-[#1d1d1f] transition-colors`}>
                  <div className="flex items-center gap-1">
                    <span>Статус</span>
                    {sortField === 'status' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#0071e3]" /> : <ArrowDown className="w-3 h-3 text-[#0071e3]" />)}
                  </div>
                </th>
              )}
              {visibleColumns.includes('deliveryDriverId') && <th className={tableDensity === 'compact' ? 'py-2 px-2.5' : 'p-3.5'}>Водитель</th>}
              <th className={`${tableDensity === 'compact' ? 'py-2 px-2.5' : 'p-3.5'} text-right no-print`}>Действия</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-[#e9e9e7]/60 ${tableDensity === 'compact' ? 'text-[11px]' : 'text-xs'}`}>
            {loading ? (
              Array.from({ length: 7 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {visibleColumns.map((col) => (
                    <td key={col} className={tableDensity === 'compact' ? 'py-2 px-2.5' : 'p-3.5'}>
                      <div className="h-4 bg-slate-200/80 rounded w-4/5"></div>
                    </td>
                  ))}
                  <td className={`${tableDensity === 'compact' ? 'py-2 px-2.5' : 'p-3.5'} text-right`}>
                    <div className="h-6 bg-slate-200/80 rounded w-16 ml-auto"></div>
                  </td>
                </tr>
              ))
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-[#1d1d1f]">Заказы не найдены</div>
                      <div className="text-xs text-[#86868b]">Попробуйте изменить поисковый запрос, статус или диапазон дат</div>
                    </div>
                    {(searchTerm || statusFilter !== 'all' || datePreset !== 'all' || selectedZone !== 'all' || selectedRep !== 'all' || selectedPayment !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('all');
                          setDatePreset('all');
                          setSelectedZone('all');
                          setSelectedRep('all');
                          setSelectedPayment('all');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg text-xs font-semibold transition-colors mt-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Сбросить все фильтры</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map((item) => {
                const isOrderChecked = selectedOrderIds.includes(item.id);
                return (
                <tr key={item.id} className={`transition-colors ${isOrderChecked ? 'bg-blue-50/60' : 'hover:bg-[#fbfbfa]'}`}>
                  <td className="p-3 text-center no-print">
                    <input
                      type="checkbox"
                      checked={isOrderChecked}
                      onChange={() => toggleSelectOrder(item.id)}
                      className="rounded border-slate-300 text-[#0071e3] focus:ring-0 cursor-pointer"
                    />
                  </td>
                  {visibleColumns.includes('id') && (
                    <td className={`${tableDensity === 'compact' ? 'py-1.5 px-2.5' : 'p-3.5'} font-bold text-[#6a6a65] font-mono`}>
                      {item.id.slice(0, 8).toUpperCase()}
                    </td>
                  )}
                  {visibleColumns.includes('client') && (
                    <td className={`${tableDensity === 'compact' ? 'py-1.5 px-2.5' : 'p-3.5'} font-bold text-[#37352f]`}>
                      {item.client?.name || 'Магазин'}
                    </td>
                  )}
                  {visibleColumns.includes('salesRep') && (
                    <td className={`${tableDensity === 'compact' ? 'py-1.5 px-2.5' : 'p-3.5'} text-[#6a6a65]`}>
                      {item.salesRep?.firstName} {item.salesRep?.lastName}
                    </td>
                  )}
                  {visibleColumns.includes('workZone') && (
                    <td className={tableDensity === 'compact' ? 'py-1.5 px-2.5' : 'p-3.5'}>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[#6a6a65] text-[10px] font-medium">
                        {item.workZone}
                      </span>
                    </td>
                  )}
                  {visibleColumns.includes('contract') && (
                    <td className={`${tableDensity === 'compact' ? 'py-1.5 px-2.5' : 'p-3.5'} text-[#6a6a65]`}>
                      {item.contract}
                    </td>
                  )}
                  {visibleColumns.includes('totalAmount') && (
                    <td className={`${tableDensity === 'compact' ? 'py-1.5 px-2.5' : 'p-3.5'} text-emerald-700 font-bold font-mono`}>
                      {parseFloat(item.totalAmount.toString()).toFixed(2)} TJS
                    </td>
                  )}
                  {visibleColumns.includes('deliveryDate') && (
                    <td className={`${tableDensity === 'compact' ? 'py-1.5 px-2.5' : 'p-3.5'} text-[#37352f]`}>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#0071e3]" />
                        <span>{new Date(item.deliveryDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.includes('paymentStatus') && (
                    <td className={tableDensity === 'compact' ? 'py-1.5 px-2.5' : 'p-3.5'}>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[9px] ${
                        item.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        <CreditCard className="w-3 h-3" />
                        {item.paymentStatus === 'paid' ? 'Оплачен' : 'Не оплачен'}
                      </span>
                    </td>
                  )}
                  {visibleColumns.includes('status') && (
                    <td className={tableDensity === 'compact' ? 'py-1.5 px-2.5' : 'p-3.5'}>
                      {(() => {
                        switch (item.status) {
                          case 'approved':
                            return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Одобрен</span>;
                          case 'assembling':
                            return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">На сборке</span>;
                          case 'assembled':
                            return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Собран</span>;
                          case 'shipped':
                            return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200">В пути</span>;
                          case 'delivered':
                            return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Доставлен</span>;
                          case 'cancelled':
                            return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Отменен</span>;
                          case 'on_hold':
                          case 'hold':
                            return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">На проверке</span>;
                          case 'pending':
                          default:
                            return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Новый</span>;
                        }
                      })()}
                    </td>
                  )}
                  {visibleColumns.includes('deliveryDriverId') && (
                    <td className={tableDensity === 'compact' ? 'py-1.5 px-2.5' : 'p-3.5'}>
                      {['pending', 'approved', 'assembling', 'assembled'].includes(item.status) ? (
                        <select
                          value={item.deliveryDriverId || ''}
                          onChange={async (e) => {
                            try {
                              await api.patch(`/orders/${item.id}/assign-driver`, {
                                driverId: e.target.value || null
                              });
                              loadData();
                            } catch (err) {
                              console.error(err);
                              alert('Не удалось назначить водителя');
                            }
                          }}
                          className="bg-[#fbfbfa] border border-[#e9e9e7] rounded p-1 text-[10px] text-[#37352f]"
                        >
                          <option value="">Назначить водителя...</option>
                          {users.filter(u => u.role === 'DELIVERY_MAN' || u.role === 'DELIVERY_DRIVER').map(u => (
                            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {item.deliveryDriver ? `${item.deliveryDriver.firstName} ${item.deliveryDriver.lastName}` : '—'}
                        </span>
                      )}
                    </td>
                  )}
                  <td className={`${tableDensity === 'compact' ? 'py-1.5 px-2.5' : 'p-3.5'} text-right`}>

                    <div className="flex items-center justify-end gap-1.5">
                      {item.status === 'hold' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApproveHold(item.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-all shadow-sm"
                            title="Одобрить заблокированный заказ"
                          >
                            ✅ Hold
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectHold(item.id)}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-all shadow-sm"
                            title="Отклонить заблокированный заказ"
                          >
                            ❌ Hold
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setPrintOrder(item)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-[#0071e3] hover:text-white rounded border border-[#e9e9e7] text-[#515154] text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Накладная</span>
                      </button>
                      <button
                        onClick={() => handlePrintTorg12(item.id)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded border border-blue-200 text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm"
                        title="Печать бухгалтерской ТОРГ-12"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>ТОРГ-12</span>
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Aggregates Summary Bar */}
        <div className="bg-[#fbfbfa] border-t border-[#e9e9e7] px-6 py-4 flex flex-wrap justify-between items-center gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#86868b]" />
              <span className="text-[#86868b]">Сделок:</span>
              <strong className="text-[#1d1d1f] font-mono">{totalDeals}</strong>
            </div>

            <div className="flex items-center gap-1.5 border-l border-[#e9e9e7] pl-4">
              <Scale className="w-4 h-4 text-[#86868b]" />
              <span className="text-[#86868b]">Вес:</span>
              <strong className="text-[#1d1d1f] font-mono">{totalWeight} кг</strong>
            </div>

            <div className="flex items-center gap-1.5 border-l border-[#e9e9e7] pl-4">
              <Droplet className="w-4 h-4 text-[#86868b]" />
              <span className="text-[#86868b]">Объем:</span>
              <strong className="text-[#1d1d1f] font-mono">{totalVolume} л</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-4">
            <span className="text-[#86868b] font-bold">ИТОГО К ВЫПЛАТЕ / СУММА:</span>
            <span className="text-base font-bold text-emerald-700 font-mono">
              {totalAmountSum.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} TJS
            </span>
          </div>
        </div>
      </div>
      
      {/* Printable Waybill Sheet Modal */}
      {printOrder && (() => {
        const order = printOrder;
        const client = clients.find(c => c.id === order.clientId) || order.client || {};
        const driver = users.find(u => u.id === order.deliveryDriverId) || order.deliveryDriver || null;
        const rep = users.find(u => u.id === order.salesRepId) || order.salesRep || {};

        const items = order.items || [];
        
        let totalBaseAmount = 0;
        let totalDiscountedAmount = 0;
        let totalQty = 0;

        const rows = items.map((itm: any, idx: number) => {
          const prod = products.find(p => p.id === itm.productId) || itm.product || {};
          const qty = Number(itm.quantity || 0);
          const basePrice = Number(prod.price || itm.price || 0);
          const discountedPrice = Number(itm.price || basePrice);
          
          const itemBaseTotal = qty * basePrice;
          const itemDiscountedTotal = qty * discountedPrice;
          
          totalBaseAmount += itemBaseTotal;
          totalDiscountedAmount += itemDiscountedTotal;
          totalQty += qty;

          let discountPercent = 0;
          if (basePrice > 0 && discountedPrice < basePrice) {
            discountPercent = ((basePrice - discountedPrice) / basePrice) * 100;
          }

          return {
            idx: idx + 1,
            name: prod.name || 'Товар',
            sku: prod.sku || '',
            qty,
            basePrice,
            itemBaseTotal,
            discountPercent,
            discountedPrice,
            itemDiscountedTotal
          };
        });

        const totalDiscountAmount = totalBaseAmount - totalDiscountedAmount;

        // Debt calculations
        const clientCurrentDebt = Number(client.currentDebt || 0);
        const orderAmount = Number(order.totalAmount || totalDiscountedAmount);
        const startDebt = Math.max(0, clientCurrentDebt - orderAmount);
        const endDebt = clientCurrentDebt;

        const formattedDate = new Date(order.createdAt).toLocaleDateString('ru-RU');

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
            <div className="bg-white border border-[#e9e9e7] rounded-xl max-w-4xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
              
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #waybill-print-modal, #waybill-print-modal * {
                    visibility: visible;
                  }
                  #waybill-print-modal {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 0;
                    margin: 0;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}</style>

              <div className="flex justify-between items-center border-b border-[#e9e9e7] pb-3 mb-4">
                <span className="text-xs font-bold text-[#86868b]">Предварительный просмотр печатной формы</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Распечатать (Ctrl + P)</span>
                  </button>
                  <button
                    onClick={() => setPrintOrder(null)}
                    className="px-3.5 py-1.5 border border-[#e9e9e7] hover:bg-[#f5f5f7] text-[#515154] rounded-lg font-semibold text-xs transition-all"
                  >
                    Закрыть
                  </button>
                </div>
              </div>

              <div id="waybill-print-modal" className="bg-white p-8 text-black font-sans leading-tight text-[11px]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div>Экспедитор: {driver ? `${driver.firstName} ${driver.lastName}` : 'Не назначен'} / Агент: {rep ? `${rep.firstName} ${rep.lastName}` : 'Не назначен'}</div>
                    <div className="font-bold text-xs">Поставщик: ЧДММ "Сомон Камолот"</div>
                  </div>
                  <div className="text-right font-bold text-xs">
                    Общий долг: {endDebt.toFixed(2).replace('.', ',')}
                  </div>
                </div>

                <div className="text-center my-3">
                  <h2 className="text-sm font-bold border-b border-black pb-1 inline-block">
                    Расходная накладная № {order.id.slice(0, 8).toUpperCase()} от {formattedDate}
                  </h2>
                </div>

                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="underline font-bold">Покупатель:</span> {client.name} {client.address} тел {client.phone || '—'}
                    <div><span className="underline font-bold">Договор:</span> {order.contract || 'Договор №1'}</div>
                  </div>
                  <div className="text-right font-bold text-xs">
                    Наличка
                  </div>
                </div>

                {totalDiscountAmount > 0 && (
                  <div className="text-center border-t border-b border-black py-1 font-bold my-2 text-xs">
                    Скидки: -{totalDiscountAmount.toFixed(2).replace('.', ',')} сом.
                  </div>
                )}

                <table className="w-full border-collapse border border-black text-[9px] my-3">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-center">
                      <th className="border border-black p-1 w-8">№</th>
                      <th className="border border-black p-1 text-left">Наименование товара</th>
                      <th className="border border-black p-1 w-16">Кол-во шт</th>
                      <th className="border border-black p-1 w-16">Цена</th>
                      <th className="border border-black p-1 w-20">Сумма TJS</th>
                      <th className="border border-black p-1 w-14">Скидка %</th>
                      <th className="border border-black p-1 w-20">Цена со скидкой TJS</th>
                      <th className="border border-black p-1 w-20">Сумма со скидкой TJS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: any) => (
                      <tr key={row.idx}>
                        <td className="border border-black p-1 text-center font-mono">{row.idx}</td>
                        <td className="border border-black p-1 font-medium">{row.name} ({row.sku})</td>
                        <td className="border border-black p-1 text-center font-bold font-mono">{row.qty}</td>
                        <td className="border border-black p-1 text-center font-mono">{row.basePrice.toFixed(2).replace('.', ',')}</td>
                        <td className="border border-black p-1 text-center font-mono">{row.itemBaseTotal.toFixed(2).replace('.', ',')}</td>
                        <td className="border border-black p-1 text-center font-mono">{row.discountPercent > 0 ? `${row.discountPercent.toFixed(1).replace('.', ',')}%` : '0%'}</td>
                        <td className="border border-black p-1 text-center font-mono">{row.discountedPrice.toFixed(2).replace('.', ',')}</td>
                        <td className="border border-black p-1 text-center font-bold font-mono">{row.itemDiscountedTotal.toFixed(2).replace('.', ',')}</td>
                      </tr>
                    ))}
                    
                    <tr className="font-bold bg-slate-50">
                      <td className="border border-black p-1" colSpan={2}></td>
                      <td className="border border-black p-1 text-center font-mono">{totalQty}</td>
                      <td className="border border-black p-1"></td>
                      <td className="border border-black p-1 text-center font-mono">{totalBaseAmount.toFixed(2).replace('.', ',')}</td>
                      <td className="border border-black p-1" colSpan={2}></td>
                      <td className="border border-black p-1 text-center font-mono">{totalDiscountedAmount.toFixed(2).replace('.', ',')}</td>
                    </tr>

                    <tr className="font-bold bg-slate-100 text-xs">
                      <td className="border border-black p-2 text-left" colSpan={4}>ИТОГО К ОПЛАТЕ СОСТАВЛЯЕТ:</td>
                      <td className="border border-black p-2 text-center font-mono" colSpan={2}>{totalDiscountedAmount.toFixed(2).replace('.', ',')}</td>
                      <td className="border border-black p-2 text-center font-mono" colSpan={2}>{totalDiscountedAmount.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4 text-[10px]">
                  <div>Всего наименований {rows.length}, вес - {totalQty}, на сумму {totalDiscountedAmount.toFixed(2).replace('.', ',')}</div>
                  <div className="font-bold mt-1 text-xs">
                    Нач.долг: {startDebt.toFixed(2).replace('.', ',')} смн. Заказ: {orderAmount.toFixed(2).replace('.', ',')} смн. Кон.долг: {endDebt.toFixed(2).replace('.', ',')} смн.
                  </div>
                </div>

                <div className="border-t border-black mt-8 pt-4">
                  <div className="flex justify-between items-center mb-6 text-[10px]">
                    <div>Сдал (экспедитор): _________________________</div>
                    <div>Принял (клиент): _________________________</div>
                  </div>
                  <div className="text-center text-[9px] text-slate-500 mt-4">
                    По всем вопросам звонить: Аудиторы: Телефон кол центра: 93-909-09-09
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Loading Sheet Modal */}
      {showLoadingSheetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white border border-[#e9e9e7] rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #loading-sheet-print-area, #loading-sheet-print-area * {
                  visibility: visible;
                }
                #loading-sheet-print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  padding: 0;
                  margin: 0;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            <div className="flex justify-between items-center border-b border-[#e9e9e7] pb-3 mb-4">
              <span className="text-xs font-bold text-[#86868b]">Сводный загрузочный лист для склада</span>
              <button
                onClick={() => setShowLoadingSheetModal(false)}
                className="text-[#86868b] hover:text-[#37352f] font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 no-print">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Водитель-экспедитор</label>
                <select
                  value={selectedDriverForLoadingSheet}
                  onChange={(e) => setSelectedDriverForLoadingSheet(e.target.value)}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value="">Выберите водителя...</option>
                  {users.filter(u => u.role === 'DELIVERY_MAN' || u.role === 'DELIVERY_DRIVER').map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Дата доставки</label>
                <input
                  type="date"
                  value={selectedDateForLoadingSheet}
                  onChange={(e) => setSelectedDateForLoadingSheet(e.target.value)}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            {selectedDriverForLoadingSheet ? (
              (() => {
                const sheetRows = generateLoadingSheetData();
                const driverObj = users.find(u => u.id === selectedDriverForLoadingSheet);
                
                return (
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-end gap-2 mb-3 no-print">
                      <button
                        onClick={() => window.print()}
                        className="px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Печать листа погрузки</span>
                      </button>
                    </div>

                    <div id="loading-sheet-print-area" className="bg-white p-6 text-black font-sans leading-tight text-[11px] border border-[#e9e9e7] rounded-lg">
                      <div className="text-center border-b border-black pb-2 mb-4">
                        <h2 className="text-sm font-bold uppercase">Сводный лист погрузки на склад</h2>
                        <div className="text-[10px] mt-1">
                          Дата сборки: <strong>{new Date(selectedDateForLoadingSheet).toLocaleDateString('ru-RU')}</strong> | 
                          Экспедитор: <strong>{driverObj ? `${driverObj.firstName} ${driverObj.lastName}` : '—'}</strong>
                        </div>
                      </div>

                      {sheetRows.length === 0 ? (
                        <p className="text-center py-8 italic text-slate-500">Нет заказов, назначенных на сборку этому водителю на выбранную дату.</p>
                      ) : (
                        <table className="w-full border-collapse border border-black text-[10px]">
                          <thead>
                            <tr className="bg-slate-100 font-bold text-center">
                              <th className="border border-black p-1.5 w-10">№</th>
                              <th className="border border-black p-1.5 text-left">Наименование товара</th>
                              <th className="border border-black p-1.5 w-32">Артикул (SKU)</th>
                              <th className="border border-black p-1.5 w-24">Ед. изм.</th>
                              <th className="border border-black p-1.5 w-28">Кол-во (Всего)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sheetRows.map((row: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                                <td className="border border-black p-1.5 font-medium">{row.name}</td>
                                <td className="border border-black p-1.5 text-center font-mono">{row.sku}</td>
                                <td className="border border-black p-1.5 text-center">{row.unit}</td>
                                <td className="border border-black p-1.5 text-center font-bold font-mono text-xs">{row.qty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      <div className="border-t border-black mt-12 pt-4 flex justify-between items-center text-[10px]">
                        <div>Склад сдал (Кладовщик): ______________________</div>
                        <div>Машину принял (Экспедитор): ______________________</div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p className="text-center py-8 italic text-slate-400 text-xs">Пожалуйста, выберите водителя-экспедитора для формирования сводного листа.</p>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
