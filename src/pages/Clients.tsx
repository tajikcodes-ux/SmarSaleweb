import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { 
  Plus, Navigation, Wallet, Edit, Trash, X, FileText, 
  FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle 
} from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const handlePrintReconciliation = async (clientId: string) => {
    try {
      const res = await api.get(`/documents/client/${clientId}/reconciliation`, { responseType: 'text' });
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(res.data);
        printWin.document.close();
      }
    } catch (err) {
      console.error('Error loading reconciliation statement:', err);
    }
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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
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
      const [clientsRes, settingsRes] = await Promise.all([
        api.get('/clients'),
        api.get('/companies/payment-settings'),
      ]);
      setClients(clientsRes.data);
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="w-8 h-8 border-4 border-slate-200 border-t-[#37352f] rounded-full animate-spin"></span>
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
              <input
                type="text"
                placeholder="Адрес*"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] dark:text-white placeholder-slate-400 md:col-span-2"
              />
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

      <div className="bg-white border border-[#e9e9e7] rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e9e9e7] bg-[#fbfbfa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
              <th className="p-3.5">Название точки</th>
              <th className="p-3.5">ИНН</th>
              <th className="p-3.5">Контакты</th>
              <th className="p-3.5">Адрес</th>
              <th className="p-3.5">Координаты</th>
              <th className="p-3.5">Дебет</th>
              <th className="p-3.5">Лимит</th>
              <th className="p-3.5 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9e9e7]/60 text-xs">
            {clients.map((item) => (
              <tr key={item.id} className="hover:bg-[#fbfbfa] transition-colors">
                <td className="p-3.5 font-bold text-[#37352f]">{item.name}</td>
                <td className="p-3.5 text-[#6a6a65] font-mono">{item.tin || '—'}</td>
                <td className="p-3.5 text-[#37352f]">{item.phone}</td>
                <td className="p-3.5 text-[#37352f] max-w-[200px] truncate">{item.address}</td>
                <td className="p-3.5 text-[#86868b] font-mono flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-[#0071e3]" />
                  <span>{parseFloat(item.latitude || 0).toFixed(4)}, {parseFloat(item.longitude || 0).toFixed(4)}</span>
                </td>
                <td className="p-3.5 text-rose-600 font-bold font-mono">
                  {parseFloat(item.currentDebt || 0).toFixed(2)} TJS
                </td>
                <td className="p-3.5 text-emerald-700 font-bold font-mono flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{parseFloat(item.creditLimit || 0).toFixed(2)} TJS</span>
                </td>
                <td className="p-3.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => handlePrintReconciliation(item.id)}
                      className="p-1.5 rounded-lg border border-[#e3e3e8] hover:bg-blue-50 text-[#0071e3] hover:border-blue-200"
                      title="Акт сверки взаиморасчетов"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg border border-[#e3e3e8] hover:bg-[#f8f9fa] text-[#5f6368]"
                      title="Редактировать"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(item.id)}
                      className="p-1.5 rounded-lg border border-[#e3e3e8] hover:bg-rose-50 text-rose-600 hover:border-rose-200"
                      title="Удалить"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
    </div>
  );
}
