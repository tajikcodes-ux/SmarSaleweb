import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { io } from 'socket.io-client';
import api from '../services/api';
import { MapPin, Users, RefreshCw, CheckCircle2, Circle, Trash, Copy, Sparkles } from 'lucide-react';

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
    return () => {
      delete (window as any).assignRouteFromMap;
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loading]);

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

    // Plot agents
    agents.forEach((agent) => {
      if (!agent.latitude || !agent.longitude) return;
      const isSelected = agent.userId === selectedAgentId;
      L.marker([agent.latitude, agent.longitude], { icon: isSelected ? activeAgentIcon : agentIcon })
        .addTo(markersGroup)
        .bindPopup(`
          <div class="text-[#37352f] font-sans p-0.5">
            <h4 class="font-bold text-xs">${agent.firstName} ${agent.lastName}</h4>
            <p class="text-[10px] text-slate-400 mt-0.5">Торговый представитель</p>
            <div class="space-y-0.5 text-[10px] mt-1">
              <div><strong>Батарея:</strong> ${agent.batteryLevel || 100}%</div>
              <div><strong>Скорость:</strong> ${agent.speed || 0} км/ч</div>
            </div>
          </div>
        `);
    });

    // If an agent is selected, gather their routes, sort by visitSequence and draw path
    if (selectedAgentId) {
      const agentRoutes = routes
        .filter((r) => r.salesRepId === selectedAgentId)
        .sort((a, b) => (a.visitSequence || 0) - (b.visitSequence || 0));

      const pathCoords: L.LatLngExpression[] = [];

      // Find selected agent's position to start the path
      const selectedAgent = agents.find((a) => a.userId === selectedAgentId);
      if (selectedAgent && selectedAgent.latitude !== null && selectedAgent.latitude !== undefined && selectedAgent.longitude !== null && selectedAgent.longitude !== undefined) {
        const agentLat = parseFloat(selectedAgent.latitude.toString());
        const agentLon = parseFloat(selectedAgent.longitude.toString());
        if (!isNaN(agentLat) && !isNaN(agentLon)) {
          pathCoords.push([agentLat, agentLon]);
        }
      }

      agentRoutes.forEach((r) => {
        const cli = clients.find((c) => c.id === r.clientId);
        if (cli && cli.latitude !== null && cli.latitude !== undefined && cli.longitude !== null && cli.longitude !== undefined) {
          const lat = parseFloat(cli.latitude.toString());
          const lon = parseFloat(cli.longitude.toString());
          if (!isNaN(lat) && !isNaN(lon)) {
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

      // Draw actual history path
      const validHistoryCoords = historyTrack
        .filter((pt) => pt.latitude !== null && pt.latitude !== undefined && pt.longitude !== null && pt.longitude !== undefined)
        .map((pt) => [parseFloat(pt.latitude.toString()), parseFloat(pt.longitude.toString())])
        .filter((coords) => !isNaN(coords[0]) && !isNaN(coords[1])) as L.LatLngExpression[];

      if (validHistoryCoords.length > 1 && mapRef.current) {
        const actualPath = L.polyline(validHistoryCoords, {
          color: '#10b981',
          weight: 5,
          opacity: 0.8,
        }).addTo(mapRef.current);
        
        historyPathRef.current = actualPath;
        try {
          const bounds = actualPath.getBounds();
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [40, 40] });
          }
        } catch (e) {
          console.warn(e);
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
        if (validHistoryCoords.length <= 1) {
          try {
            const bounds = polyline.getBounds();
            if (bounds.isValid()) {
              mapRef.current.fitBounds(bounds, { padding: [40, 40] });
            }
          } catch (e) {
            console.warn(e);
          }
        }
      }

      // Pan to selected agent if they only have 1 coordinate (no history line yet)
      const activeAgent = agents.find((a) => a.userId === selectedAgentId);
      if (activeAgent && activeAgent.latitude !== null && activeAgent.latitude !== undefined && activeAgent.longitude !== null && activeAgent.longitude !== undefined && mapRef.current && validHistoryCoords.length <= 1) {
        const agentLat = parseFloat(activeAgent.latitude.toString());
        const agentLon = parseFloat(activeAgent.longitude.toString());
        if (!isNaN(agentLat) && !isNaN(agentLon)) {
          mapRef.current.setView([agentLat, agentLon], 15);
        }
      }
    }

    // Auto-fit bounds disabled to show all Tajikistan by default
  }, [agents, clients, routes, selectedAgentId, historyTrack, loading]);

  const selectedAgentDetails = agents.find((a) => a.userId === selectedAgentId);
  const selectedAgentRoutes = routes
    .filter((r) => r.salesRepId === selectedAgentId)
    .sort((a, b) => (a.visitSequence || 0) - (b.visitSequence || 0));

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
        <div className={`flex-1 bg-white border border-[#e9e9e7] rounded-xl overflow-hidden shadow-sm relative ${mobileTab === 'map' ? 'block' : 'hidden lg:block'}`}>
          <div ref={mapContainerRef} className="w-full h-full min-h-[300px] z-0" />
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
                      const visit = routePoint.visits && routePoint.visits.length > 0 ? routePoint.visits[0] : null;
                      const audioUrl = visit?.audioUrl;

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
                            {audioUrl && (
                              <div className="mt-1.5 p-1 bg-emerald-50 rounded border border-emerald-100 flex flex-col gap-1">
                                <span className="text-[9px] text-emerald-800 font-bold flex items-center gap-1">
                                  🎙️ Запись разговора
                                </span>
                                <audio 
                                  src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
                                  controls 
                                  className="w-full h-6 scale-90 origin-left"
                                  style={{ outline: 'none' }}
                                />
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
              <h4 className="font-bold text-[#1d1d1f] text-xs pb-3 border-b border-[#e9e9e7] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#86868b]" />
                Список Агентов на карте
              </h4>

              {/* Scrollable list of agents */}
              <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
                {agents.map((agent) => {
                  const isSelected = agent.userId === selectedAgentId;
                  const agentPlanned = routes.filter((r) => r.salesRepId === agent.userId);
                  const agentVisited = agentPlanned.filter((r) => r.visited === true);

                  return (
                    <div
                      key={agent.userId}
                      onClick={() => setSelectedAgentId(isSelected ? null : agent.userId)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#0071e3] bg-blue-50/20'
                          : 'border-[#e9e9e7] bg-[#fbfbfa] hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-[#1d1d1f]">
                            {agent.firstName} {agent.lastName}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${
                            agent.onShift ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                          }`} title={agent.onShift ? 'На смене' : 'Вне смены'} />
                        </div>
                        <span className="text-[9px] font-mono text-[#86868b]">
                          Батарея: {agent.batteryLevel || 100}%
                        </span>
                      </div>
                      <span className="block text-[10px] text-[#86868b] mt-0.5">
                        Маршрут: {agentVisited.length} / {agentPlanned.length} точек пройдено
                      </span>
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
