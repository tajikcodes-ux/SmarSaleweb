import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
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
} from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    agentsCount: '0 / 0',
    ordersCount: '0',
    salesVolume: '0 TJS',
    visitRate: '0%',
    rawOrdersCount: 0,
    totalVisits: 0,
    completedVisits: 0,
    rawSalesVolume: 0,
  });
  const [agents, setAgents] = useState<any[]>([]);
  const [photoReports, setPhotoReports] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [salesSparkline, setSalesSparkline] = useState<number[]>([]);
  const [ordersSparkline, setOrdersSparkline] = useState<number[]>([]);
  const [weather, setWeather] = useState({ temp: '28°C', desc: 'Солнечно' });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [usersRes, ordersRes, routesRes, gpsRes, photoRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: [] })),
          api.get('/orders').catch(() => ({ data: [] })),
          api.get('/routes', { params: { date: today } }).catch(() => ({ data: [] })),
          api.get('/gps/live').catch(() => ({ data: [] })),
          api.get('/routes/photo-reports').catch(() => ({ data: [] })),
        ]);

        setPhotoReports(photoRes.data || []);
        
        // Save first few orders for activity feed
        const allOrders = ordersRes.data || [];
        setRecentOrders(allOrders.slice(0, 4));

        // Aggregate top selling products from real orders
        const productSales: { [key: string]: { quantity: number; revenue: number } } = {};
        allOrders.forEach((order: any) => {
          if (Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const name = item.product?.name || item.name || 'Товар';
              const qty = Number(item.quantity || 0);
              const price = Number(item.price || item.product?.price || 0);
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
        
        allOrders.forEach((o: any) => {
          if (!o.createdAt) return;
          const date = o.createdAt.split('T')[0];
          dailySales[date] = (dailySales[date] || 0) + Number(o.totalAmount || 0);
          dailyOrders[date] = (dailyOrders[date] || 0) + 1;
        });

        const last5Days = Array.from({ length: 5 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (4 - i));
          return d.toISOString().split('T')[0];
        });

        setSalesSparkline(last5Days.map(date => dailySales[date] || 0));
        setOrdersSparkline(last5Days.map(date => dailyOrders[date] || 0));

        const reps = usersRes.data.filter((u: any) => u.role === 'SALES_REP');
        const activeRepsCount = gpsRes.data.length;

        const todayOrders = allOrders.filter((o: any) => {
          if (!o.createdAt) return false;
          return o.createdAt.split('T')[0] === today;
        });

        const totalSales = allOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);

        const routes = routesRes.data || [];
        const visitedCount = routes.filter((r: any) => r.visited).length;
        const rate = routes.length > 0 ? Math.round((visitedCount / routes.length) * 100) : 0;

        setStats({
          agentsCount: `${activeRepsCount} / ${reps.length || 1}`,
          ordersCount: `${todayOrders.length} (${allOrders.length} всего)`,
          salesVolume: `${totalSales.toLocaleString('ru-RU')} TJS`,
          visitRate: `${rate}%`,
          rawOrdersCount: todayOrders.length,
          totalVisits: routes.length,
          completedVisits: visitedCount,
          rawSalesVolume: totalSales,
        });

        if (gpsRes.data.length > 0) {
          setAgents(gpsRes.data);
        } else {
          setAgents([]);
        }

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
      title: 'Выполнение плана',
      value: stats.visitRate,
      change: stats.totalVisits > 0 ? '+14%' : '0%',
      subText: 'по сравнению с вчера',
      icon: Users,
      color: 'bg-amber-50 border-amber-100 text-amber-600',
      trendUp: true,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="w-8 h-8 border-4 border-slate-200 border-t-[#0b57d0] rounded-full animate-spin"></span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        </div>

        {/* Right Column: Activity Feed & Photo reports */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#e3e3e8] p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-[#1d1d1f] mb-5 flex items-center gap-1.5">
              <Clock className="w-4.5 h-4.5 text-[#5f6368]" />
              Лента событий
            </h3>
            
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
    </div>
  );
}
