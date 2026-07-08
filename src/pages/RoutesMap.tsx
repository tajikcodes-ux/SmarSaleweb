import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { io } from 'socket.io-client';
import api from '../services/api';
import { MapPin, Users, RefreshCw, CheckCircle2, Circle } from 'lucide-react';

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
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const selectedAgentIdRef = useRef<string | null>(null);
  const [historyTrack, setHistoryTrack] = useState<any[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Sync selected agent ref
  useEffect(() => {
    selectedAgentIdRef.current = selectedAgentId;
  }, [selectedAgentId]);

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
      const [clientsRes, gpsRes, routesRes] = await Promise.all([
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/gps/live').catch(() => ({ data: [] })),
        api.get('/routes', { params: { date } }).catch(() => ({ data: [] })),
      ]);
      
      setClients(clientsRes.data);
      setRoutes(routesRes.data);
      
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

    const centerLat = 40.2833;
    const centerLon = 69.6167;

    const map = L.map(mapContainerRef.current).setView([centerLat, centerLon], 13);
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

    const clientIcon = L.divIcon({
      className: 'custom-client-icon',
      html: `<div class="w-6 h-6 bg-[#86868b] rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-[9px]">S</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
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
      L.marker([client.latitude, client.longitude], { icon: clientIcon })
        .addTo(markersGroup)
        .bindPopup(`
          <div class="text-[#37352f] font-sans p-0.5">
            <h4 class="font-bold text-xs">${client.name}</h4>
            <p class="text-[10px] text-slate-500 mt-0.5">${client.address}</p>
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

    // Auto-fit bounds to all clients on initial load if no agent is selected
    if (clients.length > 0 && !selectedAgentId && mapRef.current) {
      const clientCoords = clients
        .filter((c) => c.latitude !== null && c.latitude !== undefined && c.longitude !== null && c.longitude !== undefined)
        .map((c) => [parseFloat(c.latitude.toString()), parseFloat(c.longitude.toString())])
        .filter((coords) => !isNaN(coords[0]) && !isNaN(coords[1])) as L.LatLngExpression[];
      if (clientCoords.length > 0) {
        mapRef.current.fitBounds(L.latLngBounds(clientCoords), { padding: [50, 50] });
      }
    }
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

      {/* Main interactive split view */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
        {/* Left column: Leaflet map view */}
        <div className="flex-1 bg-white border border-[#e9e9e7] rounded-xl overflow-hidden shadow-sm relative">
          <div ref={mapContainerRef} className="w-full h-full min-h-[300px] z-0" />
        </div>

        {/* Right column: Supervisor sidebar panel */}
        <div className="w-full lg:w-80 bg-white border border-[#e9e9e7] rounded-xl p-4 flex flex-col overflow-hidden shadow-sm">
          <h4 className="font-bold text-[#1d1d1f] text-xs pb-3 border-b border-[#e9e9e7] flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#86868b]" />
            Список Агентов на карте
          </h4>

          {/* Agents List Selection */}
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

            {/* Selected Agent Details & Target points */}
            {selectedAgentId && selectedAgentDetails && (
              <div className="mt-4 pt-4 border-t border-[#e9e9e7] space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                  Последовательность обхода
                </span>
                
                {selectedAgentRoutes.length === 0 ? (
                  <p className="text-[11px] text-[#86868b] italic">Нет запланированных точек в маршруте на сегодня.</p>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {selectedAgentRoutes.map((routePoint) => {
                      const cli = clients.find((c) => c.id === routePoint.clientId);
                      const isVisited = routePoint.visited === true;
                      const visit = routePoint.visits && routePoint.visits.length > 0 ? routePoint.visits[0] : null;
                      const audioUrl = visit?.audioUrl;

                      return (
                        <div key={routePoint.id} className="flex gap-2 items-start p-2 bg-[#fbfbfa] border border-[#e9e9e7] rounded">
                          {isVisited ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#86868b] mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-[#37352f] block truncate">
                              {routePoint.visitSequence}. {cli?.name || 'Точка'}
                            </span>
                            <span className="block text-[9px] text-[#86868b] truncate">
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
