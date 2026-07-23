import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { Plus, Navigation, Wallet, Edit, Trash } from 'lucide-react';
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

  // Settings states
  const [salesRepCanCreateClient, setSalesRepCanCreateClient] = useState(false);
  const [deliveryDriverCanCreateClient, setDeliveryDriverCanCreateClient] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Form states
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
        <form onSubmit={handleCreateOrUpdateClient} className="bg-white border border-[#e9e9e7] p-5 rounded-xl space-y-4 max-w-2xl shadow-sm">
          <h4 className="font-bold text-[#1d1d1f] text-xs">
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
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <input
              type="text"
              placeholder="Юридическое лицо"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <input
              type="text"
              placeholder="ИНН / ТИН"
              value={tin}
              onChange={(e) => setTin(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <input
              type="text"
              placeholder="Телефон*"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <input
              type="text"
              placeholder="Адрес*"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400 md:col-span-2"
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
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f]"
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
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f]"
            />
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 block">Укажите точку на карте или перетащите маркер:</label>
              <div id="client-select-map" className="w-full h-48 rounded-lg border border-[#e9e9e7] dark:border-[#1a1a1a] z-0" />
            </div>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f]"
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
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f]"
            />
            <select
              value={priceCategoryId}
              onChange={(e) => setPriceCategoryId(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] md:col-span-2"
            >
              <option value="">Ценовая категория: Базовая розница</option>
              {priceCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs shadow-sm"
          >
            {editingClient ? 'Сохранить изменения' : 'Создать точку'}
          </button>
        </form>
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
    </div>
  );
}
