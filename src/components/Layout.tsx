import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import {
  LayoutDashboard,
  Users,
  MapPin,
  ShoppingBag,
  Bell,
  Sparkles,
  Bot,
  LogOut,
  Layers,
  UserCheck,
  Coins,
  RotateCcw,
  CheckSquare,
  DollarSign,
  Search,
  ChevronLeft,
  Gift,
  Menu,
  X,
  Shield,
  Share2,
  MessageSquare,
  Sun,
  Moon,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAiInsight, setShowAiInsight] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data || []);
    } catch (err) {
      console.error('Error fetching notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Error marking notification as read', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read', err);
    }
  };

  const getNotifColor = (title: string) => {
    const t = (title || '').toLowerCase();
    if (t.includes('заказ') || t.includes('выполнен')) return 'text-emerald-700';
    if (t.includes('заряд') || t.includes('геопозиция') || t.includes('предупреждение') || t.includes('ошибка')) return 'text-amber-700';
    return 'text-slate-700';
  };

  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{"username":"Admin","role":"OWNER"}');

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('expanded_menu_groups');
      return saved ? JSON.parse(saved) : { 'analytics': true, 'sales': true, 'warehouse': true, 'team': true, 'admin': true };
    } catch {
      return { 'analytics': true, 'sales': true, 'warehouse': true, 'team': true, 'admin': true };
    }
  });

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = { ...prev, [groupKey]: !prev[groupKey] };
      localStorage.setItem('expanded_menu_groups', JSON.stringify(next));
      return next;
    });
  };

  const menuStructure = [
    {
      key: 'analytics',
      title: 'Аналитика',
      items: [
        { path: '/', label: 'Дашборд', icon: LayoutDashboard },
        { path: '/ai-assistant', label: 'AI Ассистент', icon: Sparkles },
      ]
    },
    {
      key: 'sales',
      title: 'Продажи',
      items: [
        { path: '/orders', label: 'Заказы', icon: ShoppingBag },
        { path: '/returns', label: 'Возвраты', icon: RotateCcw },
        { path: '/payments', label: 'Оплаты', icon: DollarSign },
        { path: '/promotions', label: 'Акции', icon: Gift },
      ]
    },
    {
      key: 'warehouse',
      title: 'Склад и Товары',
      items: [
        { path: '/catalog', label: 'Товары и Склады', icon: Layers },
        { path: '/warehouse', label: 'Сборка (Склад)', icon: CheckSquare },
      ]
    },
    {
      key: 'team',
      title: 'Команда',
      items: [
        { path: '/agents', label: 'Агенты', icon: Users },
        { path: '/map', label: 'Карта и GPS', icon: MapPin },
        { path: '/tasks', label: 'Задачи', icon: CheckSquare },
        { path: '/salary', label: 'Зарплаты', icon: Coins },
      ]
    },
    {
      key: 'admin',
      title: 'Управление',
      items: [
        { path: '/clients', label: 'Клиенты', icon: UserCheck },
        { path: '/branches', label: 'Филиалы', icon: MapPin },
        { path: '/roles', label: 'Управление ролями', icon: Shield },
        { path: '/smm', label: 'Маркетинг и SMM', icon: Share2 },
        { path: '/feedbacks', label: 'Обратная связь', icon: MessageSquare },
      ]
    }
  ];

  const getFilteredMenuStructure = () => {
    const role = user.role;
    const permissions = user.permissions || {};

    if (role === 'SUPER_ADMIN') {
      return [
        {
          key: 'platform',
          title: 'Управление SaaS',
          items: [
            { path: '/superadmin', label: 'Компании и Лицензии', icon: Shield },
            { path: '/feedbacks', label: 'Баг-репорты', icon: MessageSquare },
          ]
        }
      ];
    }

    return menuStructure.map(group => {
      const filteredItems = group.items.filter(item => {
        if (role === 'OWNER') return true;

        if (permissions && Object.keys(permissions).length > 0) {
          if (item.path === '/' || item.path === '/ai-assistant' || item.path === '/feedbacks') return true;

          const resourceMap: Record<string, string> = {
            '/agents': 'agents',
            '/map': 'map',
            '/clients': 'clients',
            '/catalog': 'catalog',
            '/warehouse': 'warehouse',
            '/orders': 'orders',
            '/returns': 'returns',
            '/payments': 'payments',
            '/tasks': 'tasks',
            '/salary': 'salary',
            '/branches': 'branches',
            '/promotions': 'promotions',
            '/roles': 'roles',
            '/smm': 'smm',
            '/feedbacks': 'feedbacks',
          };

          const resource = resourceMap[item.path];
          if (!resource) return false;

          return permissions[resource]?.includes('read') || false;
        }

        if (role === 'OWNER' || role === 'SALES_MANAGER') {
          return true;
        }
        if (role === 'SUPERVISOR') {
          return ['/', '/agents', '/map', '/clients', '/orders', '/returns', '/payments', '/tasks', '/ai-assistant'].includes(item.path);
        }
        if (role === 'WAREHOUSE_MAN') {
          return ['/catalog', '/warehouse', '/orders'].includes(item.path);
        }
        if (role === 'DELIVERY_MAN' || role === 'DELIVERY_DRIVER') {
          return ['/warehouse', '/orders'].includes(item.path);
        }
        if (role === 'FINANCIER') {
          return ['/orders', '/payments', '/salary'].includes(item.path);
        }
        if (role === 'DEVELOPER') {
          return ['/', '/feedbacks'].includes(item.path);
        }
        return false;
      });

      return {
        ...group,
        items: filteredItems
      };
    }).filter(group => group.items.length > 0);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#f4f6fa] text-[#1d1d1f] overflow-hidden font-sans">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar - Modern light sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col justify-between p-4 bg-white border-r border-[#e3e3e8] flex-shrink-0 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Close Button */}
          <div className="flex items-center justify-between mb-3 px-2 py-2">
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => navigate('/')}
            >
              <div className="w-9 h-9 rounded-xl bg-[#0b57d0] flex items-center justify-center font-bold text-white text-lg shadow-md shadow-[#0b57d0]/20 flex-shrink-0">
                S
              </div>
              {(!isCollapsed || isMobileMenuOpen) && (
                <div className={`animate-fadeIn ${isCollapsed ? 'lg:hidden block' : 'block'}`}>
                  <h1 className="font-bold text-base tracking-tight text-[#1d1d1f]">
                    SmartSale
                  </h1>
                  <span className="text-[9px] text-[#86868b] font-bold tracking-widest uppercase block -mt-1">
                    Savdo Tech
                  </span>
                </div>
              )}
            </div>
            {isMobileMenuOpen && (
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#5f6368] lg:hidden"
                title="Закрыть меню"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-4 overflow-y-auto flex-1 pr-1 py-2">
            {getFilteredMenuStructure().map((group) => {
              const isExpanded = expandedGroups[group.key] !== false;
              return (
                <div key={group.key} className="space-y-1">
                  {(!isCollapsed || isMobileMenuOpen) && (
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-[#86868b] uppercase tracking-wider hover:text-[#1d1d1f] transition-colors"
                    >
                      <span>{group.title}</span>
                      <span className="text-[9px]">{isExpanded ? '▼' : '▶'}</span>
                    </button>
                  )}
                  {isCollapsed && !isMobileMenuOpen && (
                    <div className="h-px bg-slate-100 my-2" />
                  )}
                  {(isExpanded || (isCollapsed && !isMobileMenuOpen)) && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                          <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            title={item.label}
                            className={`w-full flex items-center gap-3 px-3 py-2 ${
                              isCollapsed ? 'lg:justify-center lg:py-2.5 lg:px-0' : ''
                            } rounded-xl font-medium text-[13px] transition-all duration-200 ${
                              isActive
                                ? 'bg-[#0b57d0] text-white shadow-sm shadow-[#0b57d0]/20 font-semibold'
                                : 'text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1d1d1f]'
                            }`}
                          >
                            <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#5f6368]'}`} />
                            {(!isCollapsed || isMobileMenuOpen) && (
                              <span className={`truncate ${isCollapsed ? 'lg:hidden block' : 'block'}`}>{item.label}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* User profile & Collapse */}
        <div className="border-t border-[#e3e3e8] flex flex-col gap-2 pt-4 mt-auto">


          {(!isCollapsed || isMobileMenuOpen) && (
            <div className={`flex items-center gap-3 px-2 py-1 mb-2 ${isCollapsed ? 'lg:hidden block' : 'block'}`}>
              <div className="w-9 h-9 rounded-full bg-[#f1f3f4] flex items-center justify-center font-bold text-[#0b57d0] border border-[#e3e3e8] flex-shrink-0">
                {user.username ? user.username[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-[#1d1d1f] truncate">{user.username}</h4>
                <span className="text-[9px] text-[#86868b] font-bold uppercase tracking-wider block">
                  {user.role}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex-1 hidden lg:flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#f8f9fa] border border-[#e3e3e8] hover:bg-[#f1f3f4] text-xs font-semibold text-[#5f6368] transition-all"
              title={isCollapsed ? "Развернуть" : "Свернуть"}
            >
              {isCollapsed ? <Menu className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              {!isCollapsed && <span>Свернуть</span>}
            </button>
            
            <button
              onClick={handleLogout}
              className={`flex items-center justify-center rounded-xl bg-[#f8f9fa] border border-[#e3e3e8] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs font-semibold text-[#5f6368] transition-all w-full lg:w-auto ${
                isCollapsed ? 'lg:w-10 lg:h-9' : 'px-3 py-2 lg:flex-1'
              }`}
              title="Выйти"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className={`lg:hidden ml-1.5 ${isCollapsed ? 'lg:hidden block' : 'block'}`}>Выйти</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Premium clean bar */}
        <header className="h-16 bg-white border-b border-[#e3e3e8] flex items-center justify-between px-4 lg:px-8 flex-shrink-0">
          <div className="flex items-center gap-2 lg:gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-xl border border-[#e3e3e8] hover:bg-[#f8f9fa] text-[#5f6368] lg:hidden mr-1 shadow-sm"
              title="Открыть меню"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-[#1d1d1f] tracking-tight">
              {menuStructure.flatMap(g => g.items).find((item) => item.path === location.pathname)?.label || 'Управление'}
            </h2>
            
            {/* Search Box */}
            <div className="relative hidden md:block">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Поиск по заказам, клиентам, товарам..."
                className="pl-9 pr-4 py-1.5 bg-[#f1f3f4] text-xs text-[#1d1d1f] rounded-full w-64 border border-transparent focus:outline-none focus:border-[#0b57d0]/20 focus:bg-white focus:shadow-sm transition-all placeholder-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* AI Sales Forecasting Button */}
            <button
              onClick={() => setShowAiInsight(!showAiInsight)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] font-bold text-xs transition-all border border-[#d2e3fc]/30 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>AI Анализ</span>
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 bg-white border border-[#e3e3e8] rounded-xl hover:bg-[#f8f9fa] text-[#5f6368] transition-colors shadow-sm"
              title="Переключить тему"
              id="theme-toggle-btn"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 bg-white border border-[#e3e3e8] rounded-xl hover:bg-[#f8f9fa] text-[#5f6368] transition-colors shadow-sm"
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#d93025] rounded-full border border-white pulse-green"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#e3e3e8] rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                  <div className="p-4 border-b border-[#e3e3e8] flex justify-between items-center">
                    <span className="text-xs font-bold text-[#1d1d1f]">Уведомления</span>
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-[#0b57d0] font-bold hover:underline"
                    >
                      Прочитать все
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#e3e3e8]/50">
                    {notifications.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-6">Нет уведомлений</p>
                    ) : (
                      notifications.map((notif) => {
                        const timeStr = notif.createdAt 
                          ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '--:--';
                        return (
                          <div
                            key={notif.id}
                            onClick={() => markAsRead(notif.id)}
                            className={`p-3 text-[11px] leading-relaxed cursor-pointer hover:bg-slate-50 transition-colors ${
                              !notif.read ? 'bg-blue-50/40 font-semibold' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className={getNotifColor(notif.title)}>
                                {notif.body || notif.title}
                              </span>
                              <span className="text-[9px] text-[#86868b] font-mono whitespace-nowrap mt-0.5">{timeStr}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 border-l border-[#e3e3e8] pl-4">
              <div className="w-8 h-8 rounded-full bg-[#0b57d0] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                A
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-[#1d1d1f] leading-none">{user.username}</div>
                <div className="text-[9px] text-[#86868b] font-bold uppercase mt-0.5">{user.role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {/* AI Insights Panel */}
          {showAiInsight && (
            <div className="p-5 mb-6 rounded-2xl bg-[#e8f0fe] border border-[#d2e3fc] relative overflow-hidden shadow-sm transition-all animate-fadeIn">
              <div className="flex gap-4 items-start">
                <div className="p-2.5 bg-white rounded-xl border border-[#d2e3fc] text-[#1a73e8] shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1a73e8] flex items-center gap-2">
                    Рекомендация AI Аналитика по Закупкам и Продажам
                  </h3>
                  <p className="text-xs text-[#3c4043] mt-1.5 leading-relaxed">
                    Прогнозируется пиковый спрос на товарную категорию **Напитки** на следующей неделе (Душанбе, Согдийская область) на фоне роста температуры воздуха до +38°C.
                    Рекомендуется увеличить лимиты запасов на складах дистрибуции на **18%** для предотвращения дефицита.
                  </p>
                  <div className="flex gap-3 mt-3.5">
                    <button className="px-3.5 py-1.5 rounded-lg bg-[#0b57d0] hover:bg-[#094cb3] text-white font-bold text-xs transition-colors shadow-sm">
                      Оформить автозаказ сырья
                    </button>
                    <button
                      onClick={() => setShowAiInsight(false)}
                      className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#f1f3f4] border border-[#d2e3fc] text-[#5f6368] font-bold text-xs transition-colors"
                    >
                      Скрыть
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}

