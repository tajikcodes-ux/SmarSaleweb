import { useEffect, useRef, useState, useMemo } from 'react';
import api from '../services/api';
import { 
  Plus, Navigation, Wallet, Edit, Trash, X, FileText, 
  FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle,
  Sparkles, Search, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw,
  Ban, ShieldCheck, Printer, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import L from 'leaflet';

// Fix for default Leaflet icon paths in React production bundles
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [priceCategories, setPriceCategories] = useState<any[]>([]);
  const [debtAgingMap, setDebtAgingMap] = useState<Record<string, { ageDays: number; bucket: string }>>({});

  // Search, filter, sorting and selection states
  const [searchTerm, setSearchTerm] = useState('');
  const [debtFilter, setDebtFilter] = useState<'all' | 'debtors' | 'overlimit' | 'nodebt'>('all');
  const [selectedPriceCategory, setSelectedPriceCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'currentDebt' | 'creditLimit' | 'phone' | 'address'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Reconciliation statement modal state
  const [reconciliationModal, setReconciliationModal] = useState<{
    open: boolean;
    clientId: string;
    clientName: string;
    data: any;
    loading: boolean;
    startDate: string;
    endDate: string;
  }>({
    open: false,
    clientId: '',
    clientName: '',
    data: null,
    loading: false,
    startDate: '',
    endDate: '',
  });

  const handleOpenReconciliation = async (clientId: string, clientName: string, start = '', end = '') => {
    setReconciliationModal({
      open: true,
      clientId,
      clientName,
      data: null,
      loading: true,
      startDate: start,
      endDate: end,
    });
    try {
      const res = await api.get(`/documents/client/${clientId}/reconciliation-data`, {
        params: {
          ...(start ? { startDate: start } : {}),
          ...(end ? { endDate: end } : {}),
        },
      });
      setReconciliationModal(prev => ({ ...prev, data: res.data, loading: false }));
    } catch (err: any) {
      console.error('Failed to load reconciliation data', err);
      setReconciliationModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleToggleBlockClient = async (clientId: string, currentStatus: string) => {
    const isBlocked = currentStatus === 'blocked';
    const confirmMsg = isBlocked 
      ? 'Разблокировать торговую точку и разрешить отгрузку заказов?'
      : 'Внести торговую точку в СТОП-ЛИСТ? Отгрузка заказов будет заблокирована!';
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.patch(`/clients/${clientId}/toggle-block`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка изменения статуса стоп-листа');
    }
  };

  const handlePrintReconciliation = (clientId: string, start = '', end = '') => {
    const url = `/documents/client/${clientId}/reconciliation${start || end ? `?startDate=${start}&endDate=${end}` : ''}`;
    window.open(`${api.defaults.baseURL || ''}${url}`, '_blank');
  };

  // Settings states
  const [salesRepCanCreateClient, setSalesRepCanCreateClient] = useState(false);
  const [deliveryDriverCanCreateClient, setDeliveryDriverCanCreateClient] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Form states
  // Bulk Excel Import clients state
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedClients, setParsedClients] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; total: number } | null>(null);
  const [importError, setImportError] = useState('');

  const downloadClientTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Название торговой точки', 'Номер телефона', 'Адрес', 'ИНН (TIN)', 'Юридическое лицо'],
      ['Магазин "Анис"', '+992900001122', 'ул. Рудаки 45', '020012345', 'ООО "Анис Савдо"'],
      ['Минимаркет "Шоми Душанбе"', '+992918882233', 'пр. И. Сомони 12', '030098765', 'ИП Каримов С.'],
      ['Супермаркет "Пайкар Центр"', '+992987773344', 'ул. Айни 8', '010055443', 'ЗАО "Пайкар"'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 30 }, { wch: 16 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Шаблон клиентов');
    XLSX.writeFile(wb, 'shablon_klientov_smartsale.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) {
          setImportError('Файл пуст или не содержит строк с данными');
          return;
        }

        const headers: string[] = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
        
        const nameIdx = headers.findIndex(h => h.includes('назван') || h.includes('клиент') || h.includes('точка') || h.includes('магазин') || h.includes('name'));
        const phoneIdx = headers.findIndex(h => h.includes('телефон') || h.includes('тел') || h.includes('phone') || h.includes('номер'));
        const addressIdx = headers.findIndex(h => h.includes('адрес') || h.includes('address') || h.includes('улиц'));
        const tinIdx = headers.findIndex(h => h.includes('инн') || h.includes('tin'));
        const legalIdx = headers.findIndex(h => h.includes('юр') || h.includes('лицо') || h.includes('фирма'));

        if (nameIdx === -1) {
          setImportError('Не найдена колонка "Название торговой точки" в первой строке таблицы.');
          return;
        }

        const items: any[] = [];
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || !row[nameIdx]) continue;
          const name = String(row[nameIdx]).trim();
          if (!name) continue;

          items.push({
            name,
            phone: phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : undefined,
            address: addressIdx !== -1 && row[addressIdx] ? String(row[addressIdx]).trim() : undefined,
            tin: tinIdx !== -1 && row[tinIdx] ? String(row[tinIdx]).trim() : undefined,
            legalName: legalIdx !== -1 && row[legalIdx] ? String(row[legalIdx]).trim() : undefined,
          });
        }

        if (items.length === 0) {
          setImportError('Не удалось распознать строки с клиентами.');
          return;
        }

        setParsedClients(items);
      } catch (err: any) {
        setImportError('Ошибка чтения Excel файла: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteImport = async () => {
    if (parsedClients.length === 0) return;
    setImporting(true);
    setImportError('');
    try {
      const res = await api.post('/clients/bulk', parsedClients);
      setImportResult(res.data);
      const updated = await api.get('/clients');
      setClients(Array.isArray(updated.data) ? updated.data : updated.data.data || []);
    } catch (err: any) {
      setImportError(err.response?.data?.message || 'Ошибка сохранения торговых точек');
    } finally {
      setImporting(false);
    }
  };

  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [tin, setTin] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(38.5763);
  const [longitude, setLongitude] = useState(68.7797);
  const [paymentType, setPaymentType] = useState('cash');
  const [creditLimit, setCreditLimit] = useState(0);
  const [priceCategoryId, setPriceCategoryId] = useState('');
  const [error, setError] = useState('');

  // Smart Address Autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const addressDebounceRef = useRef<any>(null);

  const handleAddressChange = (val: string) => {
    setAddress(val);
    if (!val || val.trim().length < 2) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (addressDebounceRef.current) {
      clearTimeout(addressDebounceRef.current);
    }

    addressDebounceRef.current = setTimeout(async () => {
      setSearchingAddress(true);
      try {
        const res = await api.get(`/geo/suggest?q=${encodeURIComponent(val)}`);
        setAddressSuggestions(res.data || []);
        setShowSuggestions((res.data || []).length > 0);
      } catch (err) {
        console.error('Geo suggest error:', err);
      } finally {
        setSearchingAddress(false);
      }
    }, 200);
  };

  const handleSelectSuggestion = (item: any) => {
    const fullAddr = `${item.city}, ${item.name}`;
    setAddress(fullAddr);
    setLatitude(item.lat);
    setLongitude(item.lon);
    updateMapMarker(item.lat, item.lon);
    if (mapRef.current) {
      mapRef.current.setView([item.lat, item.lon], 16);
    }
    if (!name && item.category !== 'Адреса и дома') {
      setName(item.name);
    }
    setShowSuggestions(false);
  };

  // Map refs
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Helper to update marker position manually
  const updateMapMarker = (lat: number, lng: number) => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.panTo([lat, lng]);
    }
  };

  useEffect(() => {
    if (!showAddForm) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    // Delay initialization to ensure the DOM container exists
    const timer = setTimeout(() => {
      const mapEl = document.getElementById('client-select-map');
      if (!mapEl || mapRef.current) return;

      const map = L.map('client-select-map').setView([latitude, longitude], 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors, Tiles courtesy of Humanitarian OpenStreetMap Team'
      }).addTo(map);

      const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', () => {
        const latLng = marker.getLatLng();
        setLatitude(parseFloat(latLng.lat.toFixed(6)));
        setLongitude(parseFloat(latLng.lng.toFixed(6)));
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setLatitude(parseFloat(lat.toFixed(6)));
        setLongitude(parseFloat(lng.toFixed(6)));
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [showAddForm]);

  const loadData = async () => {
    try {
      const [clientsRes, settingsRes, debtAgingRes] = await Promise.all([
        api.get('/clients'),
        api.get('/companies/payment-settings'),
        api.get('/clients/debt-aging').catch(() => ({ data: { clients: [] } })),
      ]);
      setClients(clientsRes.data);
      if (debtAgingRes?.data?.clients) {
        const map: Record<string, { ageDays: number; bucket: string }> = {};
        debtAgingRes.data.clients.forEach((c: any) => {
          map[c.id] = { ageDays: c.ageDays, bucket: c.bucket };
        });
        setDebtAgingMap(map);
      }
      if (settingsRes.data) {
        setSalesRepCanCreateClient(settingsRes.data.salesRepCanCreateClient ?? false);
        setDeliveryDriverCanCreateClient(settingsRes.data.deliveryDriverCanCreateClient ?? false);
      }
      
      // Try to load real price categories from backend if endpoint exists
      try {
        const realCategories = await api.get('/catalog/products').then(() => {
          // In db we seeded: 'Оптовый' (price category)
          return [
            { id: '', name: 'Розничный (Базовый)' },
            { id: 'wholesale-id-placeholder', name: 'Оптовый' } // will resolve dynamically or fallback
          ];
        });
        setPriceCategories(realCategories);
      } catch {
        setPriceCategories([{ id: '', name: 'Розничный (Базовый)' }]);
      }

    } catch (err) {
      console.error('Failed to load clients or settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSetting = async (field: 'salesRep' | 'driver', currentValue: boolean) => {
    setUpdatingSettings(true);
    try {
      const payload = field === 'salesRep'
        ? { salesRepCanCreateClient: !currentValue }
        : { deliveryDriverCanCreateClient: !currentValue };
        
      const response = await api.patch('/companies/payment-settings', payload);
      if (response.data) {
        setSalesRepCanCreateClient(response.data.salesRepCanCreateClient ?? false);
        setDeliveryDriverCanCreateClient(response.data.deliveryDriverCanCreateClient ?? false);
      }
    } catch (err) {
      console.error('Failed to update company client creation settings', err);
    } finally {
      setUpdatingSettings(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (client: any) => {
    setEditingClient(client);
    setName(client.name || '');
    setLegalName(client.legalName || '');
    setTin(client.tin || '');
    setPhone(client.phone || '');
    setAddress(client.address || '');
    setLatitude(parseFloat(client.latitude?.toString() || '38.5763'));
    setLongitude(parseFloat(client.longitude?.toString() || '68.7797'));
    setPaymentType(client.paymentType || 'cash');
    setCreditLimit(parseFloat(client.creditLimit?.toString() || '0'));
    setPriceCategoryId(client.priceCategoryId || '');
    setShowAddForm(true);
  };

  const handleOpenCreate = () => {
    setEditingClient(null);
    setName('');
    setLegalName('');
    setTin('');
    setPhone('');
    setAddress('');
    setLatitude(38.5763);
    setLongitude(68.7797);
    setPaymentType('cash');
    setCreditLimit(0);
    setPriceCategoryId('');
    setShowAddForm(true);
  };

  const handleCreateOrUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = {
      name,
      legalName: legalName || null,
      tin: tin || null,
      phone,
      address,
      latitude: parseFloat(latitude.toString()),
      longitude: parseFloat(longitude.toString()),
      paymentType,
      creditLimit: parseFloat(creditLimit.toString()),
      priceCategoryId: priceCategoryId || null,
    };

    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, payload);
      } else {
        await api.post('/clients', payload);
      }
      setShowAddForm(false);
      setEditingClient(null);
      loadData();
      
      // Clear fields
      setName('');
      setLegalName('');
      setTin('');
      setPhone('');
      setAddress('');
      setCreditLimit(0);
      setPriceCategoryId('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при сохранении торговой точки');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого клиента?')) return;
    try {
      await api.delete(`/clients/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

    // Calculate dynamic stats
  const totalDebtSum = useMemo(() => {
    return clients.reduce((acc, c) => acc + (parseFloat(c.currentDebt || 0) > 0 ? parseFloat(c.currentDebt || 0) : 0), 0);
  }, [clients]);

  const debtorClientsCount = useMemo(() => {
    return clients.filter(c => parseFloat(c.currentDebt || 0) > 0).length;
  }, [clients]);

  const overlimitClientsCount = useMemo(() => {
    return clients.filter(c => {
      const debt = parseFloat(c.currentDebt || 0);
      const limit = parseFloat(c.creditLimit || 0);
      return limit > 0 && debt > limit;
    }).length;
  }, [clients]);

  // Filtered and sorted clients
  const filteredAndSortedClients = useMemo(() => {
    return clients
      .filter((client) => {
        // Text search across name, phone, tin, address, legalName
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchesName = (client.name || '').toLowerCase().includes(q);
          const matchesPhone = (client.phone || '').toLowerCase().includes(q);
          const matchesTin = (client.tin || '').toLowerCase().includes(q);
          const matchesAddress = (client.address || '').toLowerCase().includes(q);
          const matchesLegal = (client.legalName || '').toLowerCase().includes(q);
          if (!matchesName && !matchesPhone && !matchesTin && !matchesAddress && !matchesLegal) {
            return false;
          }
        }

        // Debt filter
        const debt = parseFloat(client.currentDebt || 0);
        const limit = parseFloat(client.creditLimit || 0);
        if (debtFilter === 'debtors' && debt <= 0) return false;
        if (debtFilter === 'overlimit' && (limit <= 0 || debt <= limit)) return false;
        if (debtFilter === 'nodebt' && debt > 0) return false;

        // Price category filter
        if (selectedPriceCategory !== 'all') {
          if (client.priceCategoryId !== selectedPriceCategory) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'currentDebt' || sortField === 'creditLimit') {
          valA = parseFloat(valA || 0);
          valB = parseFloat(valB || 0);
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [clients, searchTerm, debtFilter, selectedPriceCategory, sortField, sortDirection]);

  const toggleSort = (field: 'name' | 'currentDebt' | 'creditLimit' | 'phone' | 'address') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'currentDebt' ? 'desc' : 'asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedClientIds.length === filteredAndSortedClients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(filteredAndSortedClients.map(c => c.id));
    }
  };

  const toggleSelectClient = (id: string) => {
    setSelectedClientIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleExportFilteredExcel = (onlySelected = false) => {
    const dataToExport = onlySelected 
      ? filteredAndSortedClients.filter(c => selectedClientIds.includes(c.id))
      : filteredAndSortedClients;
    
    if (dataToExport.length === 0) {
      alert('Нет клиентов для выгрузки');
      return;
    }

    const headers = ['Название точки', 'Юр. лицо', 'ИНН', 'Телефон', 'Адрес', 'Координаты', 'Долг (TJS)', 'Лимит (TJS)', 'Ценовая категория'];
    const rows = dataToExport.map(c => [
      c.name,
      c.legalName || '—',
      c.tin || '—',
      c.phone,
      c.address,
      `${parseFloat(c.latitude || 0).toFixed(4)}, ${parseFloat(c.longitude || 0).toFixed(4)}`,
      parseFloat(c.currentDebt || 0),
      parseFloat(c.creditLimit || 0),
      priceCategories.find(p => p.id === c.priceCategoryId)?.name || 'Базовая розница'
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 30 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Реестр клиентов');
    XLSX.writeFile(wb, `smartsale_clients_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  const handleBulkDelete = async () => {
    if (selectedClientIds.length === 0) return;
    if (!window.confirm(`Вы уверены, что хотите удалить выбранных клиентов (${selectedClientIds.length} точек)?`)) return;
    try {
      for (const id of selectedClientIds) {
        await api.delete(`/clients/${id}`);
      }
      setSelectedClientIds([]);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка при массовом удалении');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
          <div className="space-y-2">
            <div className="h-5 bg-slate-200 rounded w-44"></div>
            <div className="h-3 bg-slate-100 rounded w-80"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 bg-slate-100 rounded-lg w-32"></div>
            <div className="h-8 bg-slate-200 rounded-lg w-32"></div>
          </div>
        </div>

        {/* 4 Stat Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#e9e9e7] rounded-xl p-4 shadow-sm space-y-2">
              <div className="h-3 bg-slate-100 rounded w-24"></div>
              <div className="h-6 bg-slate-200 rounded w-28"></div>
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white border border-[#e9e9e7] rounded-xl overflow-hidden shadow-sm p-4 space-y-3">
          <div className="h-8 bg-slate-100 rounded w-full mb-3"></div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-2 border-b border-slate-100 items-center">
              <div className="h-4 bg-slate-200/80 rounded w-1/4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/6"></div>
              <div className="h-4 bg-slate-200/80 rounded w-1/6"></div>
              <div className="h-6 bg-slate-100 rounded w-16 ml-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
        <div>
          <h3 className="font-bold text-[#1d1d1f] text-base">Клиентская база</h3>
          <p className="text-[11px] text-[#86868b] mt-0.5">Реестр торговых точек (магазинов) с задолженностями и гео-метками</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setParsedClients([]);
              setImportResult(null);
              setImportError('');
              setShowImportModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Импорт из Excel</span>
          </button>
          <button
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false);
                setEditingClient(null);
              } else {
                handleOpenCreate();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Скрыть форму' : 'Добавить точку'}</span>
          </button>
        </div>
      </div>

      {/* Toggles settings panel for Client Creation permissions */}
      <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm space-y-4">
        <div>
          <h4 className="font-bold text-[#1d1d1f] text-xs">Настройки добавления торговых точек в мобильном приложении</h4>
          <p className="text-[10px] text-[#86868b] mt-0.5">Укажите, какие роли сотрудников имеют право регистрировать и добавлять новые торговые точки в систему с мобильного телефона.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between items-center bg-[#fbfbfa] p-4 border border-[#e9e9e7] rounded-xl">
            <div>
              <span className="text-xs font-bold text-[#1d1d1f]">Торговые представители (Sales Reps)</span>
              <p className="text-[9px] text-[#86868b] mt-0.5">Могут добавлять новые торговые точки на карте или в списке</p>
            </div>
            <button
              onClick={() => handleToggleSetting('salesRep', salesRepCanCreateClient)}
              disabled={updatingSettings}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                salesRepCanCreateClient ? 'bg-[#0071e3]' : 'bg-[#e9e9e7]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  salesRepCanCreateClient ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex justify-between items-center bg-[#fbfbfa] p-4 border border-[#e9e9e7] rounded-xl">
            <div>
              <span className="text-xs font-bold text-[#1d1d1f]">Водители-экспедиторы (Delivery Drivers)</span>
              <p className="text-[9px] text-[#86868b] mt-0.5">Могут добавлять новые торговые точки на карте или в списке</p>
            </div>
            <button
              onClick={() => handleToggleSetting('driver', deliveryDriverCanCreateClient)}
              disabled={updatingSettings}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                deliveryDriverCanCreateClient ? 'bg-[#0071e3]' : 'bg-[#e9e9e7]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  deliveryDriverCanCreateClient ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white dark:bg-[#0a0a0a] border border-[#e9e9e7] dark:border-[#1a1a1a] p-5 rounded-xl shadow-sm relative">
          <button
            type="button"
            onClick={() => {
              setShowAddForm(false);
              setEditingClient(null);
            }}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors z-10"
            title="Закрыть форму"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Left Form Column */}
          <form onSubmit={handleCreateOrUpdateClient} className="lg:col-span-7 space-y-4">
            <h4 className="font-bold text-[#1d1d1f] dark:text-white text-xs">
              {editingClient ? 'Редактировать торговую точку' : 'Новая торговая точка'}
            </h4>
            {error && <div className="text-rose-600 text-xs bg-rose-50 border border-rose-100 p-3 rounded-lg">{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Название магазина*"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] dark:text-white placeholder-slate-400"
              />
              <input
                type="text"
                placeholder="Юридическое лицо"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] dark:text-white placeholder-slate-400"
              />
              <input
                type="text"
                placeholder="ИНН / ТИН"
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                className="bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] dark:text-white placeholder-slate-400"
              />
              <input
                type="text"
                placeholder="Телефон*"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] dark:text-white placeholder-slate-400"
              />
              <div className="relative md:col-span-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Адрес торговой точки (введите 13 17, улицу или ориентир)*"
                    required
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onFocus={() => {
                      if (addressSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    className="w-full bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg p-2.5 pr-8 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] dark:text-white placeholder-slate-400"
                  />
                  {searchingAddress ? (
                    <div className="absolute right-2.5 top-3 w-3.5 h-3.5 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 absolute right-2.5 top-3 text-[#0071e3]/60 pointer-events-none" />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-[#0a0a0a] border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-xl shadow-xl divide-y divide-slate-100 dark:divide-white/5">
                    {addressSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50/70 dark:hover:bg-blue-950/30 transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-base flex-shrink-0">{item.icon || '📍'}</span>
                          <div className="truncate">
                            <span className="font-bold text-[#1d1d1f] dark:text-white">{item.name}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({item.city})</span>
                          </div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex-shrink-0">
                          {item.category}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="number"
                step="any"
                placeholder="Широта (Latitude)*"
                required
                value={latitude}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setLatitude(val);
                  updateMapMarker(val, longitude);
                }}
                className="bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] dark:text-white"
              />
              <input
                type="number"
                step="any"
                placeholder="Долгота (Longitude)*"
                required
                value={longitude}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setLongitude(val);
                  updateMapMarker(latitude, val);
                }}
                className="bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] dark:text-white"
              />
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] dark:text-white"
              >
                <option value="cash">Наличный расчет</option>
                <option value="bank_transfer">Безналичный расчет</option>
                <option value="card">Карта</option>
              </select>
              <input
                type="number"
                placeholder="Кредитный лимит (TJS)"
                value={creditLimit}
                onChange={(e) => setCreditLimit(parseInt(e.target.value))}
                className="bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] dark:text-white"
              />
              <select
                value={priceCategoryId}
                onChange={(e) => setPriceCategoryId(e.target.value)}
                className="bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] dark:text-white md:col-span-2"
              >
                <option value="">Ценовая категория: Базовая розница</option>
                {priceCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-xs shadow-sm transition-all"
              >
                {editingClient ? 'Сохранить изменения' : 'Создать точку'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingClient(null);
                }}
                className="px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white font-bold text-xs transition-all"
              >
                Отмена
              </button>
            </div>
          </form>

          {/* Right Map Column */}
          <div className="lg:col-span-5 flex flex-col space-y-2.5 h-full min-h-[300px] lg:min-h-[400px]">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Выбор точки на карте</span>
            <p className="text-[9px] text-[#86868b] dark:text-slate-400 leading-relaxed">
              Кликните в любое место на карте или перетащите маркер, чтобы автоматически считать координаты (широту и долготу).
            </p>
            <div id="client-select-map" className="flex-1 w-full min-h-[260px] rounded-xl border border-[#e9e9e7] dark:border-[#1a1a1a] z-0 overflow-hidden shadow-inner" />
          </div>
        </div>
      )}

            {/* Smart Search, Filter Chips & Bulk Action Toolbar */}
      <div className="space-y-3">
        {/* Search & Top Action Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 border border-[#e9e9e7] rounded-xl shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск магазина по названию, телефону, ИНН, адресу или юр. лицу..."
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

          {/* Price Category Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPriceCategory}
              onChange={(e) => setSelectedPriceCategory(e.target.value)}
              className="px-3 py-2 bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg text-xs text-[#37352f] focus:outline-none focus:border-[#0071e3] font-medium"
            >
              <option value="all">Все ценовые категории</option>
              {priceCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <button
              onClick={() => handleExportFilteredExcel(false)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#1d1d1f] rounded-lg text-xs font-semibold transition-colors"
              title="Выгрузить отфильтрованный список в Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Badges / Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setDebtFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                debtFilter === 'all'
                  ? 'bg-[#1d1d1f] dark:bg-white dark:text-slate-900 text-white shadow-sm'
                  : 'bg-white dark:bg-[#111113] hover:bg-slate-100 dark:hover:bg-[#1a1a1e] text-slate-600 dark:text-slate-300 border border-[#e9e9e7] dark:border-[#27272a]'
              }`}
            >
              Все точки ({clients.length})
            </button>

            <button
              onClick={() => setDebtFilter('debtors')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                debtFilter === 'debtors'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
              }`}
            >
              <span>Должники</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                debtFilter === 'debtors'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
              }`}>
                {debtorClientsCount} ({totalDebtSum > 0 ? totalDebtSum.toFixed(0) + ' TJS' : '0 TJS'})
              </span>
            </button>

            <button
              onClick={() => setDebtFilter('overlimit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                debtFilter === 'overlimit'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Превышен лимит</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                debtFilter === 'overlimit'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              }`}>
                {overlimitClientsCount}
              </span>
            </button>

            <button
              onClick={() => setDebtFilter('nodebt')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                debtFilter === 'nodebt'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
              }`}
            >
              Без долга ({clients.length - debtorClientsCount})
            </button>
          </div>

          <div className="text-[11px] text-[#86868b] font-medium">
            Показано: <span className="font-bold text-[#1d1d1f]">{filteredAndSortedClients.length}</span> из {clients.length}
          </div>
        </div>

        {/* Bulk Action Bar (Shows when rows are checked) */}
        {selectedClientIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl shadow-md animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 bg-white/20 text-xs font-bold rounded-md">
                {selectedClientIds.length}
              </span>
              <span className="text-xs font-medium">клиентов выбрано</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportFilteredExcel(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Выгрузить ({selectedClientIds.length}) в Excel</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>Удалить выбранных</span>
              </button>
              <button
                onClick={() => setSelectedClientIds([])}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Снять выбор
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#e9e9e7] rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e9e9e7] bg-[#fbfbfa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider select-none">
              <th className="p-3.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={filteredAndSortedClients.length > 0 && selectedClientIds.length === filteredAndSortedClients.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-[#0071e3] focus:ring-0 cursor-pointer"
                  title="Выбрать всех на экране"
                />
              </th>
              <th 
                onClick={() => toggleSort('name')} 
                className="p-3.5 cursor-pointer hover:text-[#1d1d1f] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Название точки</span>
                  {sortField === 'name' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0071e3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0071e3]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-300" />
                  )}
                </div>
              </th>
              <th className="p-3.5">ИНН</th>
              <th 
                onClick={() => toggleSort('phone')} 
                className="p-3.5 cursor-pointer hover:text-[#1d1d1f] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Контакты</span>
                  {sortField === 'phone' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0071e3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0071e3]" />)}
                </div>
              </th>
              <th 
                onClick={() => toggleSort('address')} 
                className="p-3.5 cursor-pointer hover:text-[#1d1d1f] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Адрес</span>
                  {sortField === 'address' && (sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0071e3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0071e3]" />)}
                </div>
              </th>
              <th className="p-3.5">Координаты</th>
              <th 
                onClick={() => toggleSort('currentDebt')} 
                className="p-3.5 cursor-pointer hover:text-[#1d1d1f] transition-colors"
              >
                <div className="flex items-center gap-1.5 text-rose-600">
                  <span>Дебет (Долг)</span>
                  {sortField === 'currentDebt' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-rose-600" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-rose-300" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => toggleSort('creditLimit')} 
                className="p-3.5 cursor-pointer hover:text-[#1d1d1f] transition-colors"
              >
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <span>Лимит</span>
                  {sortField === 'creditLimit' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-700" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-emerald-300" />
                  )}
                </div>
              </th>
              <th className="p-3.5 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9e9e7]/60 text-xs">
            {filteredAndSortedClients.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-[#1d1d1f]">Ничего не найдено</div>
                      <div className="text-xs text-[#86868b]">Попробуйте изменить поисковый запрос или сбросить фильтры</div>
                    </div>
                    {(searchTerm || debtFilter !== 'all' || selectedPriceCategory !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setDebtFilter('all');
                          setSelectedPriceCategory('all');
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
              filteredAndSortedClients.map((item) => {
                const isChecked = selectedClientIds.includes(item.id);
                const debt = parseFloat(item.currentDebt || 0);
                const limit = parseFloat(item.creditLimit || 0);
                const isOverlimit = limit > 0 && debt > limit;

                return (
                  <tr 
                    key={item.id} 
                    className={`transition-colors ${
                      isChecked ? 'bg-blue-50/60' : 'hover:bg-[#fbfbfa]'
                    }`}
                  >
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectClient(item.id)}
                        className="rounded border-slate-300 text-[#0071e3] focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#37352f] flex items-center gap-1.5 flex-wrap">
                        <span>{item.name}</span>
                        {item.status === 'blocked' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white tracking-wider" title="Точка находится в СТОП-ЛИСТЕ (отгрузка запрещена)">
                            СТОП-ЛИСТ
                          </span>
                        )}
                        {isOverlimit && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800" title="Превышен кредитный лимит">
                            Лимит!
                          </span>
                        )}
                      </div>
                      {item.legalName && (
                        <div className="text-[10px] text-[#86868b] truncate max-w-[180px]">{item.legalName}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-[#6a6a65] font-mono">{item.tin || '—'}</td>
                    <td className="p-3.5 text-[#37352f] font-mono">{item.phone}</td>
                    <td className="p-3.5 text-[#37352f] max-w-[200px] truncate" title={item.address}>{item.address}</td>
                    <td className="p-3.5 text-[#86868b] font-mono flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-[#0071e3]" />
                      <span>{parseFloat(item.latitude || 0).toFixed(4)}, {parseFloat(item.longitude || 0).toFixed(4)}</span>
                    </td>
                    <td className="p-3.5 text-rose-600 font-bold font-mono">
                      <div>{debt > 0 ? `${debt.toFixed(2)} TJS` : '0.00 TJS'}</div>
                      {debt > 0 && debtAgingMap[item.id] && (
                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-sans ${
                          debtAgingMap[item.id].ageDays > 30 ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          debtAgingMap[item.id].ageDays >= 16 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          debtAgingMap[item.id].ageDays >= 8 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {debtAgingMap[item.id].ageDays} дн. ({debtAgingMap[item.id].ageDays > 30 ? 'Крит.' : debtAgingMap[item.id].ageDays >= 16 ? 'Просроч.' : debtAgingMap[item.id].ageDays >= 8 ? 'Внимание' : 'Норма'})
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-emerald-700 font-bold font-mono">
                      <div className="flex items-center gap-1">
                        <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{limit.toFixed(2)} TJS</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {/* Toggle Stop-List Button */}
                        <button
                          onClick={() => handleToggleBlockClient(item.id, item.status || 'active')}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            item.status === 'blocked'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'border-[#e3e3e8] hover:bg-rose-50 text-[#6a6a65] hover:text-rose-600 hover:border-rose-200'
                          }`}
                          title={item.status === 'blocked' ? 'Разблокировать точку (снять СТОП-ЛИСТ)' : 'Поставить в СТОП-ЛИСТ (заблокировать отгрузки)'}
                        >
                          {item.status === 'blocked' ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>

                        {/* Interactive Reconciliation Statement Modal */}
                        <button
                          onClick={() => handleOpenReconciliation(item.id, item.name)}
                          className="p-1.5 rounded-lg border border-[#e3e3e8] hover:bg-blue-50 text-[#0071e3] hover:border-blue-200 transition-colors"
                          title="Акт сверки взаиморасчетов"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg border border-[#e3e3e8] hover:bg-slate-50 text-[#6a6a65] hover:text-[#1d1d1f] transition-colors"
                          title="Редактировать точку"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClient(item.id)}
                          className="p-1.5 rounded-lg border border-[#e3e3e8] hover:bg-rose-50 text-[#6a6a65] hover:text-rose-600 hover:border-rose-200 transition-colors"
                          title="Удалить"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* BULK EXCEL IMPORT CLIENTS MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Массовый импорт торговых точек из Excel / 1С</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Быстро загрузите базу магазинов и клиентов в систему</p>
                </div>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Step 1: Download sample */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Шаг 1. Скачайте готовый образец таблицы</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Файл содержит колонки: Название торговой точки, Номер телефона, Адрес, ИНН, Юр. лицо
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadClientTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-semibold whitespace-nowrap shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать .xlsx</span>
                </button>
              </div>

              {/* Step 2: Upload */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-900">Шаг 2. Выберите или перетащите заполненный файл</h4>
                <div className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-6 text-center transition-colors bg-gray-50/50">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <label className="cursor-pointer">
                    <span className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline">
                      Нажмите для выбора файла
                    </span>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                  <p className="text-[11px] text-gray-500 mt-1">Поддерживаются форматы Excel (.xlsx, .xls) и CSV</p>
                </div>
              </div>

              {/* Error notice */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Success Result */}
              {importResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Импорт клиентов успешно завершен!</span>
                  </div>
                  <div>Всего распознано: <b>{importResult.total}</b></div>
                  <div>Новых добавлено: <b>{importResult.created}</b></div>
                  <div>Обновлено существующих: <b>{importResult.updated}</b></div>
                </div>
              )}

              {/* Parsed Rows Preview */}
              {parsedClients.length > 0 && !importResult && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-800">
                      Распознано торговых точек: <span className="text-emerald-700">{parsedClients.length}</span>
                    </span>
                    <span className="text-[11px] text-gray-500">Первые 5 точек для проверки:</span>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[11px]">
                        <tr>
                          <th className="p-2">Название точки</th>
                          <th className="p-2">Телефон</th>
                          <th className="p-2">Адрес</th>
                          <th className="p-2">ИНН</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedClients.slice(0, 5).map((c, i) => (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="p-2 font-medium text-gray-900">{c.name}</td>
                            <td className="p-2 text-gray-600">{c.phone || '—'}</td>
                            <td className="p-2 text-gray-600">{c.address || '—'}</td>
                            <td className="p-2 text-gray-600">{c.tin || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Закрыть
              </button>
              {parsedClients.length > 0 && !importResult && (
                <button
                  type="button"
                  disabled={importing}
                  onClick={handleExecuteImport}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{importing ? 'Загрузка...' : `Импортировать ${parsedClients.length} клиентов`}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE RECONCILIATION STATEMENT MODAL */}
      {reconciliationModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-50 text-[#0071e3] rounded-xl border border-blue-100">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Акт сверки взаиморасчетов: {reconciliationModal.clientName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Детальная хронология всех продаж, оплат и возвратов со сквозным сальдо
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReconciliationModal(prev => ({ ...prev, open: false }))}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Date Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#f8f9fa] rounded-xl border border-[#e3e3e8]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-[#1d1d1f]">Период сверки:</span>
                <button
                  type="button"
                  onClick={() => handleOpenReconciliation(reconciliationModal.clientId, reconciliationModal.clientName, '', '')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    !reconciliationModal.startDate && !reconciliationModal.endDate
                      ? 'bg-[#0071e3] text-white shadow-xs'
                      : 'bg-white border border-[#e3e3e8] hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Все время
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                    const end = now.toISOString().split('T')[0];
                    handleOpenReconciliation(reconciliationModal.clientId, reconciliationModal.clientName, start, end);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    reconciliationModal.startDate && !reconciliationModal.startDate.includes('09-')
                      ? 'bg-[#0071e3] text-white shadow-xs'
                      : 'bg-white border border-[#e3e3e8] hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Этот месяц
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={reconciliationModal.startDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleOpenReconciliation(reconciliationModal.clientId, reconciliationModal.clientName, val, reconciliationModal.endDate);
                  }}
                  className="px-2 py-1 bg-white border border-[#e3e3e8] rounded-lg text-xs text-slate-700 focus:outline-none"
                />
                <span className="text-xs text-slate-400">—</span>
                <input
                  type="date"
                  value={reconciliationModal.endDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleOpenReconciliation(reconciliationModal.clientId, reconciliationModal.clientName, reconciliationModal.startDate, val);
                  }}
                  className="px-2 py-1 bg-white border border-[#e3e3e8] rounded-lg text-xs text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Financial Summary KPI Cards */}
            {reconciliationModal.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Входящий долг</span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono">
                    {Number(reconciliationModal.data.initialBalance || 0).toFixed(2)} TJS
                  </span>
                </div>
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">Продажи (Дебет, +)</span>
                  <span className="text-sm font-extrabold text-blue-900 font-mono">
                    +{Number(reconciliationModal.data.periodDebit || 0).toFixed(2)} TJS
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Оплаты (Кредит, -)</span>
                  <span className="text-sm font-extrabold text-emerald-900 font-mono">
                    -{Number(reconciliationModal.data.periodCredit || 0).toFixed(2)} TJS
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${
                  Number(reconciliationModal.data.finalBalance || 0) > 0
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                }`}>
                  <span className="text-[10px] uppercase font-bold block opacity-80">Итоговое сальдо (Долг)</span>
                  <span className="text-sm font-extrabold font-mono">
                    {Number(reconciliationModal.data.finalBalance || 0).toFixed(2)} TJS
                  </span>
                </div>
              </div>
            )}

            {/* Operations Table */}
            <div className="flex-1 overflow-y-auto border border-[#e3e3e8] rounded-xl">
              {reconciliationModal.loading ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs">Загрузка операций по клиенту...</span>
                </div>
              ) : !reconciliationModal.data || reconciliationModal.data.operations.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs italic">
                  Нет операций за выбранный период сверки.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#f8f9fa] sticky top-0 border-b border-[#e3e3e8] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5 text-center w-10">№</th>
                      <th className="p-2.5 w-24">Дата</th>
                      <th className="p-2.5">Документ / Основание</th>
                      <th className="p-2.5 text-right w-28 text-blue-700">Продажи (+)</th>
                      <th className="p-2.5 text-right w-28 text-emerald-700">Оплаты (-)</th>
                      <th className="p-2.5 text-right w-32">Сальдо</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e3e3e8]/60">
                    {reconciliationModal.data.initialBalance !== 0 && (
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={3} className="p-2.5 text-slate-700">Входящее сальдо на начало периода</td>
                        <td className="p-2.5 text-right text-slate-500 font-mono">—</td>
                        <td className="p-2.5 text-right text-slate-500 font-mono">—</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                          {Number(reconciliationModal.data.initialBalance).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {reconciliationModal.data.operations.map((op: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 text-center text-slate-400 font-mono">{i + 1}</td>
                        <td className="p-2.5 font-mono text-slate-600">
                          {new Date(op.date).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="p-2.5 font-medium text-slate-800">
                          {op.type} № {op.docNumber}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-700">
                          {op.debit > 0 ? Number(op.debit).toFixed(2) : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                          {op.credit > 0 ? Number(op.credit).toFixed(2) : '—'}
                        </td>
                        <td className={`p-2.5 text-right font-mono font-extrabold ${
                          op.balance > 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}>
                          {Number(op.balance).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReconciliation(reconciliationModal.clientId, reconciliationModal.startDate, reconciliationModal.endDate)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Печать официального бланка / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!reconciliationModal.data) return;
                    const headers = ['№', 'Дата', 'Документ / Операция', 'Дебет (Продажи)', 'Кредит (Оплаты)', 'Сальдо (Долг)'];
                    const rows = reconciliationModal.data.operations.map((op: any, idx: number) => [
                      idx + 1,
                      new Date(op.date).toLocaleDateString('ru-RU'),
                      `${op.type} № ${op.docNumber}`,
                      op.debit > 0 ? Number(op.debit) : 0,
                      op.credit > 0 ? Number(op.credit) : 0,
                      Number(op.balance),
                    ]);
                    const wb = XLSX.utils.book_new();
                    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                    XLSX.utils.book_append_sheet(wb, ws, 'Акт сверки');
                    XLSX.writeFile(wb, `akt_sverki_${reconciliationModal.clientName.replace(/\s+/g, '_')}.xlsx`);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 border border-[#e3e3e8] hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Экспорт в Excel</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setReconciliationModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
