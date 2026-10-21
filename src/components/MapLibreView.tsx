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
import api from '../services/api';

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
  agentStatusFilter?: 'ALL' | 'ONLINE' | 'OFFLINE';
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
  agentStatusFilter = 'ALL',
  is3D,
  onToggle3D,
  searchFocusedPoint,
}: MapLibreViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);

  const getIsDark = () => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
  };

  const [isDarkMode, setIsDarkMode] = useState(getIsDark);

  const [currentStyle, setCurrentStyle] = useState<'liberty' | 'dark' | 'bright'>(() => {
    return getIsDark() ? 'dark' : 'liberty';
  });

  // Helper to fetch and sanitize OpenFreeMap style (fixes road shields null warning & font mappings)
  const fetchAndSanitizeStyle = async (styleName: 'liberty' | 'dark' | 'bright') => {
    try {
      const res = await fetch(`https://tiles.openfreemap.org/styles/${styleName}`);
      const styleJson = await res.json();
      if (Array.isArray(styleJson.layers)) {
        styleJson.layers.forEach((layer: any) => {
          // Fix highway-shield null ref_length comparison warning
          if (
            ['highway-shield-non-us', 'highway-shield-us-interstate', 'road_shield_us'].includes(layer.id) &&
            Array.isArray(layer.filter)
          ) {
            layer.filter = layer.filter.map((expr: any) => {
              if (
                Array.isArray(expr) &&
                expr[0] === '<=' &&
                Array.isArray(expr[1]) &&
                expr[1][0] === 'get' &&
                expr[1][1] === 'ref_length'
              ) {
                return ['all', ['has', 'ref_length'], ['<=', ['get', 'ref_length'], expr[2]]];
              }
              return expr;
            });
          }
        });
      }
      return styleJson;
    } catch (e) {
      console.warn('Failed to fetch/sanitize map style, using direct URL', e);
      return `https://tiles.openfreemap.org/styles/${styleName}`;
    }
  };

  // Track system or classList dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
      setIsDarkMode(dark);
      const targetStyle = dark ? 'dark' : 'liberty';
      if (currentStyle !== targetStyle && mapRef.current) {
        setCurrentStyle(targetStyle);
        fetchAndSanitizeStyle(targetStyle).then((styleObj) => {
          mapRef.current?.setStyle(styleObj);
        });
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

    let isCancelled = false;

    // Sughd / Khujand center coordinates
    const initialLng = 69.6210;
    const initialLat = 40.2825;

    const initialDark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    const initialStyleName = initialDark ? 'dark' : 'liberty';

    fetchAndSanitizeStyle(initialStyleName).then((styleObj) => {
      if (isCancelled || !containerRef.current || mapRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: styleObj,
        center: [initialLng, initialLat],
        zoom: 12.8,
        pitch: is3D ? 58 : 0,
        bearing: 0,
        attributionControl: false,
        transformRequest: (url: string, resourceType?: string) => {
          if (resourceType === 'Glyphs' && url.includes('tiles.openfreemap.org/fonts/')) {
            // OpenFreeMap provides Noto Sans with full Cyrillic (Tajik/Russian) ranges (0-255, 1024-1279).
            // Rewrite fallback/composite font requests to available Noto Sans fonts.
            const isBold = /bold/i.test(url);
            const isItalic = /italic/i.test(url);
            const targetFont = isBold ? 'Noto Sans Bold' : (isItalic ? 'Noto Sans Italic' : 'Noto Sans Regular');
            const cleanUrl = url.replace(
              /tiles\.openfreemap\.org\/fonts\/[^/]+/,
              `tiles.openfreemap.org/fonts/${encodeURIComponent(targetFont)}`
            );
            return { url: cleanUrl };
          }
          return { url };
        },
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      const setupAll = () => {
        const darkNow = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
        setup3DBuildings(map, darkNow);
        initLayersAndSources(map);
        updateClientData(map);
        updateAgentsData(map);
        updateLeadsData(map);
        updateRouteData(map);
      };

      map.on('load', setupAll);
      map.on('style.load', setupAll);

      mapRef.current = map;
    });

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
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
          'text-font': ['Noto Sans Regular'],
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
            <h4 style="font-weight: 700; font-size: 13px; margin: 4px 0 2px 0; color: #0f172a;">${props.name}</h4>
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
          'text-font': ['Noto Sans Bold'],
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
          'text-font': ['Noto Sans Regular'],
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

        const batteryColor = (props.batteryLevel > 50) ? '#10b981' : (props.batteryLevel >= 20 ? '#f59e0b' : '#ef4444');
        const motionText = props.speed > 5 ? `🚗 В движении (${props.speed} км/ч)` : `🚶 На месте (${props.speed} км/ч)`;

        const popupHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 4px; min-width: 220px; color: #0f172a;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: ${props.roleBadgeBg || '#ecfdf5'}; color: ${props.roleBadgeText || '#065f46'}; border: 1px solid ${props.roleBadgeBorder || '#a7f3d0'};">
                ${props.roleLabel || 'Сотрудник'}
              </span>
              <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: ${props.statusBadgeBg || '#f1f5f9'}; color: ${props.statusBadgeText || '#64748b'}; border: 1px solid ${props.statusBadgeBorder || '#cbd5e1'};">
                ${props.statusText || 'Офлайн'}
              </span>
            </div>
            <h4 style="font-weight: 700; font-size: 13px; margin: 0 0 8px 0; color: #0f172a; line-height: 1.3;">
              ${props.name || 'Сотрудник'}
            </h4>
            <div style="font-size: 11px; display: flex; flex-direction: column; gap: 5px; color: #475569; background: #f8fafc; border-radius: 8px; padding: 8px; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>🔋 Заряд:</span>
                <span style="font-weight: 700; color: ${batteryColor};">${props.batteryLevel}%</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>🚀 Скорость:</span>
                <span style="font-weight: 600; color: #0f172a;">${motionText}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 2px; font-size: 10px;">
                <span style="color: #64748b;">GPS фиксация:</span>
                <span style="font-weight: 600; color: #0f172a;">${props.recordedAt || 'Нет данных'}</span>
              </div>
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
          'text-font': ['Noto Sans Regular'],
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
          'text-font': ['Noto Sans Regular'],
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
            <h4 style="font-weight: 700; font-size: 12px; margin: 2px 0 2px 0; color: #0f172a;">${props.name}</h4>
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
        id: 'route-casing',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': isDarkMode ? '#0f172a' : '#ffffff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 5, 16, 8],
          'line-opacity': 0.85,
        },
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
          'line-opacity': 0.95,
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

  // Helper to extract human-readable role info with badges
  const getAgentRoleInfo = (role: any) => {
    let r = '';
    if (typeof role === 'string') {
      r = role.toUpperCase();
    } else if (role && typeof role === 'object') {
      r = (role.name || role.code || role.title || role.role || '').toString().toUpperCase();
    }
    if (r.includes('SUPERVISOR')) {
      return { label: '🛡️ Супервайзер', badgeBg: '#fef3c7', badgeText: '#92400e', badgeBorder: '#fde68a' };
    }
    if (r.includes('DELIVER') || r.includes('DRIVER') || r.includes('EXPEDITOR')) {
      return { label: '🚚 Экспедитор', badgeBg: '#f3e8ff', badgeText: '#6b21a8', badgeBorder: '#e9d5ff' };
    }
    if (r.includes('OWNER') || r.includes('ADMIN')) {
      return { label: '👑 Админ', badgeBg: '#dbeafe', badgeText: '#1e40af', badgeBorder: '#bfdbfe' };
    }
    if (r.includes('MERCHANDISER') || r.includes('MERCH')) {
      return { label: '📦 Мерчендайзер', badgeBg: '#e0e7ff', badgeText: '#3730a3', badgeBorder: '#c7d2fe' };
    }
    return { label: '💼 Торговый агент', badgeBg: '#ecfdf5', badgeText: '#065f46', badgeBorder: '#a7f3d0' };
  };

  // Helper to calculate agent online/offline/shift status
  const getAgentStatus = (agent: any) => {
    if (agent.onShift === false) {
      return {
        isOnline: false,
        text: 'Смена закрыта',
        bgColor: '#64748b',
        haloColor: 'rgba(148, 163, 184, 0.3)',
        badgeBg: '#f1f5f9',
        badgeText: '#475569',
        badgeBorder: '#cbd5e1',
      };
    }
    if (!agent.recordedAt) {
      return {
        isOnline: false,
        text: 'Нет GPS данных',
        bgColor: '#94a3b8',
        haloColor: 'rgba(148, 163, 184, 0.25)',
        badgeBg: '#f1f5f9',
        badgeText: '#64748b',
        badgeBorder: '#e2e8f0',
      };
    }

    const lastTime = new Date(agent.recordedAt).getTime();
    const now = Date.now();
    const diffMins = Math.floor((now - lastTime) / (1000 * 60));

    if (diffMins < 10) {
      return {
        isOnline: true,
        text: `В сети (${diffMins === 0 ? 'сейчас' : diffMins + ' мин'})`,
        bgColor: '#10b981',
        haloColor: 'rgba(52, 211, 153, 0.45)',
        badgeBg: '#ecfdf5',
        badgeText: '#065f46',
        badgeBorder: '#a7f3d0',
      };
    } else if (diffMins < 60) {
      return {
        isOnline: false,
        text: `Вне сети (${diffMins} мин)`,
        bgColor: '#f59e0b',
        haloColor: 'rgba(251, 191, 36, 0.4)',
        badgeBg: '#fffbeb',
        badgeText: '#92400e',
        badgeBorder: '#fde68a',
      };
    } else {
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      return {
        isOnline: false,
        text: diffDays > 0 ? `Вне сети (${diffDays} дн)` : `Вне сети (${diffHours} ч)`,
        bgColor: '#94a3b8',
        haloColor: 'rgba(148, 163, 184, 0.25)',
        badgeBg: '#f8fafc',
        badgeText: '#64748b',
        badgeBorder: '#e2e8f0',
      };
    }
  };

  // 5. Update Live Agents GeoJSON (GPU Zero-Lag)
  const updateAgentsData = (map: maplibregl.Map) => {
    const source = map.getSource('agents-source') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (!showLiveAgents) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const getRoleUpper = (r: any): string => {
      if (!r) return '';
      if (typeof r === 'string') return r.toUpperCase();
      if (typeof r === 'object') return (r.name || r.code || r.title || '').toString().toUpperCase();
      return String(r).toUpperCase();
    };

    const filteredAgents = agents.filter((agent) => {
      if (!agent.latitude || !agent.longitude) return false;

      // Filter by role
      const roleUpper = getRoleUpper(agent.role);
      if (mapFilter === 'SALES_REP') {
        if (roleUpper.includes('DELIVER') || roleUpper.includes('DRIVER')) return false;
      } else if (mapFilter === 'DELIVERY') {
        if (!roleUpper.includes('DELIVER') && !roleUpper.includes('DRIVER')) return false;
      } else if (mapFilter === 'SUPERVISOR') {
        if (!roleUpper.includes('SUPERVISOR')) return false;
      }

      // Filter by online/offline status
      const statusInfo = getAgentStatus(agent);
      if (agentStatusFilter === 'ONLINE' && !statusInfo.isOnline) return false;
      if (agentStatusFilter === 'OFFLINE' && statusInfo.isOnline) return false;

      return true;
    });

    const features = filteredAgents.map((agent) => {
      const lat = parseFloat(agent.latitude);
      const lon = parseFloat(agent.longitude);
      const isSelected = selectedAgentId === agent.userId;
      const initials = ((agent.firstName?.[0] || 'A') + (agent.lastName?.[0] || '')).toUpperCase();
      const fullName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Сотрудник';
      const roleInfo = getAgentRoleInfo(agent.role);
      const statusInfo = getAgentStatus(agent);

      const speedVal = agent.speed !== null && agent.speed !== undefined ? Math.round(Number(agent.speed)) : 0;
      const batteryVal = agent.batteryLevel !== null && agent.batteryLevel !== undefined ? Number(agent.batteryLevel) : 100;
      const recordedDateStr = agent.recordedAt
        ? new Date(agent.recordedAt).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Dushanbe',
          })
        : 'Нет данных';

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          userId: agent.userId,
          name: fullName,
          initials: isSelected ? '★' : initials,
          roleLabel: roleInfo.label,
          roleBadgeBg: roleInfo.badgeBg,
          roleBadgeText: roleInfo.badgeText,
          roleBadgeBorder: roleInfo.badgeBorder,
          statusText: statusInfo.text,
          statusBadgeBg: statusInfo.badgeBg,
          statusBadgeText: statusInfo.badgeText,
          statusBadgeBorder: statusInfo.badgeBorder,
          isOnline: statusInfo.isOnline,
          speed: speedVal,
          batteryLevel: batteryVal,
          recordedAt: recordedDateStr,
          onShift: !!agent.onShift,
          bgColor: isSelected ? '#0071e3' : statusInfo.bgColor,
          haloColor: isSelected ? 'rgba(59, 130, 246, 0.5)' : statusInfo.haloColor,
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
  }, [agents, selectedAgentId, showLiveAgents, mapFilter, agentStatusFilter]);

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
  const updateRouteData = async (map: maplibregl.Map) => {
    const routeSource = map.getSource('route-source') as maplibregl.GeoJSONSource;
    const historySource = map.getSource('history-track-source') as maplibregl.GeoJSONSource;

    if (routeSource) {
      if (!selectedAgentId || !showRoadRoutes) {
        routeSource.setData({ type: 'FeatureCollection', features: [] });
      } else {
        const agentRoutes = routes
          .filter((r) => r.salesRepId === selectedAgentId)
          .sort((a, b) => (a.visitSequence || a.sequence || 0) - (b.visitSequence || b.sequence || 0));

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
          // 1. Immediately render direct lines as fallback
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

          // 2. Query high-speed C++ OSRM for true road geometry
          try {
            const stops = coords.map(([lon, lat]) => [lat, lon]);
            const res = await api.post('/geo/route-geometry', { stops });
            if (res.data?.coordinates && res.data.coordinates.length > 1 && mapRef.current) {
              const currentSrc = mapRef.current.getSource('route-source') as maplibregl.GeoJSONSource;
              if (currentSrc) {
                currentSrc.setData({
                  type: 'FeatureCollection',
                  features: [
                    {
                      type: 'Feature',
                      geometry: {
                        type: 'LineString',
                        coordinates: res.data.coordinates,
                      },
                      properties: {
                        distanceKm: res.data.distanceKm,
                        durationMinutes: res.data.durationMinutes,
                      },
                    },
                  ],
                });
              }
            }
          } catch (_) {
            // Keep direct fallback
          }
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
      <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-4 z-10 flex flex-col gap-2">
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
      <div className="hidden sm:flex absolute bottom-6 left-4 z-10 pointer-events-none">
        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-[#e9e9e7] dark:border-[#333] px-2.5 py-1 rounded-lg shadow-sm text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>MapLibre GL GPU WebGL</span>
        </div>
      </div>
    </div>
  );
}
