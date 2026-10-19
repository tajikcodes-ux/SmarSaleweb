import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

try {
  if (maplibreWorkerUrl) {
    maplibregl.setWorkerUrl(maplibreWorkerUrl);
  }
} catch (e) {
  console.warn('Failed to set worker URL', e);
}
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass } from 'lucide-react';

interface MapLibreViewProps {
  clients: any[];
  agents: any[];
  routes: any[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  onAssignClient: (clientId: string) => void;
  historyTrack: any[];
  timelineTime?: number;
  showRoadRoutes: boolean;
  showLiveAgents: boolean;
  showClients: boolean;
  showLandmarks?: boolean;
  showMarketLeads: boolean;
  marketLeads: any[];
  onConvertLead: (lead: any) => void;
  mapFilter: 'ALL' | 'SALES_REP' | 'DELIVERY' | 'SUPERVISOR' | 'VISITS' | 'DEBT' | 'STORES';
  is3D: boolean;
  onToggle3D: () => void;
  searchFocusedPoint: { lat: number; lon: number; name?: string } | null;
}

export default function MapLibreView({
  clients,
  agents,
  routes,
  selectedAgentId,
  onSelectAgent,
  onAssignClient,
  historyTrack,
  showRoadRoutes,
  showLiveAgents,
  showClients,
  showMarketLeads,
  marketLeads,
  onConvertLead,
  mapFilter,
  is3D,
  onToggle3D,
  searchFocusedPoint,
}: MapLibreViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [currentStyle, setCurrentStyle] = useState<'liberty' | 'dark' | 'bright'>(() => {
    const isDark = document.documentElement.classList.contains('dark');
    return isDark ? 'dark' : 'liberty';
  });

  // Track system or classList dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      setIsDarkMode(dark);
      const targetStyle = dark ? 'dark' : 'liberty';
      if (currentStyle !== targetStyle && mapRef.current) {
        setCurrentStyle(targetStyle);
        mapRef.current.setStyle(`https://tiles.openfreemap.org/styles/${targetStyle}`);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [currentStyle]);

  // 1. Initialize MapLibre
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Sughd / Khujand center coordinates
    const initialLng = 69.6210;
    const initialLat = 40.2825;

    const styleUrl = isDarkMode
      ? 'https://tiles.openfreemap.org/styles/dark'
      : 'https://tiles.openfreemap.org/styles/liberty';

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [initialLng, initialLat],
      zoom: 12.8,
      pitch: is3D ? 58 : 0,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    const setupAll = () => {
      setup3DBuildings(map, isDarkMode);
      initLayersAndSources(map);
      updateClientData(map);
      updateAgentsData(map);
      updateLeadsData(map);
      updateRouteData(map);
    };

    map.on('load', setupAll);
    map.on('style.load', setupAll);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Setup 3D Building Extrusions
  const setup3DBuildings = (map: maplibregl.Map, dark: boolean) => {
    try {
      if (map.getLayer('3d-buildings')) return;

      const layers = map.getStyle().layers || [];
      let labelLayerId: string | undefined;
      for (const layer of layers) {
        if (layer.type === 'symbol' && layer.layout && (layer.layout as any)['text-field']) {
          labelLayerId = layer.id;
          break;
        }
      }

      if (map.getSource('openmaptiles')) {
        map.addLayer(
          {
            id: '3d-buildings',
            source: 'openmaptiles',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': dark ? '#272d38' : '#e2e8f0',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.5,
                ['coalesce', ['get', 'render_height'], 12],
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.5,
                ['coalesce', ['get', 'render_min_height'], 0],
              ],
              'fill-extrusion-opacity': 0.85,
            },
          },
          labelLayerId
        );
      }
    } catch (e) {
      console.warn('3D Buildings layer setup skipped:', e);
    }
  };

  // 3. Initialize Custom GeoJSON Sources & Layers
  const initLayersAndSources = (map: maplibregl.Map) => {
    // ----------------------------------------------------
    // A. Clients Source & Layers (GPU WebGL)
    // ----------------------------------------------------
    if (!map.getSource('clients-source')) {
      map.addSource('clients-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Outer soft halo
      map.addLayer({
        id: 'clients-halo',
        type: 'circle',
        source: 'clients-source',
        minzoom: 11,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 16, 11],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.25,
        },
      });

      // Inner crisp circle
      map.addLayer({
        id: 'clients-circle',
        type: 'circle',
        source: 'clients-source',
        minzoom: 11,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3.5, 16, 7],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 1.8,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });

      // Name caption (visible when zoom >= 15.5)
      map.addLayer({
        id: 'clients-label',
        type: 'symbol',
        source: 'clients-source',
        minzoom: 15.5,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-optional': true,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': isDarkMode ? '#f1f5f9' : '#1e293b',
          'text-halo-color': isDarkMode ? '#0f172a' : '#ffffff',
          'text-halo-width': 1.8,
        },
      });

      // Click event for client popup
      map.on('click', 'clients-circle', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = (feature.properties || {}) as any;
        const coordinates = (feature.geometry as any).coordinates.slice();

        const debtNum = parseFloat(props.balance || 0);
        const debtBadge = debtNum > 0
          ? `<span style="color: #e11d48; font-weight: bold;">Долг: ${debtNum.toLocaleString()} TJS</span>`
          : `<span style="color: #10b981; font-weight: bold;">Баланс в норме</span>`;

        const popupHtml = `
          <div style="font-family: inherit; padding: 6px; min-width: 180px; color: #1e293b;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0071e3;">
                ${props.category || 'Торговая точка'}
              </span>
              <span style="font-size: 10px; padding: 2px 6px; border-radius: 9999px; background: ${props.statusBg || '#f1f5f9'}; color: ${props.statusColor || '#475569'}; font-weight: bold;">
                ${props.statusLabel}
              </span>
            </div>
            <h4 style="font-weight: 700; font-size: 13px; margin: 4px 0 2px 0;">${props.name}</h4>
            <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0;">${props.address || 'Адрес не указан'}</p>
            <div style="font-size: 11px; margin-bottom: 8px; padding-top: 4px; border-top: 1px solid #f1f5f9;">
              ${debtBadge}
            </div>
            ${props.phone ? `<p style="font-size: 10px; color: #64748b; margin-bottom: 8px;">📞 ${props.phone}</p>` : ''}
            <button id="btn-assign-client-${props.id}" style="width: 100%; padding: 6px 10px; background: #0071e3; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
              ⚡ Добавить в маршрут
            </button>
          </div>
        `;

        new maplibregl.Popup({ offset: 12, closeButton: true })
          .setLngLat(coordinates)
          .setHTML(popupHtml)
          .addTo(map);

        setTimeout(() => {
          const btn = document.getElementById(`btn-assign-client-${props.id}`);
          if (btn) {
            btn.onclick = () => onAssignClient(props.id);
          }
        }, 100);
      });

      map.on('mouseenter', 'clients-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'clients-circle', () => {
        map.getCanvas().style.cursor = '';
      });
    }

    // ----------------------------------------------------
    // B. Live Agents Source & Layers (GPU WebGL Zero-Lag)
    // ----------------------------------------------------
    if (!map.getSource('agents-source')) {
      map.addSource('agents-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Agent Outer Aura / Halo
      map.addLayer({
        id: 'agents-halo',
        type: 'circle',
        source: 'agents-source',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 14, 16, 20],
          'circle-color': ['get', 'haloColor'],
          'circle-opacity': 0.35,
        },
      });

      // Agent Core Circle
      map.addLayer({
        id: 'agents-circle',
        type: 'circle',
        source: 'agents-source',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 10, 16, 14],
          'circle-color': ['get', 'bgColor'],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1,
        },
      });

      // Agent Initials centered
      map.addLayer({
        id: 'agents-initials',
        type: 'symbol',
        source: 'agents-source',
        layout: {
          'text-field': ['get', 'initials'],
          'text-size': 11,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Agent Name under circle (zoom >= 12.5)
      map.addLayer({
        id: 'agents-name',
        type: 'symbol',
        source: 'agents-source',
        minzoom: 12.5,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.8],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': isDarkMode ? '#f8fafc' : '#0f172a',
          'text-halo-color': isDarkMode ? '#0f172a' : '#ffffff',
          'text-halo-width': 2,
        },
      });

      // Click event for agent popup
      map.on('click', 'agents-circle', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = (feature.properties || {}) as any;
        const coordinates = (feature.geometry as any).coordinates.slice();

        onSelectAgent(props.userId);

        const popupHtml = `
          <div style="font-family: inherit; padding: 6px; min-width: 170px; color: #1e293b;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0071e3;">
                ${props.role === 'SALES_REP' ? 'Торговый представитель' : props.role}
              </span>
              <span style="font-size: 9px; padding: 2px 6px; border-radius: 9999px; background: ${props.onShift ? '#dcfce7' : '#f1f5f9'}; color: ${props.onShift ? '#15803d' : '#64748b'}; font-weight: bold;">
                ${props.onShift ? 'В смене' : 'Не в смене'}
              </span>
            </div>
            <h4 style="font-weight: 700; font-size: 13px; margin: 4px 0 2px 0;">${props.name}</h4>
            <div style="font-size: 10px; margin-top: 6px; padding-top: 4px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
              <span>🔋 Заряд: <strong>${props.batteryLevel}%</strong></span>
              <span>🚀 Скорость: <strong>${props.speed} км/ч</strong></span>
            </div>
          </div>
        `;

        new maplibregl.Popup({ offset: 14 })
          .setLngLat(coordinates)
          .setHTML(popupHtml)
          .addTo(map);
      });

      map.on('mouseenter', 'agents-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'agents-circle', () => {
        map.getCanvas().style.cursor = '';
      });
    }

    // ----------------------------------------------------
    // C. Market Leads Source & Layers (GPU WebGL Zero-Lag)
    // ----------------------------------------------------
    if (!map.getSource('market-leads-source')) {
      map.addSource('market-leads-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'market-leads-circle',
        type: 'circle',
        source: 'market-leads-source',
        paint: {
          'circle-radius': 11,
          'circle-color': ['get', 'bgColor'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'market-leads-icon',
        type: 'symbol',
        source: 'market-leads-source',
        layout: {
          'text-field': ['get', 'icon'],
          'text-size': 11,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
      });

      map.addLayer({
        id: 'market-leads-label',
        type: 'symbol',
        source: 'market-leads-source',
        minzoom: 14,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-optional': true,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': isDarkMode ? '#f8fafc' : '#1e293b',
          'text-halo-color': isDarkMode ? '#0f172a' : '#ffffff',
          'text-halo-width': 1.6,
        },
      });

      map.on('click', 'market-leads-circle', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = (feature.properties || {}) as any;
        const coordinates = (feature.geometry as any).coordinates.slice();

        const popupHtml = `
          <div style="font-family: inherit; padding: 6px; min-width: 170px; color: #1e293b;">
            <span style="font-size: 9px; font-weight: 800; color: #d97706; text-transform: uppercase;">Потенциальный клиент</span>
            <h4 style="font-weight: 700; font-size: 12px; margin: 2px 0 2px 0;">${props.name}</h4>
            <p style="font-size: 10px; color: #64748b; margin: 0 0 6px 0;">${props.address || ''}</p>
            <button id="btn-convert-lead-${props.id}" style="width: 100%; padding: 5px 8px; background: #0071e3; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
              ⚡ Сделать клиентом
            </button>
          </div>
        `;

        new maplibregl.Popup({ offset: 14 })
          .setLngLat(coordinates)
          .setHTML(popupHtml)
          .addTo(map);

        setTimeout(() => {
          const btn = document.getElementById(`btn-convert-lead-${props.id}`);
          if (btn) {
            btn.onclick = () => onConvertLead(props);
          }
        }, 100);
      });

      map.on('mouseenter', 'market-leads-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'market-leads-circle', () => {
        map.getCanvas().style.cursor = '';
      });
    }

    // ----------------------------------------------------
    // D. Routes and GPS History Paths
    // ----------------------------------------------------
    if (!map.getSource('route-source')) {
      map.addSource('route-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#0071e3',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 5],
          'line-opacity': 0.85,
        },
      });

      if (!map.getSource('history-track-source')) {
        map.addSource('history-track-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'history-track-line',
          type: 'line',
          source: 'history-track-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#10b981',
            'line-width': 4,
            'line-dasharray': [2, 2],
            'line-opacity': 0.9,
          },
        });
      }
    }
  };

  // 4. Update Client Points GeoJSON (GPU)
  const updateClientData = (map: maplibregl.Map) => {
    const source = map.getSource('clients-source') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (!showClients) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const filteredClients = clients.filter((client) => {
      if (!client.latitude || !client.longitude) return false;
      const lat = parseFloat(client.latitude);
      const lon = parseFloat(client.longitude);
      if (isNaN(lat) || isNaN(lon)) return false;

      if (mapFilter === 'DEBT') {
        return parseFloat(client.balance || 0) > 0;
      }
      return true;
    });

    const features = filteredClients.map((client) => {
      const lat = parseFloat(client.latitude);
      const lon = parseFloat(client.longitude);

      const clientRoute = routes.find((r) => r.clientId === client.id);
      const isVisited = clientRoute?.status === 'COMPLETED';
      const isPlanned = !!clientRoute;
      const hasDebt = parseFloat(client.balance || 0) > 0;

      let color = '#86868b';
      let statusLabel = 'Вне маршрута';
      let statusBg = '#f1f5f9';
      let statusColor = '#64748b';

      if (isVisited) {
        color = '#10b981';
        statusLabel = 'Визит завершен';
        statusBg = '#d1fae5';
        statusColor = '#065f46';
      } else if (isPlanned) {
        color = '#f59e0b';
        statusLabel = 'В плане';
        statusBg = '#fef3c7';
        statusColor = '#92400e';
      } else if (hasDebt) {
        color = '#e11d48';
        statusLabel = 'Задолженность';
        statusBg = '#ffe4e6';
        statusColor = '#9f1239';
      }

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          id: client.id,
          name: client.name,
          address: client.address,
          category: client.category,
          balance: client.balance,
          phone: client.phone,
          color,
          statusLabel,
          statusBg,
          statusColor,
        },
      };
    });

    source.setData({
      type: 'FeatureCollection',
      features: features as any,
    });
  };

  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      updateClientData(mapRef.current);
    }
  }, [clients, routes, showClients, mapFilter]);

  // 5. Update Live Agents GeoJSON (GPU Zero-Lag)
  const updateAgentsData = (map: maplibregl.Map) => {
    const source = map.getSource('agents-source') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (!showLiveAgents) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const features = agents
      .filter((agent) => agent.latitude && agent.longitude)
      .map((agent) => {
        const lat = parseFloat(agent.latitude);
        const lon = parseFloat(agent.longitude);
        const isSelected = selectedAgentId === agent.userId;
        const initials = ((agent.firstName?.[0] || 'A') + (agent.lastName?.[0] || '')).toUpperCase();

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lon, lat],
          },
          properties: {
            userId: agent.userId,
            name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim(),
            initials: isSelected ? '★' : initials,
            role: agent.role,
            speed: agent.speed || 0,
            batteryLevel: agent.batteryLevel || 100,
            onShift: !!agent.onShift,
            bgColor: isSelected ? '#0071e3' : '#10b981',
            haloColor: isSelected ? '#3b82f6' : '#34d399',
          },
        };
      });

    source.setData({
      type: 'FeatureCollection',
      features: features as any,
    });
  };

  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      updateAgentsData(mapRef.current);
    }
  }, [agents, selectedAgentId, showLiveAgents]);

  // 6. Update Market Leads GeoJSON (GPU Zero-Lag)
  const updateLeadsData = (map: maplibregl.Map) => {
    const source = map.getSource('market-leads-source') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (!showMarketLeads || marketLeads.length === 0) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const features = marketLeads
      .filter((lead) => lead.latitude && lead.longitude)
      .map((lead) => {
        const lat = parseFloat(lead.latitude);
        const lon = parseFloat(lead.longitude);

        let icon = '🏪';
        let bgColor = '#f59e0b';
        if (lead.category === 'CAFE') {
          icon = '☕';
          bgColor = '#9333ea';
        } else if (lead.category === 'PHARMACY') {
          icon = '💊';
          bgColor = '#0d9488';
        }

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lon, lat],
          },
          properties: {
            id: lead.id || lat,
            name: lead.name,
            address: lead.address || '',
            category: lead.category,
            icon,
            bgColor,
          },
        };
      });

    source.setData({
      type: 'FeatureCollection',
      features: features as any,
    });
  };

  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      updateLeadsData(mapRef.current);
    }
  }, [marketLeads, showMarketLeads]);

  // 7. Update Route Lines & History Track
  const updateRouteData = (map: maplibregl.Map) => {
    const routeSource = map.getSource('route-source') as maplibregl.GeoJSONSource;
    const historySource = map.getSource('history-track-source') as maplibregl.GeoJSONSource;

    if (routeSource) {
      if (!selectedAgentId || !showRoadRoutes) {
        routeSource.setData({ type: 'FeatureCollection', features: [] });
      } else {
        const agentRoutes = routes
          .filter((r) => r.salesRepId === selectedAgentId)
          .sort((a, b) => a.sequence - b.sequence);

        const coords: [number, number][] = [];
        agentRoutes.forEach((r) => {
          const c = clients.find((client) => client.id === r.clientId);
          if (c && c.latitude && c.longitude) {
            const lat = parseFloat(c.latitude);
            const lon = parseFloat(c.longitude);
            if (!isNaN(lat) && !isNaN(lon)) {
              coords.push([lon, lat]);
            }
          }
        });

        if (coords.length > 1) {
          routeSource.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: coords,
                },
                properties: {},
              },
            ],
          });
        } else {
          routeSource.setData({ type: 'FeatureCollection', features: [] });
        }
      }
    }

    if (historySource) {
      if (!selectedAgentId || historyTrack.length < 2) {
        historySource.setData({ type: 'FeatureCollection', features: [] });
      } else {
        const historyCoords = historyTrack
          .map((pt) => [pt.longitude, pt.latitude])
          .filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat)) as [number, number][];

        if (historyCoords.length > 1) {
          historySource.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: historyCoords,
                },
                properties: {},
              },
            ],
          });
        }
      }
    }
  };

  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      updateRouteData(mapRef.current);
    }
  }, [routes, selectedAgentId, showRoadRoutes, historyTrack]);

  // 8. Focus on Searched Landmark
  useEffect(() => {
    if (!mapRef.current || !searchFocusedPoint) return;
    const { lat, lon, name } = searchFocusedPoint;

    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
    }

    mapRef.current.flyTo({
      center: [lon, lat],
      zoom: 16.8,
      pitch: is3D ? 58 : 0,
      essential: true,
      duration: 1500,
    });

    const el = document.createElement('div');
    el.innerHTML = `
      <div class="relative flex items-center justify-center">
        <span class="absolute -inset-2 rounded-full bg-red-400 opacity-75 animate-ping"></span>
        <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-2xl flex items-center justify-center text-white text-xs font-bold">
          📍
        </div>
      </div>
    `;

    const popup = new maplibregl.Popup({ offset: 16 })
      .setHTML(`<div style="padding: 4px; font-weight: bold; font-size: 12px; color: #1e293b;">${name || 'Выбранный ориентир'}</div>`);

    searchMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([lon, lat])
      .setPopup(popup)
      .addTo(mapRef.current);

    searchMarkerRef.current.togglePopup();
  }, [searchFocusedPoint]);

  // 9. Camera 3D Tilt toggle listener
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({
      pitch: is3D ? 58 : 0,
      duration: 800,
    });
  }, [is3D]);

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating 3D / 2D Perspective Toggle Button (Bottom-Right) */}
      <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={onToggle3D}
          className={`px-3 py-2 rounded-xl backdrop-blur-md border text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 ${
            is3D
              ? 'bg-[#0071e3] text-white border-blue-400 ring-2 ring-blue-300/50'
              : 'bg-white/95 dark:bg-[#222]/95 text-slate-700 dark:text-slate-200 border-[#e9e9e7] dark:border-[#333] hover:bg-slate-50'
          }`}
          title="Переключить перспективу 3D / 2D"
        >
          <Compass className={`w-3.5 h-3.5 ${is3D ? 'text-white' : 'text-slate-500'}`} />
          <span>{is3D ? '3D Дворы' : '2D План'}</span>
        </button>
      </div>

      {/* Engine Badge (Bottom-Left) */}
      <div className="absolute bottom-6 left-4 z-10 pointer-events-none">
        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-[#e9e9e7] dark:border-[#333] px-2.5 py-1 rounded-lg shadow-sm text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>MapLibre GL GPU WebGL</span>
        </div>
      </div>
    </div>
  );
}
