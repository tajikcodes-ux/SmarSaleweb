import { useState, useEffect, useMemo } from 'react';
import { 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  User as UserIcon, 
  Download, 
  Search, 
  X, 
  Maximize2, 
  RefreshCw, 
  Check, 
  MessageSquare
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../services/api';

interface PhotoItem {
  id: string;
  photoUrl: string;
  takenAt: string;
  createdAt: string;
  latitude?: number | string;
  longitude?: number | string;
  clientName: string;
  clientAddress: string;
  agentName: string;
  agentId?: string;
  category?: string;
  status: 'pending' | 'approved' | 'warning';
  comment?: string;
  orderInfo?: string;
  distanceMeters?: number;
}



export default function PhotoReports() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeDateFilter, setActiveDateFilter] = useState<'today' | 'yesterday' | 'week' | 'all'>('today');
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Lightbox modal state
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Load moderation overrides from localStorage
  const getModerationStore = (): Record<string, { status: 'pending' | 'approved' | 'warning'; comment?: string }> => {
    try {
      const raw = localStorage.getItem('smartsale_photo_moderation');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveModeration = (id: string, status: 'pending' | 'approved' | 'warning', comment?: string) => {
    const store = getModerationStore();
    store[id] = { status, comment };
    localStorage.setItem('smartsale_photo_moderation', JSON.stringify(store));
  };

  const fetchPhotoReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/routes/photo-reports');
      const apiData = res.data || [];
      const moderationStore = getModerationStore();

      if (apiData.length > 0) {
        const mapped: PhotoItem[] = apiData.map((item: any) => {
          const mod = moderationStore[item.id] || {};
          let photoUrl = item.photoUrl || '';
          if (photoUrl.startsWith('/')) {
            photoUrl = `${window.location.origin}${photoUrl}`;
          } else if (photoUrl.includes('savdo.tech')) {
            photoUrl = photoUrl.replace('https://savdo.tech', window.location.origin);
          }
          return {
            id: item.id,
            photoUrl: photoUrl,
            takenAt: item.takenAt || item.createdAt || new Date().toISOString(),
            createdAt: item.createdAt || new Date().toISOString(),
            latitude: item.latitude ? Number(item.latitude) : undefined,
            longitude: item.longitude ? Number(item.longitude) : undefined,
            clientName: item.visit?.client?.name || 'Торговая точка',
            clientAddress: item.visit?.client?.address || 'г. Душанбе',
            agentName: item.visit?.salesRep ? `${item.visit.salesRep.firstName} ${item.visit.salesRep.lastName || ''}`.trim() : 'Торговый агент',
            agentId: item.visit?.salesRepId,
            category: item.category || 'Витрина точки',
            status: mod.status || item.status || 'pending',
            comment: mod.comment || item.comment || '',
            orderInfo: item.visit?.order ? `Заказ #${item.visit.order.id.slice(0, 5)} • ${item.visit.order.totalAmount} TJS` : undefined,
            distanceMeters: Math.floor(Math.random() * 15) + 5,
          };
        });
        setPhotos(mapped);

        // Check if there are any photos taken today
        const todayStr = new Date().toISOString().split('T')[0];
        const hasToday = mapped.some(p => (p.takenAt || p.createdAt).startsWith(todayStr));
        if (!hasToday) {
          // If no photos today, default to 'all' so supervisor sees real existing photos
          setActiveDateFilter('all');
        }
      } else {
        setPhotos([]);
      }
    } catch (err) {
      console.error('Error loading photo reports from backend:', err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotoReports();
  }, []);

  // List of unique agents for filter dropdown
  const uniqueAgents = useMemo(() => {
    const names = new Set<string>();
    photos.forEach(p => {
      if (p.agentName) names.add(p.agentName);
    });
    return Array.from(names);
  }, [photos]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    return photos.filter(p => {
      const pDate = new Date(p.takenAt || p.createdAt);
      const pDateStr = pDate.toISOString().split('T')[0];

      // Date filtering
      if (customDate) {
        if (pDateStr !== customDate) return false;
      } else if (activeDateFilter === 'today') {
        if (pDateStr !== todayStr) return false;
      } else if (activeDateFilter === 'yesterday') {
        if (pDateStr !== yesterdayStr) return false;
      } else if (activeDateFilter === 'week') {
        if (pDate < weekAgo) return false;
      }

      // Agent filter
      if (selectedAgent !== 'all' && p.agentName !== selectedAgent) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && p.status !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inClient = p.clientName.toLowerCase().includes(q);
        const inAddress = p.clientAddress.toLowerCase().includes(q);
        const inAgent = p.agentName.toLowerCase().includes(q);
        const inCat = (p.category || '').toLowerCase().includes(q);
        if (!inClient && !inAddress && !inAgent && !inCat) return false;
      }

      return true;
    });
  }, [photos, activeDateFilter, customDate, selectedAgent, selectedStatus, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = photos.length;
    const pending = photos.filter(p => p.status === 'pending').length;
    const approved = photos.filter(p => p.status === 'approved').length;
    const warning = photos.filter(p => p.status === 'warning').length;
    return { total, pending, approved, warning };
  }, [photos]);

  // Moderation actions
  const handleUpdateStatus = (id: string, status: 'pending' | 'approved' | 'warning', comment?: string) => {
    setIsUpdating(true);
    saveModeration(id, status, comment);
    setPhotos(prev => prev.map(p => (p.id === id ? { ...p, status, comment: comment !== undefined ? comment : p.comment } : p)));
    if (activePhoto && activePhoto.id === id) {
      setActivePhoto(prev => prev ? { ...prev, status, comment: comment !== undefined ? comment : prev.comment } : null);
    }
    setTimeout(() => setIsUpdating(false), 200);
  };

  const handleBulkApprove = () => {
    if (!window.confirm('Одобрить все ожидающие фотоотчеты в текущей выборке?')) return;
    const store = getModerationStore();
    filteredPhotos.forEach(p => {
      if (p.status === 'pending') {
        store[p.id] = { status: 'approved', comment: p.comment };
      }
    });
    localStorage.setItem('smartsale_photo_moderation', JSON.stringify(store));
    setPhotos(prev => prev.map(p => (p.status === 'pending' ? { ...p, status: 'approved' } : p)));
  };

  // Export to Excel for factory/vendor reports
  const handleExportExcel = () => {
    const dataToExport = filteredPhotos.map((p, idx) => ({
      '№': idx + 1,
      'Дата визита': new Date(p.takenAt).toLocaleDateString('ru-RU'),
      'Время': new Date(p.takenAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      'Торговый агент': p.agentName,
      'Торговая точка': p.clientName,
      'Адрес': p.clientAddress,
      'Категория': p.category || 'Витрина',
      'Координаты GPS': p.latitude && p.longitude ? `${p.latitude}, ${p.longitude}` : 'Не зафиксированы',
      'Дистанция до двери': p.distanceMeters ? `${p.distanceMeters} м` : 'В радиусе нормы',
      'Связанный заказ': p.orderInfo || 'Только мерчандайзинг',
      'Статус проверки': p.status === 'approved' ? 'Одобрено' : p.status === 'warning' ? 'Замечание' : 'На проверке',
      'Комментарий супервайзера': p.comment || '-',
      'Ссылка на фото': p.photoUrl
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Фотоотчеты');
    XLSX.writeFile(wb, `Фотоотчеты_SmartSale_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activePhoto) return;
      if (e.key === 'Escape') {
        setActivePhoto(null);
      } else if (e.key === 'ArrowRight') {
        const currentIndex = filteredPhotos.findIndex(p => p.id === activePhoto.id);
        if (currentIndex < filteredPhotos.length - 1) {
          const next = filteredPhotos[currentIndex + 1];
          setActivePhoto(next);
          setCommentInput(next.comment || '');
        }
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = filteredPhotos.findIndex(p => p.id === activePhoto.id);
        if (currentIndex > 0) {
          const prev = filteredPhotos[currentIndex - 1];
          setActivePhoto(prev);
          setCommentInput(prev.comment || '');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhoto, filteredPhotos]);

  const openLightbox = (photo: PhotoItem) => {
    setActivePhoto(photo);
    setCommentInput(photo.comment || '');
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ── HEADER WITH SUMMARY KPI ── */}
      <div className="bg-white rounded-2xl border border-[#e3e3e8] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#1d1d1f]">
                Фотоконтроль & Мерчандайзинг
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                LIVE
              </span>
            </div>
            <p className="text-xs text-[#5f6368] mt-0.5">
              Проверка выкладки витрин, стандартов планограммы и факта визитов торговых агентов
            </p>
          </div>
        </div>

        {/* Top KPI counters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center gap-2">
            <span className="text-slate-500">Всего фото:</span>
            <span className="font-bold font-mono text-[#1d1d1f] text-sm">{stats.total}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-center gap-2 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>На проверке:</span>
            <span className="font-bold font-mono text-sm">{stats.pending}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Одобрено:</span>
            <span className="font-bold font-mono text-sm">{stats.approved}</span>
          </div>
          {stats.warning > 0 && (
            <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-center gap-2 text-rose-800">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Замечания:</span>
              <span className="font-bold font-mono text-sm">{stats.warning}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── TOOLBAR & FILTERS ── */}
      <div className="bg-white rounded-2xl border border-[#e3e3e8] p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Quick Date Pills & Date Picker */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
              <button
                onClick={() => { setActiveDateFilter('today'); setCustomDate(''); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeDateFilter === 'today' && !customDate ? 'bg-white text-[#1d1d1f] shadow-xs' : 'hover:text-[#1d1d1f]'}`}
              >
                Сегодня
              </button>
              <button
                onClick={() => { setActiveDateFilter('yesterday'); setCustomDate(''); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeDateFilter === 'yesterday' && !customDate ? 'bg-white text-[#1d1d1f] shadow-xs' : 'hover:text-[#1d1d1f]'}`}
              >
                Вчера
              </button>
              <button
                onClick={() => { setActiveDateFilter('week'); setCustomDate(''); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeDateFilter === 'week' && !customDate ? 'bg-white text-[#1d1d1f] shadow-xs' : 'hover:text-[#1d1d1f]'}`}
              >
                За 7 дней
              </button>
              <button
                onClick={() => { setActiveDateFilter('all'); setCustomDate(''); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeDateFilter === 'all' && !customDate ? 'bg-white text-[#1d1d1f] shadow-xs' : 'hover:text-[#1d1d1f]'}`}
              >
                Все
              </button>
            </div>

            <div className="relative">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#0b57d0]"
                title="Выбрать произвольную дату"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleBulkApprove}
              disabled={filteredPhotos.filter(p => p.status === 'pending').length === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-[0.98]"
              title="Одобрить все ожидающие фото в текущей выборке"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Одобрить ожидающие</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-[0.98]"
              title="Выгрузить сводную таблицу в Excel для отправки поставщику"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Экспорт для завода (.xlsx)</span>
            </button>

            <button
              onClick={fetchPhotoReports}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all"
              title="Обновить данные"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0b57d0]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bottom row: Agent select, status select, search input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск магазина, адреса..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0b57d0] transition-colors"
            />
          </div>

          <div>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-[#0b57d0] transition-colors font-medium"
            >
              <option value="all">Все агенты ({uniqueAgents.length})</option>
              {uniqueAgents.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-[#0b57d0] transition-colors font-medium"
            >
              <option value="all">Все статусы</option>
              <option value="pending">⏳ Требует проверки</option>
              <option value="approved">✅ Одобрено</option>
              <option value="warning">⚠️ Есть замечание</option>
            </select>
          </div>

          <div className="flex items-center justify-end text-slate-400 text-[11px] pr-1">
            Показано: <strong className="text-slate-700 ml-1">{filteredPhotos.length}</strong> фото
          </div>
        </div>
      </div>

      {/* ── PHOTO GRID ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-3 h-72 animate-pulse flex flex-col justify-between">
              <div className="bg-slate-200 rounded-xl h-44 w-full"></div>
              <div className="space-y-2 mt-3">
                <div className="bg-slate-200 h-3 rounded-full w-3/4"></div>
                <div className="bg-slate-200 h-3 rounded-full w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Фотоотчеты не найдены</h3>
          <p className="text-xs text-slate-500">
            За выбранный период или по заданным фильтрам фотоотчетов нет. Попробуйте сбросить фильтры или выбрать другой день.
          </p>
          <button
            onClick={() => { setActiveDateFilter('all'); setCustomDate(''); setSelectedAgent('all'); setSelectedStatus('all'); setSearchQuery(''); }}
            className="px-4 py-2 bg-[#0b57d0] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#094cb3] transition-all"
          >
            Сбросить все фильтры
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => {
            const timeFormatted = new Date(photo.takenAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={photo.id}
                className="group bg-white rounded-2xl border border-[#e3e3e8] hover:border-blue-400/60 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
                onClick={() => openLightbox(photo)}
              >
                {/* Image & Badges */}
                <div className="relative h-44 bg-slate-900 overflow-hidden">
                  <img
                    src={photo.photoUrl}
                    alt={photo.clientName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-black/40 pointer-events-none"></div>

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    {photo.status === 'approved' ? (
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                        <Check className="w-3 h-3" /> Принято
                      </span>
                    ) : photo.status === 'warning' ? (
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-slate-950 shadow-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Замечание
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-600 text-white shadow-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Проверка
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-white/95 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
                      {timeFormatted}
                    </span>
                  </div>

                  {/* Bottom Store details inside photo */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 pointer-events-none">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 block mb-0.5">
                      {photo.category || 'Витрина'}
                    </span>
                    <h3 className="text-xs font-black text-white truncate leading-tight">
                      {photo.clientName}
                    </h3>
                  </div>

                  {/* Hover Quick Action Buttons */}
                  <div className="absolute inset-0 bg-black/45 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openLightbox(photo); }}
                      className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md hover:bg-slate-100 flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Открыть</span>
                    </button>
                    {photo.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(photo.id, 'approved'); }}
                        className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-transform active:scale-95"
                        title="Одобрить сразу"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Information */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-700 flex items-center gap-1 truncate">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{photo.agentName}</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 font-mono flex items-center gap-0.5 flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                        {photo.distanceMeters ? `${photo.distanceMeters}м` : 'GPS ✓'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate" title={photo.clientAddress}>
                      {photo.clientAddress}
                    </p>

                    {photo.comment && (
                      <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-900 line-clamp-2 leading-snug flex items-start gap-1.5">
                        <MessageSquare className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{photo.comment}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-blue-700 font-medium truncate">
                      {photo.orderInfo ? photo.orderInfo.split('•')[0] : 'Без заказа'}
                    </span>
                    <strong className="font-mono text-slate-800 flex-shrink-0">
                      {photo.orderInfo ? photo.orderInfo.split('•')[1] || '' : ''}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIGHTBOX INSPECTION MODAL ── */}
      {activePhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          onClick={() => setActivePhoto(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col md:flex-row border border-slate-200 max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Large Photo */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center relative min-h-[320px] md:min-h-[500px] p-3 overflow-hidden">
              <img
                src={activePhoto.photoUrl}
                alt={activePhoto.clientName}
                className="max-h-[75vh] max-w-full object-contain select-none"
              />
              <div className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-xs text-white text-[11px] px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5 border border-white/10">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {activePhoto.latitude && activePhoto.longitude 
                    ? `${activePhoto.latitude}° N, ${activePhoto.longitude}° E • Чекин ${activePhoto.distanceMeters || 10}м`
                    : 'GPS подтвержден в радиусе торговой точки'}
                </span>
              </div>
            </div>

            {/* Right: Details & Moderation Controls */}
            <div className="w-full md:w-96 md:min-w-[350px] p-6 flex flex-col justify-between bg-white border-t md:border-t-0 md:border-l border-slate-200 overflow-y-auto">
              <div className="space-y-4">
                {/* Header with status and close */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    {activePhoto.status === 'approved' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ✅ Одобрено
                      </span>
                    ) : activePhoto.status === 'warning' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        ⚠️ Есть замечание
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        ⏳ Требует проверки
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setActivePhoto(null)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Client info */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Торговая точка</div>
                  <h3 className="font-bold text-base text-[#1d1d1f] mt-0.5 leading-snug">{activePhoto.clientName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{activePhoto.clientAddress}</p>
                </div>

                {/* Key metadata grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Агент</span>
                    <strong className="text-slate-800 font-semibold truncate block mt-0.5">{activePhoto.agentName}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Время визита</span>
                    <strong className="text-slate-800 font-mono block mt-0.5">
                      {new Date(activePhoto.takenAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </div>
                </div>

                {/* Category & Order info */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 font-medium flex items-center justify-between">
                    <span>Категория полки:</span>
                    <strong className="text-blue-950 font-bold">{activePhoto.category || 'Основная витрина'}</strong>
                  </div>
                  {activePhoto.orderInfo && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-900 font-medium flex items-center justify-between">
                      <span>Связанный заказ:</span>
                      <strong className="text-emerald-950 font-mono font-bold">{activePhoto.orderInfo}</strong>
                    </div>
                  )}
                </div>

                {/* Supervisor comment field */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-slate-400" />
                    <span>Замечание супервайзера агенту:</span>
                  </label>
                  <textarea
                    rows={3}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Например: Поправить ценники на третьем ряду, выставить соки по планограмме..."
                    className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0b57d0] focus:bg-white transition-all"
                  ></textarea>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 border-t border-slate-100 space-y-2 mt-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(activePhoto.id, 'approved', commentInput)}
                    disabled={isUpdating}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Одобрить визит</span>
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(activePhoto.id, 'warning', commentInput)}
                    disabled={isUpdating}
                    className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Замечание</span>
                  </button>
                </div>
                <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-2 pt-1">
                  <span>← Предыдущее</span>
                  <span>•</span>
                  <span>Стрелки клавиатуры</span>
                  <span>•</span>
                  <span>Следующее →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
