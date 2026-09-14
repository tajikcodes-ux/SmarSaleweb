import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { io } from 'socket.io-client';
import api from '../services/api';
import { MapPin, Users, RefreshCw, CheckCircle2, Circle, Trash, Copy, Sparkles, Info, Search, Play, Pause, Clock, Truck, ShieldCheck, CreditCard, Store, Layers } from 'lucide-react';

// Fix for default Leaflet icon paths in React production bundles
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function RoutesMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const historyPathRef = useRef<L.Polyline | null>(null);
  
  const [agents, setAgents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const selectedAgentIdRef = useRef<string | null>(null);
  const [historyTrack, setHistoryTrack] = useState<any[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Planner states
  const [selectedClientIdToAssign, setSelectedClientIdToAssign] = useState('');
  const [assigningRoute, setAssigningRoute] = useState(false);
  const [copyDate, setCopyDate] = useState(() => {
    // Default to yesterday's date
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');
  const [showLegend, setShowLegend] = useState(true);

  // Advanced Filtering & Timeline playback states
  const [mapFilter, setMapFilter] = useState<'ALL' | 'SALES_REP' | 'DELIVERY' | 'SUPERVISOR' | 'VISITS' | 'DEBT' | 'STORES'>('ALL');
  const [agentSearch, setAgentSearch] = useState('');
  const [agentStatusFilter, setAgentStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [timelineTime, setTimelineTime] = useState(720); // 720 mins = 12:00
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [timelineSpeed, setTimelineSpeed] = useState(1);

  // Timeline playback timer
  useEffect(() => {
    let interval: any = null;
    if (isPlayingTimeline) {
      interval = setInterval(() => {
        setTimelineTime((prev) => {
          if (prev >= 1435) { // 23:55 (24 hours)
            setIsPlayingTimeline(false);
            return 0; // 00:00
          }
          return prev + 5 * timelineSpeed;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingTimeline, timelineSpeed]);

  const formatMinutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getAgentStatusInfo = (agent: any) => {
    if (agent.onShift === false) {
      return { isOnline: false, text: 'Смена закрыта', color: 'bg-slate-400', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    if (!agent.recordedAt) {
      return { isOnline: false, text: 'Нет GPS данных', color: 'bg-slate-400', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    const lastTime = new Date(agent.recordedAt).getTime();
    const now = new Date().getTime();
    const diffMins = Math.floor((now - lastTime) / (1000 * 60));

    if (diffMins < 10) {
      return { isOnline: true, text: `В сети (${diffMins === 0 ? 'сейчас' : diffMins + ' мин назад'})`, color: 'bg-emerald-500', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    } else if (diffMins < 60) {
      return { isOnline: false, text: `Вне сети (${diffMins} мин)`, color: 'bg-amber-500', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' };
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return { isOnline: false, text: `Вне сети (${diffHours} ч назад)`, color: 'bg-rose-500', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
  };

  const getAgentRoleLabel = (agent: any) => {
    let roleName = '';
    if (typeof agent.role === 'string') {
      roleName = agent.role;
    } else if (agent.role && typeof agent.role === 'object') {
      roleName = agent.role.name || agent.role.code || '';
    }

    if (roleName === 'DELIVERY_DRIVER' || roleName === 'DRIVER') {
      return { label: '🚚 Экспедитор', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800' };
    }
    if (roleName === 'SUPERVISOR') {
      return { label: '🛡️ Супервайзер', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800' };
    }
    if (roleName === 'OWNER' || roleName === 'SUPERADMIN' || roleName === 'ADMIN') {
      return { label: '👑 Админ', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800' };
    }
    return { label: '💼 Торговый агент', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800' };
  };

  // Sync selected agent ref
  useEffect(() => {
    selectedAgentIdRef.current = selectedAgentId;
  }, [selectedAgentId]);

  // Recalculate Leaflet map size when tab switches on mobile
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 200);
    }
  }, [mobileTab]);

  // Set up global callback for map popup clicks
  useEffect(() => {
    (window as any).assignRouteFromMap = (clientId: string) => {
      if (!selectedAgentIdRef.current) {
        alert('Пожалуйста, сначала выберите торгового представителя в боковой панели!');
        return;
      }
      handleAssignClientDirectly(clientId);
    };
    (window as any).jumpTimelineToMinutes = (mins: number) => {
      setTimelineTime(mins);
    };
    return () => {
      delete (window as any).assignRouteFromMap;
      delete (window as any).jumpTimelineToMinutes;
    };
  }, [routes, selectedAgentId, date]);


  // WebSocket Live GPS tracking
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.startsWith('192.168.');
    const socketUrl = isProd
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}/gps`
      : `http://${window.location.hostname}:4000/gps`;

    // Connect to GPS namespace
    const socket = io(socketUrl, {
      query: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to GPS WebSocket');
      socket.emit('subscribeLiveTracking');
    });

    socket.on('locationUpdated', (data: any) => {
      console.log('Location updated via WebSocket:', data);
      
      const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const isSupervisor = loggedUser.role === 'SUPERVISOR';

      setAgents((prevAgents) => {
        const index = prevAgents.findIndex((a) => a.userId === data.userId);
        if (index !== -1) {
          const updated = [...prevAgents];
          updated[index] = {
            ...updated[index],
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            batteryLevel: data.batteryLevel,
            recordedAt: data.recordedAt,
          };
          return updated;
        } else {
          // If supervisor, do not add agents that are not in their team list
          if (isSupervisor) {
            return prevAgents;
          }
          return [...prevAgents, {
            userId: data.userId,
            firstName: 'Агент',
            lastName: `ID ${data.userId}`,
            role: 'SALES_REP',
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            batteryLevel: data.batteryLevel,
            recordedAt: data.recordedAt,
            onShift: true,
          }];
        }
      });

      // If the selected agent is the one who moved, append to history track
      if (selectedAgentIdRef.current === data.userId) {
        setHistoryTrack((prevHistory) => [...prevHistory, data]);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from GPS WebSocket');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadData = async () => {
    try {
      const [clientsRes, gpsRes, routesRes, ordersRes, paymentsRes] = await Promise.all([
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/gps/live').catch(() => ({ data: [] })),
        api.get('/routes', { params: { date } }).catch(() => ({ data: [] })),
        api.get('/orders').catch(() => ({ data: [] })),
        api.get('/payments').catch(() => ({ data: [] })),
      ]);
      
      setClients(clientsRes.data);
      setRoutes(routesRes.data);
      
      const ordersList = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data.data || []);
      setOrders(ordersList);
      setPayments(paymentsRes.data || []);
      
      if (gpsRes.data.length > 0) {
        setAgents(gpsRes.data);
      } else {
        // Center around Khujand default presets
        setAgents([
          { userId: '1', firstName: 'Фирдавс', lastName: 'Алиев', role: 'SALES_REP', latitude: 40.2825, longitude: 69.6210, speed: 0, batteryLevel: 85, recordedAt: new Date().toISOString() },
          { userId: '2', firstName: 'Саид', lastName: 'Каримов', role: 'SALES_REP', latitude: 40.2910, longitude: 69.6130, speed: 45, batteryLevel: 92, recordedAt: new Date().toISOString() },
        ]);
      }
    } catch (err) {
      console.error('Failed to load map data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClientDirectly = async (clientId: string) => {
    if (!selectedAgentIdRef.current) return;
    setAssigningRoute(true);
    try {
      const agentRoutes = routes.filter((r) => r.salesRepId === selectedAgentIdRef.current);
      const nextSeq = agentRoutes.length + 1;

      if (agentRoutes.some(r => r.clientId === clientId)) {
        alert('Этот клиент уже добавлен в сегодняшний маршрут агента');
        return;
      }

      await api.post('/routes/assign', {
        salesRepId: selectedAgentIdRef.current,
        clientId,
        plannedDate: date,
        visitSequence: nextSeq,
      });

      setSelectedClientIdToAssign('');
      loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка при назначении маршрутной точки');
    } finally {
      setAssigningRoute(false);
    }
  };

  const handleDeleteRoutePoint = async (routeId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту точку из маршрута?')) return;
    try {
      await api.delete(`/routes/${routeId}`);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка при удалении маршрутной точки');
    }
  };

  const handleOptimizeRoute = async () => {
    if (!selectedAgentId) return;
    setOptimizing(true);
    try {
      await api.post('/routes/optimize', {
        salesRepId: selectedAgentId,
        date,
      });
      loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка при оптимизации маршрута');
    } finally {
      setOptimizing(false);
    }
  };

  const handleCopyRoutes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    try {
      await api.post('/routes/copy', {
        salesRepId: selectedAgentId,
        fromDate: copyDate,
        toDate: date,
      });
      setShowCopyModal(false);
      loadData();
      alert('Маршрут успешно скопирован!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка при копировании маршрута');
    }
  };

  useEffect(() => {
    loadData();
  }, [date]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedAgentId) {
        setHistoryTrack([]);
        return;
      }
      try {
        const response = await api.get(`/gps/history/${selectedAgentId}`, { params: { date } });
        setHistoryTrack(response.data);
        if (Array.isArray(response.data) && response.data.length > 0) {
          const firstPt = response.data[0];
          if (firstPt && firstPt.recordedAt) {
            const d = new Date(firstPt.recordedAt);
            const firstMins = d.getHours() * 60 + d.getMinutes();
            setTimelineTime(firstMins);
          }
        }
      } catch (err) {
        console.error('Failed to load GPS history', err);
      }
    };
    fetchHistory();
  }, [selectedAgentId, date]);

  // Initialize Map
  useEffect(() => {
    if (loading || !mapContainerRef.current) return;

    const centerLat = 38.8610;
    const centerLon = 71.2761;

    const map = L.map(mapContainerRef.current).setView([centerLat, centerLon], 7);
    mapRef.current = map;

    // Tile Layer 1: OpenStreetMap Humanitarian (Vibrant, high detail, 0 watermarks)
    const hotLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles courtesy of <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>',
      maxZoom: 19,
    });

    // Tile Layer 2: Esri Light Gray Canvas (Clean, modern light aesthetic, 0 watermarks)
    const lightGrayLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 19,
    });

    // Tile Layer 3: Esri Topo Map (Rich topographic & street detail, 0 watermarks)
    const topoLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom',
      maxZoom: 19,
    });

    // Tile Layer 4: Esri Street Map (Commercial street map, 0 watermarks)
    const streetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ',
      maxZoom: 19,
    });

    // Tile Layer 5: Esri World Imagery (High-res Satellite view, 0 watermarks)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
      maxZoom: 19,
    });

    // Tile Layer 6: OpenStreetMap Standard
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });

    // Add default reliable high-speed layer (OpenStreetMap Standard - 100% stable & 0 watermarks)
    osmLayer.addTo(map);

    // Layer switcher control (top-right)
    L.control.layers(
      {
        '🌐 Стандартная карта (OpenStreetMap)': osmLayer,
        '🗺️ Топографическая (Esri Topo)': topoLayer,
        '🤍 Светлый минимализм (Esri Light)': lightGrayLayer,
        '🏙️ Городские улицы (Esri Street)': streetLayer,
        '🎨 Детализированная (OSM HOT)': hotLayer,
        '🛰️ Спутниковая карта (Satellite)': satelliteLayer,
      },
      undefined,
      { position: 'topright' }
    ).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loading]);

  const getCheckInWarning = (visit: any, client: any) => {
    if (!visit || !visit.checkInLat || !visit.checkInLon || !client || !client.latitude || !client.longitude) {
      return null;
    }
    const cLat = parseFloat(client.latitude.toString());
    const cLon = parseFloat(client.longitude.toString());
    const vLat = parseFloat(visit.checkInLat.toString());
    const vLon = parseFloat(visit.checkInLon.toString());
    if (isNaN(cLat) || isNaN(cLon) || isNaN(vLat) || isNaN(vLon) || (vLat === 0 && vLon === 0)) {
      return null;
    }
    const R = 6371000;
    const dLat = (vLat - cLat) * Math.PI / 180;
    const dLon = (vLon - cLon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(cLat * Math.PI / 180) * Math.cos(vLat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distMeters = Math.round(R * c);

    if (distMeters > 150) {
      return { isViolation: true, text: `⚠️ Чекин вне геозоны (${distMeters}м от магазина)` };
    }
    return { isViolation: false, text: `✓ В геозоне (${distMeters}м)` };
  };

  // Plot Map Elements (Agents, Clients, Polyline paths)
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    // Clean up old polyline path
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (historyPathRef.current) {
      historyPathRef.current.remove();
      historyPathRef.current = null;
    }

    const agentIcon = L.divIcon({
      className: 'custom-agent-icon',
      html: `<div class="relative w-8 h-8 flex items-center justify-center bg-emerald-600 text-white rounded-full border-2 border-white shadow-md font-bold text-xs"><span class="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40 animate-ping"></span>A</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const activeAgentIcon = L.divIcon({
      className: 'custom-agent-active-icon',
      html: `<div class="relative w-9 h-9 flex items-center justify-center bg-[#0071e3] text-white rounded-full border-3 border-white shadow-lg font-bold text-xs"><span class="absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-60 animate-ping"></span>★</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const routeClientIcon = L.divIcon({
      className: 'custom-route-client-icon',
      html: `<div class="w-7 h-7 bg-amber-500 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-[10px]">📍</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    // Plot clients
    clients.forEach((client) => {
      if (!client.latitude || !client.longitude) return;

      const lat = parseFloat(client.latitude.toString());
      const lon = parseFloat(client.longitude.toString());
      if (isNaN(lat) || isNaN(lon)) return;

      const clientRoutesForDay = routes.filter(r => r.clientId === client.id);
      
      const debtVal = typeof client.currentDebt === 'number' ? client.currentDebt : parseFloat(client.currentDebt || 0) || 0;
      const limitVal = typeof client.creditLimit === 'number' ? client.creditLimit : parseFloat(client.creditLimit || 0) || 0;
      const isOverLimit = limitVal > 0 && debtVal > limitVal;

      if (mapFilter === 'VISITS' && clientRoutesForDay.length === 0) return;
      if (mapFilter === 'DEBT' && !isOverLimit) return;
      
      let markerColor = 'bg-[#86868b]'; // Gray
      let iconSymbol = 'S';
      let statusLabel = 'Не запланирован';
      
      if (clientRoutesForDay.length > 0) {
        const hasVisited = clientRoutesForDay.some(r => r.visited);
        if (hasVisited) {
          markerColor = 'bg-emerald-600'; // Green
          iconSymbol = '✓';
          statusLabel = 'Посещено';
        } else if (isOverLimit) {
          markerColor = 'bg-rose-600'; // Red
          iconSymbol = '$';
          statusLabel = 'Долг (В маршруте)';
        } else {
          markerColor = 'bg-amber-500'; // Yellow
          iconSymbol = '📍';
          statusLabel = 'Запланирован';
        }
      } else if (isOverLimit) {
        markerColor = 'bg-rose-600'; // Red
        iconSymbol = '$';
        statusLabel = 'Долг (Не запланирован)';
      }

      const clientIconDynamic = L.divIcon({
        className: 'custom-client-icon',
        html: `<div class="w-6 h-6 ${markerColor} rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-[9px]">${iconSymbol}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([lat, lon], { icon: clientIconDynamic })
        .addTo(markersGroup)
        .bindPopup(`
          <div class="text-[#37352f] font-sans p-1 min-w-[160px]">
            <h4 class="font-bold text-xs">${client.name || 'Без названия'}</h4>
            <p class="text-[10px] text-slate-500 mt-0.5">${client.address || 'Адрес не указан'}</p>
            <div class="mt-2 pt-1.5 border-t border-slate-100 flex flex-col gap-1 text-[10px]">
              <div><strong>Долг:</strong> <span class="${debtVal > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}">${debtVal.toFixed(2)} TJS</span></div>
              <div><strong>Лимит:</strong> <span class="text-emerald-700 font-bold">${limitVal.toFixed(2)} TJS</span></div>
              <div class="mt-1"><strong>Статус:</strong> <span class="font-semibold text-slate-800">${statusLabel}</span></div>
            </div>
            ${selectedAgentIdRef.current && !clientRoutesForDay.some(r => r.salesRepId === selectedAgentIdRef.current) ? `
              <button onclick="window.assignRouteFromMap('${client.id}')" style="margin-top: 10px; width: 100%; padding: 4px 8px; background: #0071e3; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                Добавить в маршрут
              </button>
            ` : ''}
          </div>
        `);
    });

    const isToday = date === new Date().toISOString().split('T')[0];

    // Plot live agents (Only when viewing today's map)
    if (isToday) {
      agents.forEach((agent) => {
        if (!agent.latitude || !agent.longitude) return;

        const getRoleString = (r: any): string => {
          if (!r) return '';
          if (typeof r === 'string') return r.toUpperCase();
          if (typeof r === 'object') return (r.name || r.code || r.title || '').toString().toUpperCase();
          return String(r).toUpperCase();
        };
        const roleUpper = getRoleString(agent.role);
        if (mapFilter === 'SALES_REP') {
          if (roleUpper.includes('DELIVER') || roleUpper.includes('DRIVER')) return;
        } else if (mapFilter === 'DELIVERY') {
          if (!roleUpper.includes('DELIVER') && !roleUpper.includes('DRIVER')) return;
        } else if (mapFilter === 'SUPERVISOR') {
          if (!roleUpper.includes('SUPERVISOR')) return;
        }

        const isSelected = agent.userId === selectedAgentId;
        L.marker([agent.latitude, agent.longitude], { icon: isSelected ? activeAgentIcon : agentIcon })
          .addTo(markersGroup)
          .bindPopup(`
            <div class="text-[#37352f] font-sans p-0.5">
              <h4 class="font-bold text-xs">${agent.firstName} ${agent.lastName}</h4>
              <p class="text-[10px] text-slate-400 mt-0.5">Торговый представитель (В сети)</p>
              <div class="space-y-0.5 text-[10px] mt-1">
                <div><strong>Батарея:</strong> ${agent.batteryLevel || 100}%</div>
                <div><strong>Скорость:</strong> ${agent.speed || 0} км/ч</div>
              </div>
            </div>
          `);
      });
    }

    // If an agent is selected, gather their routes, sort by visitSequence and draw path
    if (selectedAgentId) {
      const agentRoutes = routes
        .filter((r) => r.salesRepId === selectedAgentId)
        .sort((a, b) => (a.visitSequence || 0) - (b.visitSequence || 0));

      const pathCoords: L.LatLngExpression[] = [];

      // Helper to calculate distance in km
      const getKmDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      // Collect route client coordinates first
      const routeClientCoords: [number, number][] = [];
      agentRoutes.forEach((r) => {
        const cli = clients.find((c) => c.id === r.clientId);
        if (cli && cli.latitude !== null && cli.latitude !== undefined && cli.longitude !== null && cli.longitude !== undefined) {
          const lat = parseFloat(cli.latitude.toString());
          const lon = parseFloat(cli.longitude.toString());
          if (!isNaN(lat) && !isNaN(lon)) {
            routeClientCoords.push([lat, lon]);
            pathCoords.push([lat, lon]);

            // Highlight clients on this agent's active route
            L.marker([lat, lon], { icon: routeClientIcon })
              .addTo(markersGroup)
              .bindPopup(`
                <div class="text-[#37352f] font-sans p-0.5">
                  <h4 class="font-bold text-xs">№${r.visitSequence} - ${cli.name}</h4>
                  <span class="text-[9px] ${r.visited ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'} px-1 py-0.5 rounded font-bold">
                    ${r.visited ? 'Посещено' : 'Ожидает'}
                  </span>
                </div>
              `);
          }
        }
      });

      // Only prepend selected agent's live position if viewing TODAY and within 15 km of the route
      if (isToday) {
        const selectedAgent = agents.find((a) => a.userId === selectedAgentId);
        if (selectedAgent && selectedAgent.latitude !== null && selectedAgent.latitude !== undefined && selectedAgent.longitude !== null && selectedAgent.longitude !== undefined) {
          const agentLat = parseFloat(selectedAgent.latitude.toString());
          const agentLon = parseFloat(selectedAgent.longitude.toString());
          if (!isNaN(agentLat) && !isNaN(agentLon)) {
            if (routeClientCoords.length === 0 || getKmDistance(agentLat, agentLon, routeClientCoords[0][0], routeClientCoords[0][1]) < 15) {
              pathCoords.unshift([agentLat, agentLon]);
            }
          }
        }
      }

      const formatExactGpsTime = (recordedAtStr: any, fallbackMins: number) => {
        if (!recordedAtStr) return formatMinutesToTime(fallbackMins);
        try {
          let str = String(recordedAtStr);
          if (!str.endsWith('Z') && !str.includes('+')) {
            str += '+05:00';
          }
          const d = new Date(str);
          return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Dushanbe' });
        } catch (_) {
          return formatMinutesToTime(fallbackMins);
        }
      };

      // Sort historyTrack points by timestamp
      const rawHistoryPoints = historyTrack
        .filter((pt) => pt.latitude !== null && pt.latitude !== undefined && pt.longitude !== null && pt.longitude !== undefined)
        .map((pt) => {
          const lat = parseFloat(pt.latitude.toString());
          const lon = parseFloat(pt.longitude.toString());
          let mins = 0;
          if (pt.recordedAt) {
            let str = String(pt.recordedAt);
            if (!str.endsWith('Z') && !str.includes('+')) {
              str += '+05:00';
            }
            const dateObj = new Date(str);
            const dushanbeTimeStr = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dushanbe', hour12: false });
            const parts = dushanbeTimeStr.split(':').map(Number);
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              mins = parts[0] * 60 + parts[1];
            } else {
              mins = dateObj.getHours() * 60 + dateObj.getMinutes();
            }
          }
          return { lat, lon, mins, raw: pt };
        })
        .filter((pt) => !isNaN(pt.lat) && !isNaN(pt.lon))
        .sort((a, b) => a.mins - b.mins);

      // Filter out GPS jump anomalies (Outlier rejection: impossible speed >90km/h or short-lived >400m spikes)
      const sortedHistoryPoints: typeof rawHistoryPoints = [];
      for (let i = 0; i < rawHistoryPoints.length; i++) {
        const pt = rawHistoryPoints[i];
        if (sortedHistoryPoints.length === 0) {
          sortedHistoryPoints.push(pt);
        } else {
          const lastPt = sortedHistoryPoints[sortedHistoryPoints.length - 1];
          const distKm = getKmDistance(lastPt.lat, lastPt.lon, pt.lat, pt.lon);
          const timeDiffMins = Math.abs(pt.mins - lastPt.mins);

          // Calculate implied speed between consecutive points
          const speedKmH = timeDiffMins > 0 ? (distKm / (timeDiffMins / 60)) : 0;

          // Reject impossible jumps (>90 km/h city speed, >400m jump within 1 min, or >800m cell-tower jump on low battery <=10%)
          const batLevel = pt.raw?.batteryLevel !== undefined && pt.raw?.batteryLevel !== null ? parseInt(pt.raw.batteryLevel) : 100;
          const isLowBatteryJump = batLevel <= 10 && distKm > 0.8;
          const isOutlierJump = (speedKmH > 90 && distKm > 0.5) || (distKm > 0.4 && timeDiffMins <= 1) || isLowBatteryJump;
          
          if (!isOutlierJump && distKm < 10) {
            sortedHistoryPoints.push(pt);
          }
        }
      }

      // Function to compute continuous time-of-day color gradient
      const getTimeOfDayColor = (mins: number): string => {
        const clamped = Math.max(360, Math.min(1320, mins));
        const t = (clamped - 360) / (1320 - 360); // 0.0 to 1.0

        if (t <= 0.33) {
          // 06:00 - 11:20: Royal Blue (#0071e3) -> Cyan (#06b6d4)
          const factor = t / 0.33;
          const r = Math.round(0 + (6 - 0) * factor);
          const g = Math.round(113 + (182 - 113) * factor);
          const b = Math.round(227 + (212 - 227) * factor);
          return `rgb(${r}, ${g}, ${b})`;
        } else if (t <= 0.66) {
          // 11:20 - 16:40: Cyan (#06b6d4) -> Emerald Green (#10b981)
          const factor = (t - 0.33) / 0.33;
          const r = Math.round(6 + (16 - 6) * factor);
          const g = Math.round(182 + (185 - 182) * factor);
          const b = Math.round(212 + (129 - 212) * factor);
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          // 16:40 - 22:00: Emerald Green (#10b981) -> Amber Orange (#f59e0b)
          const factor = (t - 0.66) / 0.34;
          const r = Math.round(16 + (245 - 16) * factor);
          const g = Math.round(185 + (158 - 185) * factor);
          const b = Math.round(129 + (11 - 129) * factor);
          return `rgb(${r}, ${g}, ${b})`;
        }
      };

      // Filter micro-jitter (<15m jitter while stationary) so lines follow street centerlines cleanly
      const smoothedHistoryPoints: typeof sortedHistoryPoints = [];
      for (let i = 0; i < sortedHistoryPoints.length; i++) {
        const pt = sortedHistoryPoints[i];
        if (smoothedHistoryPoints.length === 0) {
          smoothedHistoryPoints.push(pt);
        } else {
          const lastPt = smoothedHistoryPoints[smoothedHistoryPoints.length - 1];
          const distKm = getKmDistance(lastPt.lat, lastPt.lon, pt.lat, pt.lon);
          const timeDiffMins = Math.abs(pt.mins - lastPt.mins);
          
          // Keep point if moved > 15 meters OR if more than 3 minutes passed
          if (distKm >= 0.015 || timeDiffMins >= 3 || i === sortedHistoryPoints.length - 1) {
            smoothedHistoryPoints.push(pt);
          }
        }
      }

      // 1. Draw smooth continuous time-of-day gradient polyline along streets
      if (smoothedHistoryPoints.length > 1 && mapRef.current) {
        for (let i = 0; i < smoothedHistoryPoints.length - 1; i++) {
          const pt = smoothedHistoryPoints[i];
          const nextPt = smoothedHistoryPoints[i + 1];
          const segmentColor = getTimeOfDayColor(pt.mins);

          const segmentPoly = L.polyline([[pt.lat, pt.lon], [nextPt.lat, nextPt.lon]], {
            color: segmentColor,
            weight: 6,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(mapRef.current);

          segmentPoly.on('click', () => {
            const raw = pt.raw || {};
            const speed = raw.speed !== undefined && raw.speed !== null ? Math.round(Number(raw.speed)) : 0;
            const battery = raw.batteryLevel !== undefined && raw.batteryLevel !== null ? Number(raw.batteryLevel) : 100;
            const isLowBat = battery <= 15;
            const timeStr = formatExactGpsTime(raw.recordedAt, pt.mins);

            L.popup()
              .setLatLng([pt.lat, pt.lon])
              .setContent(`
                <div class="text-[#37352f] font-sans p-1.5 min-w-[190px]">
                  <div class="font-bold text-xs text-[#0071e3] border-b border-slate-100 pb-1 flex items-center justify-between">
                    <span>📍 GPS Точка трека</span>
                    <span class="text-[9px] px-1.5 py-0.5 rounded font-mono text-white" style="background: ${segmentColor}">${formatMinutesToTime(pt.mins)}</span>
                  </div>
                  <div class="mt-2 space-y-1 text-[11px]">
                    <div><strong>🕒 Время:</strong> <span class="font-semibold text-slate-800">${timeStr}</span></div>
                    <div><strong>🚀 Скорость:</strong> <span class="font-semibold text-slate-800">${speed} км/ч</span></div>
                    <div><strong>🔋 Заряд батареи:</strong> <span class="${isLowBat ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}">${battery}% ${isLowBat ? '⚠️ (Энергосбережение)' : ''}</span></div>
                    <div><strong>🌐 Координаты:</strong> ${pt.lat.toFixed(5)}, ${pt.lon.toFixed(5)}</div>
                  </div>
                  <button onclick="window.jumpTimelineToMinutes(${pt.mins})" style="margin-top: 10px; width: 100%; padding: 5px 10px; background: #0071e3; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                    ⏩ Перемотать плеер на ${formatMinutesToTime(pt.mins)}
                  </button>
                </div>
              `)
              .openOn(mapRef.current!);
          });
        }
      }

      // 2. Calculate current interpolated location and traveled track up to timelineTime
      if (sortedHistoryPoints.length > 0 && mapRef.current) {
        let currentLat = sortedHistoryPoints[0].lat;
        let currentLon = sortedHistoryPoints[0].lon;
        let statusNote = `Позиция на ${formatMinutesToTime(timelineTime)}`;

        const firstMins = sortedHistoryPoints[0].mins;
        const lastMins = sortedHistoryPoints[sortedHistoryPoints.length - 1].mins;

        if (sortedHistoryPoints.length === 1 || timelineTime <= firstMins) {
          currentLat = sortedHistoryPoints[0].lat;
          currentLon = sortedHistoryPoints[0].lon;
          statusNote = `Старт дня (${formatMinutesToTime(firstMins)})`;
        } else if (timelineTime >= lastMins) {
          currentLat = sortedHistoryPoints[sortedHistoryPoints.length - 1].lat;
          currentLon = sortedHistoryPoints[sortedHistoryPoints.length - 1].lon;
          statusNote = `Финиш дня (${formatMinutesToTime(lastMins)})`;
        } else {
          // Find bounding segment for timelineTime and interpolate
          for (let i = 0; i < sortedHistoryPoints.length - 1; i++) {
            const p1 = sortedHistoryPoints[i];
            const p2 = sortedHistoryPoints[i + 1];
            if (timelineTime >= p1.mins && timelineTime <= p2.mins) {
              const span = p2.mins - p1.mins;
              const ratio = span > 0 ? (timelineTime - p1.mins) / span : 0;
              currentLat = p1.lat + (p2.lat - p1.lat) * ratio;
              currentLon = p1.lon + (p2.lon - p1.lon) * ratio;
              break;
            }
          }
        }

        // Traveled coords up to timelineTime
        const traveledPoints = sortedHistoryPoints.filter((pt) => pt.mins <= timelineTime);
        const traveledCoords: L.LatLngExpression[] = traveledPoints.map((pt) => [pt.lat, pt.lon]);
        traveledCoords.push([currentLat, currentLon]);

        if (traveledCoords.length > 1) {
          const activeLine = L.polyline(traveledCoords, {
            color: '#10b981',
            weight: 7,
            opacity: 0.9,
          }).addTo(markersGroup);

          activeLine.on('click', (e: L.LeafletMouseEvent) => {
            const clickLat = e.latlng.lat;
            const clickLon = e.latlng.lng;
            let closest = sortedHistoryPoints[0];
            let minDist = Infinity;
            sortedHistoryPoints.forEach((pt) => {
              const dist = Math.hypot(pt.lat - clickLat, pt.lon - clickLon);
              if (dist < minDist) {
                minDist = dist;
                closest = pt;
              }
            });

            if (closest) {
              const raw = closest.raw || {};
              const speed = raw.speed !== undefined && raw.speed !== null ? Math.round(Number(raw.speed)) : 0;
              const battery = raw.batteryLevel !== undefined && raw.batteryLevel !== null ? raw.batteryLevel : '100';
              const timeStr = formatExactGpsTime(raw.recordedAt, closest.mins);

              L.popup()
                .setLatLng([closest.lat, closest.lon])
                .setContent(`
                  <div class="text-[#37352f] font-sans p-1.5 min-w-[170px]">
                    <div class="font-bold text-xs text-[#0071e3] border-b border-slate-100 pb-1 flex items-center gap-1">
                      📍 GPS Точка трека
                    </div>
                    <div class="mt-2 space-y-1 text-[11px]">
                      <div><strong>🕒 Время:</strong> <span class="font-semibold text-slate-800">${timeStr}</span></div>
                      <div><strong>🚀 Скорость:</strong> <span class="font-semibold text-slate-800">${speed} км/ч</span></div>
                      <div><strong>🔋 Заряд батареи:</strong> <span class="font-bold text-emerald-600">${battery}%</span></div>
                      <div><strong>🌐 Координаты:</strong> ${closest.lat.toFixed(5)}, ${closest.lon.toFixed(5)}</div>
                    </div>
                    <button onclick="window.jumpTimelineToMinutes(${closest.mins})" style="margin-top: 10px; width: 100%; padding: 5px 10px; background: #0071e3; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                      ⏩ Перемотать плеер на ${formatMinutesToTime(closest.mins)}
                    </button>
                  </div>
                `)
                .openOn(mapRef.current!);
            }
          });
        }

        const playbackIcon = L.divIcon({
          className: 'custom-playback-icon',
          html: `<div class="relative w-9 h-9 flex items-center justify-center bg-[#0071e3] text-white rounded-full border-2 border-white shadow-xl font-bold text-xs"><span class="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>🎯</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        L.marker([currentLat, currentLon], { icon: playbackIcon })
          .addTo(markersGroup)
          .bindPopup(`
            <div class="text-[#37352f] font-sans p-1 min-w-[150px]">
              <h4 class="font-bold text-xs">🎯 ${statusNote}</h4>
              <p class="text-[10px] text-slate-500 mt-0.5">${selectedAgentDetails ? selectedAgentDetails.firstName + ' ' + selectedAgentDetails.lastName : 'Сотрудник'}</p>
              <p class="text-[9px] text-emerald-600 font-semibold mt-1">Широта: ${currentLat.toFixed(5)}, Долгота: ${currentLon.toFixed(5)}</p>
            </div>
          `);
      }

      // 3. Detect Idle Stops (>10 mins at same spot) & Mark Store Visits vs Idle Parking
      if (sortedHistoryPoints.length > 1 && mapRef.current) {
        let stopStart = sortedHistoryPoints[0];
        let stopEnd = sortedHistoryPoints[0];

        for (let i = 1; i < sortedHistoryPoints.length; i++) {
          const pt = sortedHistoryPoints[i];
          const dist = getKmDistance(stopStart.lat, stopStart.lon, pt.lat, pt.lon);

          if (dist < 0.08) {
            stopEnd = pt;
          } else {
            const durationMins = stopEnd.mins - stopStart.mins;
            if (durationMins >= 10) {
              const nearClient = clients.find((c) => {
                if (!c.latitude || !c.longitude) return false;
                const cLat = parseFloat(c.latitude.toString());
                const cLon = parseFloat(c.longitude.toString());
                return !isNaN(cLat) && !isNaN(cLon) && getKmDistance(stopStart.lat, stopStart.lon, cLat, cLon) < 0.15;
              });

              const isStoreVisit = !!nearClient;
              const stopIcon = L.divIcon({
                className: 'custom-stop-icon',
                html: `<div class="px-2 py-0.5 ${isStoreVisit ? 'bg-emerald-600' : 'bg-rose-600'} text-white text-[10px] font-bold rounded-full border-2 border-white shadow-md flex items-center gap-1">${isStoreVisit ? '🏪' : '🅿️'} ${durationMins}м</div>`,
                iconSize: [60, 24],
                iconAnchor: [30, 12],
              });

              L.marker([stopStart.lat, stopStart.lon], { icon: stopIcon })
                .addTo(markersGroup)
                .bindPopup(`
                  <div class="text-[#37352f] font-sans p-1 min-w-[160px]">
                    <h4 class="font-bold text-xs ${isStoreVisit ? 'text-emerald-700' : 'text-rose-600'} font-bold">
                      ${isStoreVisit ? '🏪 Визит в магазин' : '🅿️ Простой вне маршрута'} (${durationMins} мин)
                    </h4>
                    ${nearClient ? `<p class="text-[10px] font-semibold text-slate-700 mt-0.5">${nearClient.name}</p>` : ''}
                    <p class="text-[9px] text-slate-500 mt-1">Интервал: ${formatMinutesToTime(stopStart.mins)} – ${formatMinutesToTime(stopEnd.mins)}</p>
                  </div>
                `);
            }
            stopStart = pt;
            stopEnd = pt;
          }
        }
      }

      if (pathCoords.length > 1 && mapRef.current) {
        const polyline = L.polyline(pathCoords, {
          color: '#0071e3',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8',
        }).addTo(mapRef.current);
        
        polylineRef.current = polyline;
      }
    }

    // Auto-fit bounds disabled to show all Tajikistan by default
  }, [agents, clients, routes, selectedAgentId, historyTrack, loading, mapFilter, timelineTime]);

  const selectedAgentDetails = agents.find((a) => a.userId === selectedAgentId);
  const selectedAgentRoutes = routes
    .filter((r) => r.salesRepId === selectedAgentId)
    .sort((a, b) => (a.visitSequence || 0) - (b.visitSequence || 0));

  const shiftMetrics = (() => {
    if (!historyTrack || historyTrack.length < 2) return null;
    let totalDistKm = 0;
    let maxSpeed = 0;

    for (let i = 0; i < historyTrack.length - 1; i++) {
      const p1 = historyTrack[i];
      const p2 = historyTrack[i + 1];
      if (p1.latitude && p1.longitude && p2.latitude && p2.longitude) {
        const lat1 = parseFloat(p1.latitude.toString());
        const lon1 = parseFloat(p1.longitude.toString());
        const lat2 = parseFloat(p2.latitude.toString());
        const lon2 = parseFloat(p2.longitude.toString());
        if (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2)) {
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          if (dist < 15) {
            totalDistKm += dist;
          }
        }
      }
      if (p1.speed) {
        const spd = Number(p1.speed);
        if (spd > maxSpeed && spd < 150) maxSpeed = spd;
      }
    }

    return {
      distanceKm: totalDistKm.toFixed(1),
      maxSpeed: Math.round(maxSpeed),
      pointsCount: historyTrack.length,
    };
  })();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="w-8 h-8 border-4 border-slate-200 border-t-[#37352f] rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-140px)] animate-fadeIn text-[#37352f]">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-[#e9e9e7] rounded-xl shadow-sm">
        <div>
          <h3 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#0071e3]" />
            Мониторинг маршрутов (GPS)
          </h3>
          <p className="text-[11px] text-[#86868b] mt-0.5">
            Отслеживание перемещения торговых агентов, последовательности обхода точек и чекинов
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg px-2.5 py-1.5 text-xs text-[#37352f] focus:outline-none"
          />
          <button
            onClick={loadData}
            className="p-1.5 bg-[#f1f1f0] border border-[#e9e9e7] hover:bg-slate-100 rounded-lg text-[#37352f] transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-white p-1 rounded-xl border border-[#e9e9e7] shadow-sm">
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
            mobileTab === 'map' ? 'bg-[#0071e3] text-white shadow-sm' : 'text-[#5f6368] hover:bg-slate-50'
          }`}
        >
          Карта
        </button>
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
            mobileTab === 'list' ? 'bg-[#0071e3] text-white shadow-sm' : 'text-[#5f6368] hover:bg-slate-50'
          }`}
        >
          Агенты и Маршруты
        </button>
      </div>

      {/* Main interactive split view */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
        {/* Left column: Leaflet map view */}
        <div className={`flex-1 bg-white dark:bg-[#191919] border border-[#e9e9e7] dark:border-[#2e2e2e] rounded-xl overflow-hidden shadow-sm relative ${mobileTab === 'map' ? 'block' : 'hidden lg:block'}`}>
          <div ref={mapContainerRef} className="w-full h-full min-h-[300px] z-0" />

          {/* Left Vertical Role/Type Floating Toolbar */}
          <div className="absolute top-4 left-4 z-[400] bg-white/95 dark:bg-[#222]/95 backdrop-blur-md border border-[#e9e9e7] dark:border-[#333] rounded-xl p-1.5 shadow-xl flex flex-col gap-1.5 transition-all">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center py-0.5">Фильтр</span>
            <button
              type="button"
              title="Все категории"
              onClick={() => setMapFilter('ALL')}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                mapFilter === 'ALL' ? 'bg-[#0071e3] text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Все</span>
            </button>
            <button
              type="button"
              title="Торговые представители"
              onClick={() => setMapFilter('SALES_REP')}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                mapFilter === 'SALES_REP' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Торговые</span>
            </button>
            <button
              type="button"
              title="Доставка / Экспедиторы"
              onClick={() => setMapFilter('DELIVERY')}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                mapFilter === 'DELIVERY' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Доставка</span>
            </button>
            <button
              type="button"
              title="Супервайзеры"
              onClick={() => setMapFilter('SUPERVISOR')}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                mapFilter === 'SUPERVISOR' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Супервайзеры</span>
            </button>
            <div className="h-[1px] bg-slate-200 dark:bg-slate-800 my-0.5" />
            <button
              type="button"
              title="Запланированные визиты"
              onClick={() => setMapFilter('VISITS')}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                mapFilter === 'VISITS' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Визиты</span>
            </button>
            <button
              type="button"
              title="Клиенты с превышением лимита задолженности"
              onClick={() => setMapFilter('DEBT')}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                mapFilter === 'DEBT' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Должники</span>
            </button>
            <button
              type="button"
              title="Все магазины (Клиенты)"
              onClick={() => setMapFilter('STORES')}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                mapFilter === 'STORES' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Store className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Магазины</span>
            </button>
          </div>

          {/* Top Right Shift Metrics Summary Widget */}
          {selectedAgentId && (
            <div className="absolute top-4 right-4 z-[400] bg-white/95 dark:bg-[#222]/95 backdrop-blur-md border border-[#e9e9e7] dark:border-[#333] rounded-xl px-3.5 py-2 shadow-xl flex items-center gap-3 text-[#37352f] dark:text-slate-200 transition-all">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#0071e3]" />
                <span className="text-[11px] font-bold">
                  {selectedAgentDetails ? `${selectedAgentDetails.firstName || ''} ${selectedAgentDetails.lastName || ''}`.trim() || 'Сотрудник' : 'Сотрудник'}
                </span>
              </div>
              {shiftMetrics && (
                <>
                  <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-700" />
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">Пробег:</span>
                    <span className="font-bold text-emerald-600">{shiftMetrics.distanceKm} км</span>
                  </div>
                  <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-700" />
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">Макс:</span>
                    <span className="font-bold text-blue-600">{shiftMetrics.maxSpeed} км/ч</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Bottom Timeline History Scrubber / Playback Player */}
          <div className="absolute top-4 right-4 sm:top-auto sm:bottom-4 left-24 sm:left-72 z-[400] bg-white/95 dark:bg-[#222]/95 backdrop-blur-md border border-[#e9e9e7] dark:border-[#333] rounded-xl px-3 py-2 shadow-xl flex items-center gap-2.5 transition-all max-w-[380px] sm:max-w-none">
            <button
              type="button"
              onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
              className="p-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg transition-all shadow-sm flex items-center justify-center shrink-0"
              title={isPlayingTimeline ? 'Пауза' : 'Воспроизведение трека'}
            >
              {isPlayingTimeline ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold font-mono text-slate-800 dark:text-slate-100 w-11">
                {formatMinutesToTime(timelineTime)}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={1435}
              step={5}
              value={timelineTime}
              onChange={(e) => setTimelineTime(Number(e.target.value))}
              className="flex-1 accent-[#0071e3] cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg min-w-[80px]"
            />

            <div className="flex items-center gap-1 shrink-0">
              {[1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setTimelineSpeed(speed)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                    timelineSpeed === speed ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Map Legend Overlay (Обозначения меток) */}
          <div className="absolute bottom-4 left-4 z-[400] bg-white/95 dark:bg-[#222]/95 backdrop-blur-md border border-[#e9e9e7] dark:border-[#333] rounded-xl p-3 shadow-xl max-w-[270px] text-[#37352f] dark:text-slate-200 transition-all">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
              <span className="text-[11px] font-bold tracking-tight flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                <Info className="w-3.5 h-3.5 text-[#0071e3]" />
                Легенда карты (Метки)
              </span>
              <button 
                type="button"
                onClick={() => setShowLegend(!showLegend)} 
                className="text-[10px] text-[#0071e3] hover:underline font-bold"
              >
                {showLegend ? 'Свернуть' : 'Развернуть'}
              </button>
            </div>
            
            {showLegend && (
              <div className="space-y-2 text-[10px] leading-tight">
                <div className="font-bold text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-wider mt-1">Торговые агенты</div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0">A</div>
                  <span className="text-slate-700 dark:text-slate-300">Агент на смене</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#0071e3] text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0">★</div>
                  <span className="text-slate-700 dark:text-slate-300">Выбранный агент</span>
                </div>

                <div className="font-bold text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-wider pt-1.5 border-t border-slate-100 dark:border-slate-800">Торговые точки</div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0">✓</div>
                  <span className="text-slate-700 dark:text-slate-300">Посещенная точка (Визит завершен)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0">📍</div>
                  <span className="text-slate-700 dark:text-slate-300">Запланирована в маршруте</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0">$</div>
                  <span className="text-slate-700 dark:text-slate-300">Превышен лимит (Долг)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#86868b] text-white rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0">S</div>
                  <span className="text-slate-700 dark:text-slate-300">Обычный клиент (Вне маршрута)</span>
                </div>

                <div className="font-bold text-slate-400 dark:text-slate-500 text-[9px] uppercase tracking-wider pt-1.5 border-t border-slate-100 dark:border-slate-800">Линии на карте</div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-0.5 bg-[#0071e3] flex-shrink-0"></div>
                  <span className="text-slate-700 dark:text-slate-300">План маршрута обхода</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-0.5 border-t-2 border-dashed border-emerald-500 flex-shrink-0"></div>
                  <span className="text-slate-700 dark:text-slate-300">Трек движения (GPS история)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Supervisor sidebar panel */}
        <div className={`w-full lg:w-80 bg-white border border-[#e9e9e7] rounded-xl p-4 flex flex-col overflow-hidden shadow-sm ${mobileTab === 'list' ? 'flex' : 'hidden lg:flex'}`}>
          {selectedAgentId && selectedAgentDetails ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Sidebar Header for Selected Agent */}
              <div className="flex items-center gap-2 pb-3 border-b border-[#e9e9e7]">
                <button
                  onClick={() => setSelectedAgentId(null)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-[#e9e9e7] text-[#37352f] rounded-lg text-[10px] font-bold transition-all"
                >
                  ← Назад
                </button>
                <div className="min-w-0">
                  <h4 className="font-bold text-[#1d1d1f] text-xs truncate">
                    {selectedAgentDetails.firstName} {selectedAgentDetails.lastName}
                  </h4>
                  <p className="text-[9px] text-[#86868b] mt-0.5">Планирование маршрута</p>
                </div>
              </div>

              {/* Scrollable planner workspace */}
              <div className="flex-1 overflow-y-auto space-y-4 mt-3 pr-1">
                {/* Route Actions (Optimize & Copy) */}
                <div className="flex gap-2">
                  <button
                    onClick={handleOptimizeRoute}
                    disabled={optimizing || selectedAgentRoutes.length <= 1}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] border border-[#d2e3fc]/30 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${optimizing ? 'animate-spin' : ''}`} />
                    <span>{optimizing ? 'Сортировка...' : 'Оптимизировать'}</span>
                  </button>
                  <button
                    onClick={() => setShowCopyModal(true)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#37352f] border border-[#e9e9e7] rounded-lg text-[10px] font-bold transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Копировать</span>
                  </button>
                </div>

                {/* Warning indicator for overloaded route plans */}
                {selectedAgentRoutes.length > 25 && (
                  <div className="p-2.5 bg-amber-50 text-amber-800 text-[10px] rounded-xl border border-amber-200/50 leading-relaxed">
                    ⚠️ <strong>Высокая нагрузка!</strong> Агенту назначено более 25 точек. Это может снизить качество визитов.
                  </div>
                )}

                {/* Add new route point form */}
                <div className="bg-[#fbfbfa] border border-[#e9e9e7] p-3 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                    Добавить точку в маршрут
                  </span>
                  
                  <div className="flex flex-col gap-2">
                    <select
                      value={selectedClientIdToAssign}
                      onChange={(e) => setSelectedClientIdToAssign(e.target.value)}
                      className="bg-white border border-[#e9e9e7] rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none w-full text-[#37352f] font-medium"
                    >
                      <option value="">Выберите клиента...</option>
                      {clients
                        .filter(c => !selectedAgentRoutes.some(r => r.clientId === c.id))
                        .map((c) => {
                          const isOver = c.creditLimit > 0 && (c.currentDebt || 0) > c.creditLimit;
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name} {isOver ? `🔴 $ (Долг: ${parseFloat(c.currentDebt).toFixed(0)} TJS)` : ''}
                            </option>
                          );
                        })}
                    </select>

                    <button
                      type="button"
                      disabled={!selectedClientIdToAssign || assigningRoute}
                      onClick={() => handleAssignClientDirectly(selectedClientIdToAssign)}
                      className="w-full py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-bold text-[10px] transition-all disabled:opacity-50 shadow-sm"
                    >
                      {assigningRoute ? 'Добавление...' : 'Добавить точку'}
                    </button>
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                  Последовательность обхода
                </span>
                
                {selectedAgentRoutes.length === 0 ? (
                  <p className="text-[11px] text-[#86868b] italic">Нет запланированных точек в маршруте на сегодня.</p>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {selectedAgentRoutes.map((routePoint) => {
                      const cli = clients.find((c) => c.id === routePoint.clientId);
                      const isVisited = routePoint.visited === true;
                      
                      // Find any visit that has an audioUrl, or fallback to the first visit
                      const visitWithAudio = routePoint.visits?.find((v: any) => v.audioUrl);
                      const visit = visitWithAudio || (routePoint.visits && routePoint.visits.length > 0 ? routePoint.visits[0] : null);
                      
                      const sanitizeUrl = (urlStr: string) => {
                        if (!urlStr) return '';
                        return urlStr.replace('https://savdo.tech', window.location.origin);
                      };

                      const audioUrl = sanitizeUrl(visit?.audioUrl || '');
                      
                      // Collect all photo reports from all visits for this route point
                      const photos = routePoint.visits?.flatMap((v: any) => v.photoReports || []).map((p: any) => sanitizeUrl(p.photoUrl)) || [];

                      return (
                        <div key={routePoint.id} className="flex gap-2 items-start p-2 bg-[#fbfbfa] border border-[#e9e9e7] rounded-xl hover:bg-slate-50 transition-colors">
                          {isVisited ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#86868b] mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-1">
                              <span className="text-xs font-bold text-[#37352f] truncate block">
                                {routePoint.visitSequence}. {cli?.name || 'Точка'}
                              </span>
                              {!isVisited && (
                                <button
                                  onClick={() => handleDeleteRoutePoint(routePoint.id)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                                  title="Удалить из маршрута"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <span className="block text-[9px] text-[#86868b] truncate mt-0.5">
                              {cli?.address}
                            </span>
                            {(() => {
                              const warning = getCheckInWarning(visit, cli);
                              if (!warning) return null;
                              return (
                                <div className={`mt-1 px-1.5 py-0.5 text-[9px] font-bold rounded border flex items-center gap-1 ${
                                  warning.isViolation ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  <span>{warning.text}</span>
                                </div>
                              );
                            })()}
                            {audioUrl && (
                              <div className="mt-1.5 p-1 bg-emerald-50 rounded border border-emerald-100 flex flex-col gap-1">
                                <span className="text-[9px] text-emerald-800 font-bold flex items-center gap-1">
                                  🎙️ Запись разговора
                                </span>
                                <audio 
                                  src={audioUrl} 
                                  controls 
                                  className="w-full h-6 scale-90 origin-left"
                                  style={{ outline: 'none' }}
                                />
                              </div>
                            )}
                            {photos.length > 0 && (
                              <div className="mt-1.5 flex gap-1.5 overflow-x-auto py-1">
                                {photos.map((url: string, idx: number) => (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                    <img 
                                      src={url} 
                                      alt="Витрина" 
                                      className="w-10 h-10 rounded-lg object-cover border border-[#e9e9e7] hover:scale-105 transition-all" 
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Visit Productivity Summary dashboard */}
                {selectedAgentRoutes.length > 0 && (() => {
                  const agentOrders = orders.filter(
                    o => o.salesRepId === selectedAgentId && o.createdAt.startsWith(date)
                  );
                  const agentPayments = payments.filter(
                    p => p.salesRepId === selectedAgentId && p.createdAt.startsWith(date)
                  );
                  const totalSum = agentOrders.reduce((acc, o) => acc + parseFloat(o.totalAmount || 0), 0);
                  const totalCash = agentPayments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);

                  return (
                    <div className="border border-[#e9e9e7] bg-[#fbfbfa] p-3 rounded-xl space-y-2 shadow-sm">
                      <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                        Эффективность визитов (Сегодня)
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white border border-[#e9e9e7] p-1.5 rounded-lg">
                          <span className="text-[9px] text-[#86868b] block font-medium">Визиты</span>
                          <span className="text-xs font-bold text-[#1d1d1f]">{selectedAgentRoutes.filter(r => r.visited).length} / {selectedAgentRoutes.length}</span>
                        </div>
                        <div className="bg-white border border-[#e9e9e7] p-1.5 rounded-lg">
                          <span className="text-[9px] text-[#86868b] block font-medium">Заказы</span>
                          <span className="text-xs font-bold text-emerald-700 font-mono" title={`${totalSum.toFixed(2)} TJS`}>
                            {agentOrders.length}
                          </span>
                        </div>
                        <div className="bg-white border border-[#e9e9e7] p-1.5 rounded-lg">
                          <span className="text-[9px] text-[#86868b] block font-medium">Инкассация</span>
                          <span className="text-xs font-bold text-blue-700 font-mono" title={`${totalCash.toFixed(2)} TJS`}>
                            {totalCash > 0 ? `${totalCash.toFixed(0)} TJS` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Default header showing list of agents */}
              <div className="pb-3 border-b border-[#e9e9e7] dark:border-[#333] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#1d1d1f] dark:text-slate-100 text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#0071e3]" />
                    Мониторинг Агентов
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Всего: {agents.length}
                  </span>
                </div>

                {/* Agent Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Поиск сотрудника..."
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#fbfbfa] dark:bg-slate-800 border border-[#e9e9e7] dark:border-slate-700 rounded-lg text-xs text-[#37352f] dark:text-slate-200 focus:outline-none focus:border-[#0071e3]"
                  />
                </div>

                {/* Online/Offline Status Filter Badges */}
                <div className="flex items-center gap-1 pt-1">
                  {(() => {
                    const onlineCount = agents.filter(a => getAgentStatusInfo(a).isOnline).length;
                    const offlineCount = agents.length - onlineCount;
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => setAgentStatusFilter('ALL')}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                            agentStatusFilter === 'ALL'
                              ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-800'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          Все ({agents.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAgentStatusFilter('ONLINE')}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                            agentStatusFilter === 'ONLINE'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          В сети ({onlineCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAgentStatusFilter('OFFLINE')}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                            agentStatusFilter === 'OFFLINE'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          Вне сети ({offlineCount})
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Scrollable list of agents */}
              <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
                {agents
                  .filter((agent) => {
                    const status = getAgentStatusInfo(agent);
                    if (agentStatusFilter === 'ONLINE' && !status.isOnline) return false;
                    if (agentStatusFilter === 'OFFLINE' && status.isOnline) return false;
                    if (agentSearch.trim()) {
                      const fullName = `${agent.firstName} ${agent.lastName}`.toLowerCase();
                      return fullName.includes(agentSearch.toLowerCase());
                    }
                    return true;
                  })
                  .map((agent) => {
                    const isSelected = agent.userId === selectedAgentId;
                    const agentPlanned = routes.filter((r) => r.salesRepId === agent.userId);
                    const agentVisited = agentPlanned.filter((r) => r.visited === true);
                    const statusInfo = getAgentStatusInfo(agent);
                    const roleBadge = getAgentRoleLabel(agent);

                    const agentTodayOrders = orders.filter(o => o.salesRepId === agent.userId && o.createdAt?.startsWith(date));
                    const agentTodayPayments = payments.filter(p => p.salesRepId === agent.userId && p.createdAt?.startsWith(date));
                    const agentSalesSum = agentTodayOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
                    const agentCashSum = agentTodayPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

                    const progressPct = agentPlanned.length > 0 ? Math.round((agentVisited.length / agentPlanned.length) * 100) : 0;

                    return (
                      <div
                        key={agent.userId}
                        onClick={() => setSelectedAgentId(isSelected ? null : agent.userId)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all space-y-2 ${
                          isSelected
                            ? 'border-[#0071e3] bg-blue-50/30 dark:bg-blue-950/20 shadow-sm'
                            : 'border-[#e9e9e7] dark:border-slate-800 bg-[#fbfbfa] dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.color} shrink-0 ${statusInfo.isOnline ? 'animate-pulse' : ''}`} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-[#1d1d1f] dark:text-slate-100">
                                  {agent.firstName} {agent.lastName}
                                </span>
                              </div>
                              <div className="mt-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${roleBadge.badgeClass}`}>
                                  {roleBadge.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] font-mono text-slate-400">
                              🔋 {agent.batteryLevel || 100}%
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAgentId(agent.userId);
                                setMobileTab('map');
                                if (mapRef.current && agent.latitude && agent.longitude) {
                                  const lat = parseFloat(agent.latitude);
                                  const lon = parseFloat(agent.longitude);
                                  if (!isNaN(lat) && !isNaN(lon)) {
                                    mapRef.current.setView([lat, lon], 15);
                                  }
                                }
                              }}
                              className="px-2 py-0.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[9px] font-bold rounded-md transition-all flex items-center gap-1 shadow-sm"
                            >
                              <MapPin className="w-2.5 h-2.5" />
                              <span>На карту</span>
                            </button>
                          </div>
                        </div>

                        {/* Visit Progress bar */}
                        {agentPlanned.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[9px] text-slate-500 font-medium">
                              <span>Прогресс визитов</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{agentVisited.length} / {agentPlanned.length} ({progressPct}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                          <span className={`px-2 py-0.5 rounded-md border font-semibold text-[9px] ${statusInfo.badgeClass}`}>
                            {statusInfo.text}
                          </span>
                          <div className="flex items-center gap-2 text-[9px] font-mono">
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold" title="Продажи за день">
                              🛒 {agentSalesSum > 0 ? `${agentSalesSum.toFixed(0)} TJS` : '0 TJS'}
                            </span>
                            <span className="text-blue-700 dark:text-blue-400 font-bold" title="Собрано оплат за день">
                              💵 {agentCashSum > 0 ? `${agentCashSum.toFixed(0)} TJS` : '0 TJS'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Copy Route Modal Overlay */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-[#e9e9e7] w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-scaleUp text-[#37352f]">
            <div className="flex justify-between items-center bg-[#fbfbfa] border-b border-[#e9e9e7] p-4">
              <div>
                <h4 className="font-bold text-[#1d1d1f] text-sm">Копирование маршрута</h4>
                <p className="text-[10px] text-[#86868b] mt-0.5">
                  Агент: {selectedAgentDetails?.firstName} {selectedAgentDetails?.lastName}
                </p>
              </div>
              <button
                onClick={() => setShowCopyModal(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCopyRoutes} className="p-4 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">
                  Дата-источник (откуда копировать)
                </label>
                <input
                  type="date"
                  required
                  value={copyDate}
                  onChange={(e) => setCopyDate(e.target.value)}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f]"
                />
              </div>

              <div className="bg-blue-50 text-[#1a73e8] p-2.5 rounded-lg text-[10px] leading-relaxed border border-blue-100">
                ℹ️ Все не посещенные точки на выбранную целевую дату ({date}) будут заменены маршрутом из даты-источника.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  className="px-3 py-1.5 border border-[#e9e9e7] bg-white hover:bg-slate-50 text-[11px] font-bold rounded-lg transition-colors text-[#5f6368]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[11px] font-bold rounded-lg transition-colors"
                >
                  Скопировать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
