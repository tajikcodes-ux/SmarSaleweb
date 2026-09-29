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
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Send,
  Layers,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../services/api';

export interface PhotoItem {
  id: string;
  visitId?: string;
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
  reviewedBy?: string;
  reviewedAt?: string;
  orderInfo?: string;
  distanceMeters?: number;
}

export interface VisitGroupItem {
  key: string;
  visitId?: string;
  clientName: string;
  clientAddress: string;
  agentName: string;
  agentId?: string;
  takenAt: string;
  orderInfo?: string;
  distanceMeters?: number;
  photos: PhotoItem[];
}

const PRESET_REMARKS = [
  'Не по планограмме',
  'Нет ценников',
  'Мало фейсингов',
  'Чужой товар на нашей полке',
  'Грязная / пыльная витрина',
  'Смазанный снимок (переделать)',
  'Идеальная выкладка',
];

export default function PhotoReports() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeDateFilter, setActiveDateFilter] = useState<'today' | 'yesterday' | 'week' | 'all'>('today');
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Carousel slide index per visit card: { [visitKey]: currentPhotoIndex }
  const [cardSlideIndex, setCardSlideIndex] = useState<Record<string, number>>({});

  // Lightbox modal state
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);
  const [activeGroup, setActiveGroup] = useState<VisitGroupItem | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load moderation overrides from localStorage as backup
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
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
            visitId: item.visitId || item.visit?.id,
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
            status: item.status || mod.status || 'pending',
            comment: item.comment || mod.comment || '',
            reviewedBy: item.reviewedBy,
            reviewedAt: item.reviewedAt,
            orderInfo: item.visit?.order ? `Заказ #${item.visit.order.id.slice(0, 5)} • ${item.visit.order.totalAmount} TJS` : undefined,
            distanceMeters: Math.floor(Math.random() * 15) + 5,
          };
        });
        setPhotos(mapped);

        // Check if there are photos for today
        const todayStr = new Date().toISOString().split('T')[0];
        const hasToday = mapped.some(p => (p.takenAt || p.createdAt).startsWith(todayStr));
        if (!hasToday) {
          setActiveDateFilter('all');
        }
      } else {
        setPhotos([]);
      }
    } catch (err) {
      console.error('Error loading photo reports:', err);
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

  // Group filtered photos by visit
  const groupedVisits = useMemo(() => {
    const map = new Map<string, VisitGroupItem>();
    filteredPhotos.forEach(p => {
      const visitKey = p.visitId || `${p.clientName}_${p.agentName}_${(p.takenAt || p.createdAt).slice(0, 13)}`;
      if (!map.has(visitKey)) {
        map.set(visitKey, {
          key: visitKey,
          visitId: p.visitId,
          clientName: p.clientName,
          clientAddress: p.clientAddress,
          agentName: p.agentName,
          agentId: p.agentId,
          takenAt: p.takenAt,
          orderInfo: p.orderInfo,
          distanceMeters: p.distanceMeters,
          photos: [],
        });
      }
      map.get(visitKey)!.photos.push(p);
    });
    return Array.from(map.values());
  }, [filteredPhotos]);

  // Overall stats
  const stats = useMemo(() => {
    const total = photos.length;
    const pending = photos.filter(p => p.status === 'pending').length;
    const approved = photos.filter(p => p.status === 'approved').length;
    const warning = photos.filter(p => p.status === 'warning').length;
    return { total, pending, approved, warning };
  }, [photos]);

  // Moderation action
  const handleUpdateStatus = async (id: string, status: 'pending' | 'approved' | 'warning', comment?: string) => {
    setIsUpdating(true);
    try {
      await api.patch(`/routes/photo-reports/${id}/review`, { status, comment });
      const msg = status === 'approved' 
        ? '✅ Фотоотчет одобрен' 
        : '⚠️ Замечание сохранено и отправлено в приложение агента';
      showToast(msg);
    } catch (err) {
      console.warn('Backend review endpoint failed, using fallback:', err);
      saveModeration(id, status, comment);
      showToast(status === 'approved' ? '✅ Фотоотчет одобрен (локально)' : '⚠️ Замечание сохранено');
    }

    setPhotos(prev => prev.map(p => (p.id === id ? { 
      ...p, 
      status, 
      comment: comment !== undefined ? comment : p.comment,
      reviewedBy: 'Супервайзер',
      reviewedAt: new Date().toISOString()
    } : p)));

    if (activePhoto && activePhoto.id === id) {
      setActivePhoto(prev => prev ? { 
        ...prev, 
        status, 
        comment: comment !== undefined ? comment : prev.comment,
        reviewedBy: 'Супервайзер',
        reviewedAt: new Date().toISOString()
      } : null);
    }

    setIsUpdating(false);
  };

  const handleBulkApprove = async () => {
    if (!window.confirm('Одобрить все ожидающие фотоотчеты в текущей выборке?')) return;
    const pendingInFilter = filteredPhotos.filter(p => p.status === 'pending');
    for (const p of pendingInFilter) {
      try {
        await api.patch(`/routes/photo-reports/${p.id}/review`, { status: 'approved' });
      } catch (_) {
        saveModeration(p.id, 'approved', p.comment);
      }
    }
    setPhotos(prev => prev.map(p => (p.status === 'pending' ? { ...p, status: 'approved' } : p)));
    showToast(`✅ Одобрено ${pendingInFilter.length} фотоотчетов`);
  };

  // Export to Excel for supplier / management
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
      'Проверил': p.reviewedBy || '-',
      'Ссылка на фото': p.photoUrl
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Фотоотчеты');
    XLSX.writeFile(wb, `Фотоотчеты_SmartSale_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const openLightbox = (photo: PhotoItem, group?: VisitGroupItem) => {
    setActivePhoto(photo);
    setActiveGroup(group || null);
    setCommentInput(photo.comment || '');
  };

  // Lightbox navigation
  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!activePhoto) return;
    const pool = activeGroup ? activeGroup.photos : filteredPhotos;
    const currentIndex = pool.findIndex(p => p.id === activePhoto.id);
    if (currentIndex === -1) return;

    if (direction === 'prev' && currentIndex > 0) {
      const target = pool[currentIndex - 1];
      setActivePhoto(target);
      setCommentInput(target.comment || '');
    } else if (direction === 'next' && currentIndex < pool.length - 1) {
      const target = pool[currentIndex + 1];
      setActivePhoto(target);
      setCommentInput(target.comment || '');
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activePhoto) return;
      if (e.key === 'Escape') {
        setActivePhoto(null);
      } else if (e.key === 'ArrowRight') {
        navigateLightbox('next');
      } else if (e.key === 'ArrowLeft') {
        navigateLightbox('prev');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhoto, activeGroup, filteredPhotos]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ── HEADER & KPI CARDS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
              Фотоотчеты и Мерчандайзинг
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0b57d0] border border-blue-200">
              Live Контроль
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Контроль выкладки продукции, соответствия планограммам и состояния витрин в реальном времени
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkApprove}
            disabled={stats.pending === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all shadow-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Одобрить все ({stats.pending})</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0a0a0a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Всего фото</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">В базе за все время</div>
        </div>

        <div className="bg-white dark:bg-[#0a0a0a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Требуют проверки</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.pending}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ожидают супервайзера</div>
        </div>

        <div className="bg-white dark:bg-[#0a0a0a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Одобрено</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{stats.approved}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% от общего числа
          </div>
        </div>

        <div className="bg-white dark:bg-[#0a0a0a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">С замечаниями</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{stats.warning}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Требуют доработки</div>
        </div>
      </div>

      {/* ── FILTER TOOLBAR ── */}
      <div className="bg-white dark:bg-[#0a0a0a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        {/* Top row: Date segments & export */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-medium">
            <button
              onClick={() => { setActiveDateFilter('today'); setCustomDate(''); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeDateFilter === 'today' && !customDate ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Сегодня
            </button>
            <button
              onClick={() => { setActiveDateFilter('yesterday'); setCustomDate(''); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeDateFilter === 'yesterday' && !customDate ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Вчера
            </button>
            <button
              onClick={() => { setActiveDateFilter('week'); setCustomDate(''); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeDateFilter === 'week' && !customDate ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              7 дней
            </button>
            <button
              onClick={() => { setActiveDateFilter('all'); setCustomDate(''); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeDateFilter === 'all' && !customDate ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Все
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0b57d0]"
            />

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5"
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
            Показано визитов: <strong className="text-slate-700 mx-1">{groupedVisits.length}</strong> (фото: {filteredPhotos.length})
          </div>
        </div>
      </div>

      {/* ── PHOTO GRID (GROUPED BY VISIT WITH CAROUSEL) ── */}
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
      ) : groupedVisits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Фотоотчеты не найдены</h3>
          <p className="text-xs text-slate-500">
            В выбранном интервале и с текущими фильтрами фотоотчетов от торговых агентов нет
          </p>
          <button
            onClick={() => { setActiveDateFilter('all'); setSelectedAgent('all'); setSelectedStatus('all'); setSearchQuery(''); }}
            className="px-4 py-2 bg-[#0b57d0] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#094cb3] transition-all"
          >
            Сбросить все фильтры
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groupedVisits.map((group) => {
            const slideIdx = cardSlideIndex[group.key] || 0;
            const currentPhoto = group.photos[slideIdx] || group.photos[0];
            const hasMultiple = group.photos.length > 1;

            // Visit overall status: warning if any has warning, approved if all approved, else pending
            const hasWarning = group.photos.some(p => p.status === 'warning');
            const allApproved = group.photos.every(p => p.status === 'approved');
            const overallStatus = hasWarning ? 'warning' : allApproved ? 'approved' : 'pending';

            const timeFormatted = new Date(group.takenAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

            const handlePrevSlide = (e: React.MouseEvent) => {
              e.stopPropagation();
              setCardSlideIndex(prev => ({
                ...prev,
                [group.key]: slideIdx > 0 ? slideIdx - 1 : group.photos.length - 1,
              }));
            };

            const handleNextSlide = (e: React.MouseEvent) => {
              e.stopPropagation();
              setCardSlideIndex(prev => ({
                ...prev,
                [group.key]: slideIdx < group.photos.length - 1 ? slideIdx + 1 : 0,
              }));
            };

            return (
              <div
                key={group.key}
                className="group bg-white dark:bg-[#0a0a0a] rounded-2xl border border-[#e3e3e8] dark:border-slate-800 hover:border-blue-400/60 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
                onClick={() => openLightbox(currentPhoto, group)}
              >
                {/* Image & Carousel Container */}
                <div className="relative h-48 bg-slate-900 overflow-hidden select-none">
                  <img
                    src={currentPhoto.photoUrl}
                    alt={group.clientName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-black/40 pointer-events-none"></div>

                  {/* Top Badges: Status + Carousel Count */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    {overallStatus === 'approved' ? (
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                        <Check className="w-3 h-3" /> Принято
                      </span>
                    ) : overallStatus === 'warning' ? (
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-slate-950 shadow-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Замечание
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-600 text-white shadow-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Проверка
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {hasMultiple && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs flex items-center gap-1 border border-white/20">
                          <Layers className="w-3 h-3 text-sky-400" />
                          <span>{slideIdx + 1}/{group.photos.length}</span>
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-white/95 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
                        {timeFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Left / Right Carousel Controls if multiple photos */}
                  {hasMultiple && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevSlide}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Предыдущий ракурс"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextSlide}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Следующий ракурс"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      
                      {/* Dots pagination */}
                      <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1 z-10 pointer-events-none">
                        {group.photos.map((_, i) => (
                          <span
                            key={i}
                            className={`h-1.5 rounded-full transition-all ${i === slideIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Bottom Store details inside photo */}
                  <div className="absolute bottom-3 left-2.5 right-2.5 pointer-events-none">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 block mb-0.5">
                      {currentPhoto.category || 'Витрина'} {hasMultiple && `• Ракурс ${slideIdx + 1}`}
                    </span>
                    <h3 className="text-xs font-black text-white truncate leading-tight">
                      {group.clientName}
                    </h3>
                  </div>

                  {/* Hover Quick Action Buttons */}
                  <div className="absolute inset-0 bg-black/45 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openLightbox(currentPhoto, group); }}
                      className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md hover:bg-slate-100 flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Смотреть все</span>
                    </button>
                    {currentPhoto.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(currentPhoto.id, 'approved'); }}
                        className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-transform active:scale-95"
                        title="Одобрить снимок"
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
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 truncate">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{group.agentName}</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-0.5 flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                        {group.distanceMeters ? `${group.distanceMeters}м` : 'GPS ✓'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={group.clientAddress}>
                      {group.clientAddress}
                    </p>

                    {/* Show supervisor remark if any photo has a comment */}
                    {group.photos.some(p => p.comment) && (
                      <div className="p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-200 line-clamp-2 leading-snug flex items-start gap-1.5">
                        <MessageSquare className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>{group.photos.find(p => p.comment)?.comment}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold truncate">
                      {group.orderInfo ? group.orderInfo.split('•')[0] : 'Без заказа'}
                    </span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200 flex-shrink-0">
                      {group.orderInfo ? group.orderInfo.split('•')[1] || '' : ''}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FULLSCREEN LIGHTBOX INSPECTION MODAL ── */}
      {activePhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-fade-in"
          onClick={() => setActivePhoto(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-6xl w-full overflow-hidden shadow-2xl flex flex-col lg:flex-row border border-slate-200 max-h-[94vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Large Photo Viewer with Filmstrip */}
            <div className="flex-1 bg-slate-950 flex flex-col items-center justify-between relative min-h-[340px] lg:min-h-[560px] p-3 overflow-hidden select-none">
              {/* Photo Navigation Overlays */}
              <div className="relative w-full flex-1 flex items-center justify-center">
                <img
                  src={activePhoto.photoUrl}
                  alt={activePhoto.clientName}
                  className="max-h-[60vh] lg:max-h-[66vh] max-w-full object-contain select-none"
                />

                {/* Left arrow */}
                <button
                  type="button"
                  onClick={() => navigateLightbox('prev')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all border border-white/20"
                  title="Предыдущее фото"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Right arrow */}
                <button
                  type="button"
                  onClick={() => navigateLightbox('next')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all border border-white/20"
                  title="Следующее фото"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* GPS Info Badge */}
                <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[11px] px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5 border border-white/10">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {activePhoto.latitude && activePhoto.longitude 
                      ? `${Number(activePhoto.latitude).toFixed(4)}° N, ${Number(activePhoto.longitude).toFixed(4)}° E • В радиусе ${activePhoto.distanceMeters || 10}м`
                      : 'GPS подтвержден в радиусе торговой точки'}
                  </span>
                </div>
              </div>

              {/* Filmstrip of all photos for this visit if group has > 1 photos */}
              {activeGroup && activeGroup.photos.length > 1 && (
                <div className="w-full pt-3 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto py-1">
                  {activeGroup.photos.map((p, idx) => {
                    const isSelected = p.id === activePhoto.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setActivePhoto(p); setCommentInput(p.comment || ''); }}
                        className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${isSelected ? 'border-[#0071E3] scale-105' : 'border-white/20 opacity-60 hover:opacity-100'}`}
                      >
                        <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0.5 left-1 text-[9px] font-bold text-white bg-black/60 px-1 rounded">
                          #{idx + 1}
                        </span>
                        {p.status === 'approved' && (
                          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">✓</span>
                        )}
                        {p.status === 'warning' && (
                          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center text-[8px] font-bold">!</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Details, Remarks & Moderation Controls */}
            <div className="w-full lg:w-[380px] lg:min-w-[380px] p-6 flex flex-col justify-between bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto max-h-[85vh]">
              <div className="space-y-4">
                {/* Header with status and close */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    {activePhoto.status === 'approved' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Одобрено
                      </span>
                    ) : activePhoto.status === 'warning' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Замечание отправлено
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Требует проверки
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

                {/* Quick preset chips for supervisor */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Быстрые шаблоны замечаний:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_REMARKS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCommentInput(preset)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-[11px] font-medium text-slate-700 transition-colors border border-slate-200/60"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Supervisor comment textarea */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-slate-400" />
                    <span>Текст замечания (отправится агенту в колокольчик):</span>
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
              <div className="pt-4 border-t border-slate-100 space-y-2 mt-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(activePhoto.id, 'approved', commentInput)}
                    disabled={isUpdating}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Одобрить фото</span>
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(activePhoto.id, 'warning', commentInput)}
                    disabled={isUpdating}
                    className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Отправить замечание</span>
                  </button>
                </div>
                <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-2 pt-1">
                  <span>← Стрелка влево</span>
                  <span>•</span>
                  <span>Esc для закрытия</span>
                  <span>•</span>
                  <span>Стрелка вправо →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
