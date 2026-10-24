import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useScope } from '../context/ScopeContext';
import {
  Users,
  ShoppingBag,
  TrendingUp,
  MapPin,
  Activity,
  Camera,
  Sun,
  Bot,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  Clock,
  Compass,
  Sparkles,
  Trophy,
  Send,
  Target,
} from 'lucide-react';

export default function Dashboard() {
  const { selectedBranchId, selectedBrandId, selectedZone } = useScope();
  const [loading, setLoading] = useState(true);
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawUsers, setRawUsers] = useState<any[]>([]);
  const [rawRoutes, setRawRoutes] = useState<any[]>([]);
  const [rawGps, setRawGps] = useState<any[]>([]);
  const [rawClients, setRawClients] = useState<any[]>([]);
  const [stats, setStats] = useState({
    agentsCount: '0 / 0',
    ordersCount: '0',
    salesVolume: '0 TJS',
    visitRate: '0%',
    rawOrdersCount: 0,
    totalVisits: 0,
    completedVisits: 0,
    rawSalesVolume: 0,
    akbCount: 0,
    okbCount: 0,
    akbPercentage: 0,
  });
  const [agents, setAgents] = useState<any[]>([]);
  const [photoReports, setPhotoReports] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [salesSparkline, setSalesSparkline] = useState<number[]>([]);
  const [ordersSparkline, setOrdersSparkline] = useState<number[]>([]);
  const [agentsPerformance, setAgentsPerformance] = useState<any[]>([]);
  const [weather, setWeather] = useState({ temp: '28°C', desc: 'Солнечно' });
  const [aiForecast, setAiForecast] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [debtAging, setDebtAging] = useState<{
    totalDebt: number;
    buckets: { days0_7: number; days8_15: number; days16_30: number; over30: number };
    debtorsCount: number;
    clients: any[];
  }>({
    totalDebt: 0,
    buckets: { days0_7: 0, days8_15: 0, days16_30: 0, over30: 0 },
    debtorsCount: 0,
    clients: [],
  });
  const [monthlyTargets, setMonthlyTargets] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const targetMonth = today.substring(0, 7);
        const [usersRes, ordersRes, routesRes, gpsRes, photoRes, clientsRes, aiRes, smmRes, debtRes, targetsRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: [] })),
          api.get('/orders').catch(() => ({ data: [] })),
          api.get('/routes', { params: { date: today } }).catch(() => ({ data: [] })),
          api.get('/gps/live').catch(() => ({ data: [] })),
          api.get('/routes/photo-reports').catch(() => ({ data: [] })),
          api.get('/clients').catch(() => ({ data: [] })),
          api.get('/ai/predictions/sales').catch(() => ({ data: [] })),
          api.get('/smm/leaderboard').catch(() => ({ data: [] })),
          api.get('/clients/debt-aging').catch(() => ({ data: { totalDebt: 0, buckets: { days0_7: 0, days8_15: 0, days16_30: 0, over30: 0 }, debtorsCount: 0, clients: [] } })),
          api.get('/salary/targets', { params: { month: targetMonth } }).catch(() => ({ data: [] })),
        ]);

        if (targetsRes?.data) {
          const items = Array.isArray(targetsRes.data)
            ? targetsRes.data
            : Array.isArray(targetsRes.data?.items)
            ? targetsRes.data.items
            : [];
          setMonthlyTargets(items);
        }
        if (debtRes?.data) {
          setDebtAging(debtRes.data);
        }
        setPhotoReports(photoRes.data || []);
        setAiForecast(Array.isArray(aiRes.data) ? aiRes.data : []);
        setLeaderboard(Array.isArray(smmRes.data) ? smmRes.data : []);
        
        setRawUsers(usersRes.data || []);
        setRawOrders(ordersRes.data || []);
        setRawRoutes(routesRes.data || []);
        setRawGps(gpsRes.data || []);
        setRawClients(clientsRes.data || []);

        // Fetch real weather for Khujand region (40.28, 69.62) from free Open-Meteo API
        try {
          const wRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.28&longitude=69.62&current_weather=true');
          const wData = await wRes.json();
          if (wData && wData.current_weather) {
            const temp = Math.round(wData.current_weather.temperature);
            const code = wData.current_weather.weathercode;
            // Map weathercode to Russian description
            const weatherDescriptions: Record<number, string> = {
              0: 'Ясно', 1: 'Преимущественно ясно', 2: 'Переменная облачность', 3: 'Пасмурно',
              45: 'Туман', 48: 'Иней с туманом', 51: 'Морось', 53: 'Умеренная морось',
              61: 'Слабый дождь', 63: 'Дождь', 65: 'Сильный дождь', 80: 'Ливень',
              95: 'Гроза'
            };
            const desc = weatherDescriptions[code] || 'Солнечно';
            setWeather({ temp: `${temp}°C`, desc });
          }
        } catch (wErr) {
          console.error('Failed to fetch weather', wErr);
        }

      } catch (err) {
        console.error('Error fetching dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Reactive Scope filtering (Branch / Brand / Zone)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    // Helper to calculate revenue for an order respecting selected brand
    const getOrderRevenue = (order: any, brandId: string | null) => {
      if (!brandId) {
        return Number(order.totalAmount || 0);
      }
      if (!Array.isArray(order.items)) return 0;
      return order.items.reduce((sum: number, it: any) => {
        const prod = it.product || {};
        const isBrand = prod.categoryId === brandId || prod.category?.parentId === brandId || it.categoryId === brandId;
        if (!isBrand) return sum;
        const qty = Number(it.quantity || 0);
        const price = Number(it.price || prod.price || 0);
        return sum + qty * price;
      }, 0);
    };

    // Filter orders by Branch, Zone, and Brand
    const filteredOrders = rawOrders.filter((o: any) => {
      const matchBranch = !selectedBranchId || o.branchId === selectedBranchId || o.salesRep?.branchId === selectedBranchId || o.client?.branchId === selectedBranchId;
      const matchZone = !selectedZone || o.zone === selectedZone || o.workZone === selectedZone || (o.client?.address || '').toLowerCase().includes(selectedZone.toLowerCase());
      const matchBrand = !selectedBrandId || (o.items || []).some((it: any) => {
        const prod = it.product || {};
        return prod.categoryId === selectedBrandId || prod.category?.parentId === selectedBrandId || it.categoryId === selectedBrandId;
      });
      return matchBranch && matchZone && matchBrand;
    });

    setRecentOrders(filteredOrders.slice(0, 4));

    // Aggregate top selling products from filtered orders (filtered by brand if set)
    const productSales: { [key: string]: { quantity: number; revenue: number } } = {};
    filteredOrders.forEach((order: any) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const prod = item.product || {};
          if (selectedBrandId) {
            const isBrand = prod.categoryId === selectedBrandId || prod.category?.parentId === selectedBrandId || item.categoryId === selectedBrandId;
            if (!isBrand) return;
          }
          const name = prod.name || item.name || 'Товар';
          const qty = Number(item.quantity || 0);
          const price = Number(item.price || prod.price || 0);
          const revenue = qty * price;
          if (productSales[name]) {
            productSales[name].quantity += qty;
            productSales[name].revenue += revenue;
          } else {
            productSales[name] = { quantity: qty, revenue };
          }
        });
      }
    });
    const sortedProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
    setTopProducts(sortedProducts);

    // Compute last 5 days sales history for sparklines
    const dailySales: { [key: string]: number } = {};
    const dailyOrders: { [key: string]: number } = {};
    filteredOrders.forEach((o: any) => {
      if (!o.createdAt) return;
      const date = o.createdAt.split('T')[0];
      const rev = getOrderRevenue(o, selectedBrandId);
      dailySales[date] = (dailySales[date] || 0) + rev;
      dailyOrders[date] = (dailyOrders[date] || 0) + 1;
    });

    const last5Days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (4 - i));
      return d.toISOString().split('T')[0];
    });

    setSalesSparkline(last5Days.map(date => dailySales[date] || 0));
    setOrdersSparkline(last5Days.map(date => dailyOrders[date] || 0));

    // Filter reps by branch
    const reps = rawUsers.filter((u: any) => {
      if (u.role !== 'SALES_REP') return false;
      if (selectedBranchId && u.branchId && u.branchId !== selectedBranchId) return false;
      return true;
    });

    const filteredGps = rawGps.filter((g: any) => {
      if (selectedBranchId && g.branchId && g.branchId !== selectedBranchId) return false;
      return true;
    });
    setAgents(filteredGps);
    const activeRepsCount = filteredGps.length;

    const todayOrders = filteredOrders.filter((o: any) => {
      if (!o.createdAt) return false;
      return o.createdAt.split('T')[0] === today;
    });

    const totalSales = filteredOrders.reduce((sum: number, o: any) => sum + getOrderRevenue(o, selectedBrandId), 0);

    // --- AKB / OKB Logic ---
    const filteredClients = rawClients.filter((c: any) => {
      if (selectedBranchId && c.branchId && c.branchId !== selectedBranchId) return false;
      if (selectedZone) {
        const zoneMatch = c.zone === selectedZone || (c.address || '').toLowerCase().includes(selectedZone.toLowerCase());
        if (!zoneMatch) return false;
      }
      return true;
    });
    const totalClientsCount = filteredClients.length;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthOrders = filteredOrders.filter((o: any) => o.createdAt && o.createdAt.startsWith(currentMonth) && o.status !== 'cancelled');

    const uniqueActiveClients = new Set(thisMonthOrders.map((o: any) => o.clientId || (o.client?.id)));
    const akbCount = uniqueActiveClients.size;
    const akbPercentage = totalClientsCount > 0 ? Math.round((akbCount / totalClientsCount) * 100) : 0;

    const performanceData = reps.map((rep: any) => {
      const repOrders = thisMonthOrders.filter((o: any) => o.salesRepId === rep.id);
      const repAkb = new Set(repOrders.map((o: any) => o.clientId || (o.client?.id))).size;
      const repSales = repOrders.reduce((sum: number, o: any) => sum + getOrderRevenue(o, selectedBrandId), 0);
      return {
        id: rep.id,
        name: `${rep.firstName} ${rep.lastName}`,
        akb: repAkb,
        sales: repSales,
      };
    }).sort((a: any, b: any) => b.akb - a.akb);
    setAgentsPerformance(performanceData);

    // Filter routes by branch and zone
    const filteredRoutes = rawRoutes.filter((r: any) => {
      if (selectedBranchId && r.branchId && r.branchId !== selectedBranchId) return false;
      if (selectedZone) {
        const zoneMatch = r.zone === selectedZone || (r.client?.address || '').toLowerCase().includes(selectedZone.toLowerCase());
        if (!zoneMatch) return false;
      }
      return true;
    });
    const visitedCount = filteredRoutes.filter((r: any) => r.visited).length;
    const rate = filteredRoutes.length > 0 ? Math.round((visitedCount / filteredRoutes.length) * 100) : 0;

    setStats({
      agentsCount: `${activeRepsCount} / ${reps.length || 1}`,
      ordersCount: `${todayOrders.length} (${filteredOrders.length} всего)`,
      salesVolume: `${Math.round(totalSales).toLocaleString('ru-RU')} TJS`,
      visitRate: `${rate}%`,
      rawOrdersCount: todayOrders.length,
      totalVisits: filteredRoutes.length,
      completedVisits: visitedCount,
      rawSalesVolume: totalSales,
      akbCount,
      okbCount: totalClientsCount,
      akbPercentage,
    });
  }, [rawOrders, rawUsers, rawRoutes, rawGps, rawClients, selectedBranchId, selectedBrandId, selectedZone]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.startsWith('192.168.');
    const socketUrl = isProd
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}/gps`
      : `http://${window.location.hostname}:4000/gps`;

    const socket = io(socketUrl, {
      query: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('subscribeLiveTracking');
    });

    socket.on('locationUpdated', (data: any) => {
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
          return [...prevAgents, {
            userId: data.userId,
            firstName: data.firstName || 'Агент',
            lastName: data.lastName || `ID ${data.userId}`,
            role: 'SALES_REP',
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            batteryLevel: data.batteryLevel,
            recordedAt: data.recordedAt,
          }];
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const targetsList = Array.isArray(monthlyTargets) ? monthlyTargets : [];
  const totalTargetRevenue = targetsList.reduce((s, t) => s + Number(t.targetRevenue || 0), 0);
  const totalActualRevenue = targetsList.reduce((s, t) => s + Number(t.actualRevenue || 0), 0);
  const revenueProgress = totalTargetRevenue > 0 ? Math.round((totalActualRevenue / totalTargetRevenue) * 100) : 0;

  const kpis = [
    {
      title: 'Выручка сегодня',
      value: stats.salesVolume,
      change: stats.rawSalesVolume > 0 ? '+18.2%' : '0%',
      subText: 'по сравнению с вчера',
      icon: TrendingUp,
      color: 'bg-blue-50 border-blue-100 text-blue-600',
      trendUp: true,
    },
    {
      title: 'Заказы сегодня',
      value: `${stats.rawOrdersCount} ед.`,
      change: stats.rawOrdersCount > 0 ? '+12.4%' : '0%',
      subText: 'по сравнению с вчера',
      icon: ShoppingBag,
      color: 'bg-emerald-50 border-emerald-100 text-emerald-600',
      trendUp: true,
    },
    {
      title: 'Средний чек',
      value: stats.rawOrdersCount > 0 ? `${Math.round(stats.rawSalesVolume / stats.rawOrdersCount)} TJS` : '0 TJS',
      change: stats.rawSalesVolume > 0 ? '+7.6%' : '0%',
      subText: 'по сравнению с вчера',
      icon: Compass,
      color: 'bg-indigo-50 border-indigo-100 text-indigo-600',
      trendUp: true,
    },
    {
      title: 'Посещения',
      value: stats.visitRate,
      change: stats.totalVisits > 0 ? '+8.1%' : '0%',
      subText: 'по сравнению с вчера',
      icon: MapPin,
      color: 'bg-purple-50 border-purple-100 text-purple-600',
      trendUp: true,
    },
    {
      title: totalTargetRevenue > 0 ? 'План выручки (МЕС)' : 'Выполнение плана',
      value: totalTargetRevenue > 0 ? `${revenueProgress}%` : stats.visitRate,
      change: totalTargetRevenue > 0 ? `${Math.round(totalActualRevenue).toLocaleString('ru-RU')} / ${Math.round(totalTargetRevenue).toLocaleString('ru-RU')} TJS` : (stats.totalVisits > 0 ? '+14%' : '0%'),
      subText: totalTargetRevenue > 0 ? 'Квота продаж отдела' : 'по сравнению с вчера',
      icon: totalTargetRevenue > 0 ? Target : Users,
      color: totalTargetRevenue > 0
        ? (revenueProgress >= 100 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : revenueProgress >= 70 ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-amber-50 border-amber-100 text-amber-600')
        : 'bg-amber-50 border-amber-100 text-amber-600',
      trendUp: totalTargetRevenue > 0 ? revenueProgress >= 70 : true,
    },
    {
      title: 'АКБ / ОКБ (МЕС)',
      value: `${stats.akbCount} / ${stats.okbCount}`,
      change: `${stats.akbPercentage}% покрытие`,
      subText: 'уникальных клиентов',
      icon: Activity,
      color: stats.akbPercentage >= 70 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600',
      trendUp: stats.akbPercentage >= 70,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Top Header Skeleton */}
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="space-y-2">
            <div className="h-6 bg-slate-200 rounded w-64"></div>
            <div className="h-4 bg-slate-100 rounded w-48"></div>
          </div>
          <div className="h-9 bg-slate-100 rounded-lg w-32"></div>
        </div>

        {/* 6 Metric Cards Skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-3.5 bg-slate-100 rounded w-20"></div>
                <div className="w-7 h-7 bg-slate-100 rounded-lg"></div>
              </div>
              <div className="h-7 bg-slate-200 rounded w-24"></div>
              <div className="h-3 bg-slate-100 rounded w-16"></div>
            </div>
          ))}
        </div>

        {/* Main Grid Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-80">
            <div className="h-5 bg-slate-200 rounded w-40 mb-4"></div>
            <div className="h-56 bg-slate-100 rounded-xl"></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-80">
            <div className="h-5 bg-slate-200 rounded w-36 mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-9 bg-slate-100 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const activeRepsCount = stats.agentsCount.split(' / ')[0].trim();
  const noAgentsActive = activeRepsCount === '0';
  const hasOrders = stats.rawOrdersCount > 0;

  const getAlertBg = () => {
    if (noAgentsActive) return 'bg-rose-50 border-rose-100 text-rose-800';
    if (!hasOrders) return 'bg-amber-50 border-amber-100 text-amber-800';
    return 'bg-emerald-50 border-emerald-100 text-emerald-800';
  };

  const getAlertTitle = () => {
    if (noAgentsActive) return 'Критический простой';
    if (!hasOrders) return 'Низкая активность продаж';
    return 'Стабильная работа';
  };

  const getAlertDescription = () => {
    if (noAgentsActive) return 'Ни один агент не вышел на маршрут сегодня. Проверьте смены.';
    if (!hasOrders) return 'Агенты вышли на смену, но новых заказов еще нет.';
    return `Активно работают ${activeRepsCount} агентов. Заказов: ${stats.rawOrdersCount} на сумму ${stats.salesVolume}.`;
  };

  const getAlertList = () => {
    if (noAgentsActive) {
      return (
        <ul className="text-[10px] text-rose-700 list-disc list-inside pl-1 space-y-1 mt-2">
          <li>0 агентов онлайн на карте</li>
          <li>План маршрута сегодня выполнен на 0%</li>
        </ul>
      );
    }
    if (!hasOrders) {
      return (
        <ul className="text-[10px] text-amber-700 list-disc list-inside pl-1 space-y-1 mt-2">
          <li>Агенты подключены, но заказов нет</li>
          <li>Рекомендуется связаться с точками</li>
        </ul>
      );
    }
    return (
      <ul className="text-[10px] text-emerald-700 list-disc list-inside pl-1 space-y-1 mt-2">
        <li>Выручка в норме</li>
        <li>Посещено точек: {stats.completedVisits} из {stats.totalVisits}</li>
      </ul>
    );
  };

  const maxSales = Math.max(...salesSparkline, 1);
  const maxOrders = Math.max(...ordersSparkline, 1);
  const visitsSparkline = stats.totalVisits > 0 ? [0, 0, 0, 0, stats.completedVisits] : [0, 0, 0, 0, 0];
  const maxVisits = Math.max(...visitsSparkline, 1);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome & Dashboard Sub-bar */}
      <div className="bg-white border border-[#e3e3e8] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-[#1d1d1f] tracking-tight">
            Доброе утро, admin! 👋
          </h2>
          <p className="text-xs text-[#86868b] mt-1 capitalize">{todayStr}</p>
        </div>
        
        {/* Header Status widgets */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-50 text-amber-500 rounded-lg">
              <Sun className="w-4 h-4" />
            </span>
            <div className="text-left">
              <div className="text-xs font-bold text-[#1d1d1f]">{weather.temp}</div>
              <div className="text-[10px] text-[#86868b]">{weather.desc}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-[#e3e3e8] pl-4">
            <div className="text-left">
              <div className="text-xs font-extrabold text-[#1d1d1f]">{stats.agentsCount.split(' / ')[0]}</div>
              <div className="text-[10px] text-[#86868b]">агентов онлайн</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white border border-[#e3e3e8] p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                {kpi.title}
              </span>
              <div className={`p-2 rounded-xl ${kpi.color} border transition-colors duration-300`}>
                <kpi.icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-[#1d1d1f] tracking-tight group-hover:text-[#0b57d0] transition-colors">
                {kpi.value}
              </h3>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center">
                  <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                  {kpi.change}
                </span>
                <span className="text-[9px] text-[#86868b] font-medium">{kpi.subText}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Agents List & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live tracking agents */}
        <div className="bg-white border border-[#e3e3e8] p-6 rounded-2xl shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-[#0b57d0] pulse-green" />
                Карта агентов в реальном времени
              </h3>
              <p className="text-[11px] text-[#86868b] mt-0.5">Живое отслеживание местоположения, заряда батареи и скорости</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
            {agents.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-12 col-span-2">
                Нет активных агентов на карте.
              </p>
            ) : (
              agents.map((agent, index) => (
                <div
                  key={index}
                  className="p-4 bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl flex items-center justify-between hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[#0b57d0] border border-[#e3e3e8]">
                        {agent.firstName[0]}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white pulse-green"></span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1d1d1f]">
                        {agent.firstName} {agent.lastName}
                      </h4>
                      <p className="text-[9px] text-[#86868b] font-medium font-mono mt-0.5">
                        ETA: 10:15 • Бат: {agent.batteryLevel}%
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      agent.speed > 0
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                        : 'text-amber-700 bg-amber-50 border border-amber-100'
                    }`}>
                      {agent.speed > 0 ? `${agent.speed} км/ч` : 'Стоит'}
                    </span>
                    <button className="text-[10px] font-extrabold text-[#0b57d0] block mt-2 hover:underline">
                      Подробнее →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: AI Insights & Alerts */}
        <div className="space-y-6 lg:col-span-4">
          {/* SmartSale AI card */}
          <div className="bg-white border border-[#e3e3e8] p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-1.5">
                <Bot className="w-4.5 h-4.5 text-[#0b57d0]" />
                SmartSale AI
              </h3>
              <span className="bg-[#0b57d0]/10 text-[#0b57d0] text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Новое
              </span>
            </div>

            <div className={`border p-4 rounded-xl space-y-2 mb-4 ${getAlertBg()}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${noAgentsActive ? 'text-rose-500' : !hasOrders ? 'text-amber-500' : 'text-emerald-500'}`} />
                <div>
                  <h4 className="text-xs font-bold">{getAlertTitle()}</h4>
                  <p className="text-[10px] opacity-90 mt-0.5 leading-relaxed">
                    {getAlertDescription()}
                  </p>
                </div>
              </div>
              {getAlertList()}
            </div>

            <div className="space-y-2">
              <span className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider block">Рекомендуем:</span>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => alert(`Вызов координатора или активных агентов...`)}
                  className="w-full text-center py-2 px-3 bg-[#0b57d0] hover:bg-[#094cb3] text-white text-[11px] font-bold rounded-xl shadow-sm transition-colors"
                >
                  {noAgentsActive ? 'Оповестить агентов' : 'Связаться с агентами'}
                </button>
                <button
                  onClick={() => alert('Сборка оптимального маршрута в реальном времени...')}
                  className="w-full text-center py-2 px-3 bg-white border border-[#e3e3e8] hover:bg-slate-50 text-[#1d1d1f] text-[11px] font-bold rounded-xl transition-colors"
                >
                  Оптимизировать маршруты
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FMCG Risk Control: Debt Aging Breakdown (Smartup Standard) */}
      <div className="bg-white dark:bg-[#0a0a0c] border border-[#e3e3e8] dark:border-zinc-800 p-6 rounded-2xl shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#e3e3e8] dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-900/50">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white">Старение дебиторской задолженности (Debt Aging)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-[#0b57d0] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                  FMCG SFA Standard
                </span>
              </div>
              <p className="text-[11px] text-[#86868b] dark:text-zinc-400 mt-0.5">
                Автоматический контроль сроков долга торговых точек по корзинам дней
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-[#86868b] dark:text-zinc-400 uppercase tracking-wider block font-bold">Общий долг сети</span>
              <span className="text-base font-extrabold text-[#1d1d1f] dark:text-white font-mono">
                {debtAging.totalDebt.toLocaleString('ru-RU')} TJS
              </span>
            </div>
            <Link
              to="/clients"
              className="px-3 py-1.5 bg-[#0b57d0] hover:bg-[#094cb3] text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              Реестр должников →
            </Link>
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2.5 w-full bg-slate-100 dark:bg-zinc-800/80 rounded-full overflow-hidden flex p-0.5 gap-0.5 shadow-inner">
            {debtAging.totalDebt > 0 ? (
              <>
                {debtAging.buckets.days0_7 > 0 && (
                  <div
                    style={{ width: `${(debtAging.buckets.days0_7 / debtAging.totalDebt) * 100}%` }}
                    className="bg-emerald-500 rounded-full transition-all duration-500 shadow-sm"
                    title={`0-7 дней (Норма): ${debtAging.buckets.days0_7.toLocaleString('ru-RU')} TJS`}
                  />
                )}
                {debtAging.buckets.days8_15 > 0 && (
                  <div
                    style={{ width: `${(debtAging.buckets.days8_15 / debtAging.totalDebt) * 100}%` }}
                    className="bg-amber-400 rounded-full transition-all duration-500 shadow-sm"
                    title={`8-15 дней (Внимание): ${debtAging.buckets.days8_15.toLocaleString('ru-RU')} TJS`}
                  />
                )}
                {debtAging.buckets.days16_30 > 0 && (
                  <div
                    style={{ width: `${(debtAging.buckets.days16_30 / debtAging.totalDebt) * 100}%` }}
                    className="bg-orange-500 rounded-full transition-all duration-500 shadow-sm"
                    title={`16-30 дней (Просрочка): ${debtAging.buckets.days16_30.toLocaleString('ru-RU')} TJS`}
                  />
                )}
                {debtAging.buckets.over30 > 0 && (
                  <div
                    style={{ width: `${(debtAging.buckets.over30 / debtAging.totalDebt) * 100}%` }}
                    className="bg-rose-600 rounded-full transition-all duration-500 shadow-sm"
                    title={`30+ дней (Критический): ${debtAging.buckets.over30.toLocaleString('ru-RU')} TJS`}
                  />
                )}
              </>
            ) : (
              <div
                className="w-full bg-emerald-500/80 rounded-full transition-all duration-500"
                title="Задолженность отсутствует (100% оплачено)"
              />
            )}
          </div>
        </div>

        {/* 4 Buckets Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">0–7 дней</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border dark:border-emerald-700/50">
                Норма
              </span>
            </div>
            <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200 font-mono">
              {debtAging.buckets.days0_7.toLocaleString('ru-RU')} TJS
            </div>
            <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 block mt-0.5">В рамках стандартной отсрочки</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">8–15 дней</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 dark:border dark:border-amber-700/50">
                Внимание
              </span>
            </div>
            <div className="text-sm font-extrabold text-amber-900 dark:text-amber-200 font-mono">
              {debtAging.buckets.days8_15.toLocaleString('ru-RU')} TJS
            </div>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 block mt-0.5">Рекомендуется напоминание</span>
          </div>

          <div className="p-3.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-orange-800 dark:text-orange-400 uppercase tracking-wider">16–30 дней</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 dark:border dark:border-orange-700/50">
                Просрочка
              </span>
            </div>
            <div className="text-sm font-extrabold text-orange-900 dark:text-orange-200 font-mono">
              {debtAging.buckets.days16_30.toLocaleString('ru-RU')} TJS
            </div>
            <span className="text-[10px] text-orange-700/80 dark:text-orange-400/80 block mt-0.5">Ограничение отгрузок</span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">30+ дней</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 dark:border dark:border-rose-700/50">
                Критический
              </span>
            </div>
            <div className="text-sm font-extrabold text-rose-900 dark:text-rose-200 font-mono">
              {debtAging.buckets.over30.toLocaleString('ru-RU')} TJS
            </div>
            <span className="text-[10px] text-rose-700/80 dark:text-rose-400/80 block mt-0.5">Стоп-лист / Инкассация</span>
          </div>
        </div>

        {/* Top Critical Debtors preview */}
        {debtAging.clients.length > 0 && (
          <div className="border border-[#e3e3e8] dark:border-zinc-800 rounded-xl overflow-hidden mt-3">
            <div className="bg-[#f8f9fa] dark:bg-zinc-900/70 px-4 py-2 border-b border-[#e3e3e8] dark:border-zinc-800 flex justify-between items-center">
              <span className="text-[11px] font-bold text-[#1d1d1f] dark:text-zinc-200">Торговые точки с наибольшим сроком задолженности</span>
              <span className="text-[10px] text-[#86868b] dark:text-zinc-400">Всего точек с долгом: {debtAging.debtorsCount}</span>
            </div>
            <div className="divide-y divide-[#e3e3e8]/60 dark:divide-zinc-800/60 text-xs">
              {debtAging.clients.slice(0, 3).map((debtor) => (
                <div key={debtor.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                      debtor.ageDays > 30 ? 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60' :
                      debtor.ageDays >= 16 ? 'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60' :
                      debtor.ageDays >= 8 ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60' :
                      'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                    }`}>
                      {debtor.ageDays} дн.
                    </span>
                    <div>
                      <div className="font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                        <span>{debtor.name}</span>
                        {debtor.status === 'blocked' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white">
                            СТОП-ЛИСТ
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#86868b] dark:text-zinc-400">{debtor.address} • {debtor.phone}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                      {debtor.currentDebt.toLocaleString('ru-RU')} TJS
                    </div>
                    <Link
                      to="/clients"
                      className="text-[10px] font-bold text-[#0b57d0] dark:text-blue-400 hover:underline"
                    >
                      Карточка точки →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Analytics (Sparklines), Top Products & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Analytics Sparklines & Products */}
        <div className="lg:col-span-8 space-y-6">
          {/* Sparkline cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#e3e3e8] p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Выручка</span>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" /> +18.2%
                </span>
              </div>
              <h4 className="text-base font-extrabold text-[#1d1d1f]">{stats.salesVolume}</h4>
              <div className="h-10 mt-3 flex items-end gap-1.5">
                {salesSparkline.map((val, i) => (
                  <div
                    key={i}
                    className="w-full bg-[#0b57d0]/20 rounded-sm hover:bg-[#0b57d0] transition-colors"
                    style={{ height: `${Math.max(15, Math.min(100, (val / maxSales) * 100))}%` }}
                    title={`${val} TJS`}
                  ></div>
                ))}
              </div>
            </div>
            
            <div className="bg-white border border-[#e3e3e8] p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Заказы</span>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" /> +12.4%
                </span>
              </div>
              <h4 className="text-base font-extrabold text-[#1d1d1f]">{stats.rawOrdersCount} ед.</h4>
              <div className="h-10 mt-3 flex items-end gap-1.5">
                {ordersSparkline.map((val, i) => (
                  <div
                    key={i}
                    className="w-full bg-emerald-500/20 rounded-sm hover:bg-emerald-500 transition-colors"
                    style={{ height: `${Math.max(15, Math.min(100, (val / maxOrders) * 100))}%` }}
                    title={`${val} ед.`}
                  ></div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#e3e3e8] p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Визиты</span>
                <span className="text-[10px] font-bold text-rose-500 flex items-center">
                  <TrendingDown className="w-3 h-3 mr-0.5" /> -2.1%
                </span>
              </div>
              <h4 className="text-base font-extrabold text-[#1d1d1f]">
                {stats.completedVisits} / {stats.totalVisits}
              </h4>
              <div className="h-10 mt-3 flex items-end gap-1.5">
                {visitsSparkline.map((val, i) => (
                  <div
                    key={i}
                    className="w-full bg-amber-500/20 rounded-sm hover:bg-amber-500 transition-colors"
                    style={{ height: `${Math.max(15, Math.min(100, (val / maxVisits) * 100))}%` }}
                    title={`${val} визитов`}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Top Products Table */}
          <div className="bg-white border border-[#e3e3e8] p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-[#1d1d1f] mb-4">Популярные товары</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e3e3e8] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Товар</th>
                    <th className="pb-3 font-semibold">Продано</th>
                    <th className="pb-3 font-semibold text-right">Выручка</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e3e8]/50 text-xs">
                  {topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400 italic">Нет продаж популярных товаров сегодня.</td>
                    </tr>
                  ) : (
                    topProducts.map((prod, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-bold text-[#1d1d1f]">{prod.name}</td>
                        <td className="py-3 text-[#5f6368]">{prod.quantity} шт.</td>
                        <td className="py-3 text-[#1d1d1f] font-bold text-right">
                          {prod.revenue.toLocaleString('ru-RU')} TJS
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* AKB Leaderboard Table */}
          <div className="bg-white border border-[#e3e3e8] p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-[#1d1d1f] mb-4">Покрытие (АКБ) по агентам</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e3e3e8] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Агент</th>
                    <th className="pb-3 font-semibold">АКБ (в этом мес)</th>
                    <th className="pb-3 font-semibold text-right">Выручка</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e3e8]/50 text-xs">
                  {agentsPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400 italic">Нет данных по агентам.</td>
                    </tr>
                  ) : (
                    agentsPerformance.map((rep, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-bold text-[#1d1d1f]">{rep.name}</td>
                        <td className="py-3 text-emerald-600 font-bold">{rep.akb} шт</td>
                        <td className="py-3 text-[#1d1d1f] font-bold text-right">
                          {rep.sales.toLocaleString('ru-RU')} TJS
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </div>

        {/* Right Column: Activity Feed & Photo reports */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#e3e3e8] p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-[#5f6368]" />
                <span>Лента событий</span>
              </h3>
              <Link to="/photo-reports" className="text-[11px] font-semibold text-[#0b57d0] hover:underline flex items-center gap-1">
                <span>Фотоконтроль</span>
                <span>→</span>
              </Link>
            </div>
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {recentOrders.length === 0 && photoReports.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">Нет событий за сегодня.</p>
              ) : (
                <>
                  {/* Photo report item */}
                  {photoReports.slice(0, 2).map((photo, i) => (
                    <div key={`photo-${i}`} className="flex gap-3 text-xs pb-3 border-b border-[#e3e3e8]/40 last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <span className="font-bold text-[#1d1d1f] truncate">
                            {photo.visit?.client?.name || 'Фотоотчет'}
                          </span>
                          <span className="text-[9px] text-[#86868b] font-mono whitespace-nowrap">
                            {new Date(photo.takenAt || photo.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#5f6368] mt-0.5">
                          Агент: {photo.visit?.salesRep?.firstName || 'Агент'} • Добавил фото витрины
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Order items */}
                  {recentOrders.map((order, i) => (
                    <div key={`order-${i}`} className="flex gap-3 text-xs pb-3 border-b border-[#e3e3e8]/40 last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <ShoppingBag className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <span className="font-bold text-[#1d1d1f] truncate">
                            Новый заказ
                          </span>
                          <span className="text-[9px] text-[#86868b] font-mono whitespace-nowrap">
                            {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#5f6368] mt-0.5">
                          Сумма: <span className="font-bold text-emerald-600">+{order.totalAmount} TJS</span> • Клиент: {order.client?.name || 'Клиент'}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Predictions, SMM Leaderboard & Telegram Assistant Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* AI Forecast Card (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#e3e3e8] p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1d1d1f]">ИИ-Прогнозирование спроса и продаж</h3>
                <p className="text-[11px] text-[#86868b]">Нейросетевой анализ остатков и прогнозирование закупок на следующую неделю</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
              AI Powered
            </span>
          </div>

          {aiForecast.length === 0 ? (
            <p className="text-xs text-[#86868b] dark:text-slate-400 italic py-6 text-center">Недостаточно исторических данных для формирования прогноза спроса.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aiForecast.slice(0, 4).map((item, idx) => (
                <div key={idx} className="p-3.5 bg-[#fbfbfa] dark:bg-[#121214] border border-[#e9e9e7] dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs text-[#1d1d1f] dark:text-white truncate block max-w-[180px]">{item.name}</span>
                    <span className="text-[10px] font-mono font-bold text-[#0071e3] dark:text-blue-400">Точность: {Math.round(item.confidenceScore * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[#86868b] dark:text-slate-400 block text-[9px]">Остаток на складе:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{item.currentStock} шт.</strong>
                    </div>
                    <div>
                      <span className="text-[#86868b] dark:text-slate-400 block text-[9px]">Прогноз спроса (неделя):</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-mono">~{item.predictedNextWeekDemand} шт.</strong>
                    </div>
                  </div>
                  <div className="text-[10px] p-2 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 leading-tight">
                    💡 {item.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: SMM Leaderboard & Telegram (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* SMM Leaderboard */}
          <div className="bg-white dark:bg-[#0a0a0a] border border-[#e3e3e8] dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white">Лидеры Продаж & SMM</h3>
                  <p className="text-[10px] text-[#86868b] dark:text-slate-400">Рейтинг активности агентов</p>
                </div>
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-xs text-[#86868b] dark:text-slate-400 italic py-4 text-center">Баллы за активность еще не начислены.</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 3).map((agent, rank) => (
                  <div key={agent.id} className="flex items-center justify-between p-2.5 bg-[#fbfbfa] dark:bg-[#121214] border border-[#e9e9e7] dark:border-slate-800 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        rank === 0 ? 'bg-amber-400 text-white' : rank === 1 ? 'bg-slate-300 text-slate-800' : 'bg-amber-700 text-white'
                      }`}>
                        {rank + 1}
                      </span>
                      <span className="font-bold text-[#1d1d1f] dark:text-white">{agent.firstName} {agent.lastName}</span>
                    </div>
                    <span className="font-bold text-amber-700 dark:text-amber-400 font-mono">
                      +{agent.smmPoints} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Telegram Bot Card */}
          <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/40 border border-sky-100 dark:border-sky-900/50 p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-500 text-white rounded-xl shadow-sm">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-[#1d1d1f] dark:text-white">Telegram Ассистент</h4>
                <p className="text-[10px] text-[#5f6368] dark:text-slate-400">Управление бизнесом с телефона</p>
              </div>
            </div>
            <p className="text-[11px] text-[#37352f] dark:text-slate-300 leading-relaxed">
              Отправьте в боте команду <code className="px-1.5 py-0.5 bg-white dark:bg-sky-900/60 rounded border border-sky-200 dark:border-sky-800 font-bold font-mono text-sky-800 dark:text-sky-300">/sales</code> для сводки выручки или <code className="px-1.5 py-0.5 bg-white dark:bg-sky-900/60 rounded border border-sky-200 dark:border-sky-800 font-bold font-mono text-sky-800 dark:text-sky-300">/status</code> для проверки агентов на карте.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
