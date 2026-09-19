import React, { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  ShieldCheck,
  MapPin,
  FileSpreadsheet,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Send,
  Package,
  ChevronDown,
  Coins,
  Check,
  X,
  Menu,
  Download,
  AlertCircle,
  Printer,
  Database,
  RefreshCw,
  Clock,
  Activity,
  Mail,
  Bot
} from 'lucide-react';
import heroDevicesMockup from '../assets/hero_devices_mockup.png';
import appIcon from '../assets/app_icon.png';
import gpsTrackingMap from '../assets/gps_tracking_map.png';

export default function Landing() {
  const navigate = useNavigate();

  // Navigation mobile state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active showcase tab
  const [activeTab, setActiveTab] = useState<'sfa' | 'mbi' | 'gps' | 'wms' | 'finance' | 'telegram'>('sfa');

  // ROI Calculator state
  const [agentCount, setAgentCount] = useState<number>(10);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(300000); // TJS
  const [currency, setCurrency] = useState<'TJS' | 'USD' | 'UZS'>('TJS');

  // FAQ Accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Lead Form & Demo Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formAgents, setFormAgents] = useState('5-15');
  const [formComment, setFormComment] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Accessibility unique IDs for inputs
  const modalNameId = useId();
  const modalPhoneId = useId();
  const modalCompanyId = useId();
  const modalAgentsId = useId();
  const modalCommentId = useId();

  const ctaNameId = useId();
  const ctaPhoneId = useId();
  const ctaCompanyId = useId();
  const ctaAgentsId = useId();

  // Currency multiplier & symbol
  const currSymbol = currency === 'TJS' ? 'сомони' : currency === 'USD' ? '$' : 'сум';
  const currRate = currency === 'TJS' ? 1 : currency === 'USD' ? 0.092 : 1150;

  // Practical business ROI calculation
  const potentialAdditionalRevenue = Math.round(monthlyRevenue * 0.15);
  const debtPreventionSavings = Math.round(monthlyRevenue * 0.03);
  const operatorHoursSaved = agentCount * 6;
  const estimatedPaybackDays = Math.max(5, Math.round(16 - Math.min(11, agentCount * 0.5)));

  // Handle lead submission
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPhone || formPhone.trim().length < 7) {
      setFormError('Пожалуйста, укажите ваш номер телефона для связи');
      return;
    }
    setFormLoading(true);
    setFormError('');

    try {
      await api.post('/auth/demo-request', {
        name: formName,
        phone: formPhone,
        companyName: formCompany,
        agentsCount: formAgents,
        comment: formComment,
      });
      setFormSuccess(true);
      setTimeout(() => {
        setFormName('');
        setFormPhone('');
        setFormCompany('');
        setFormComment('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Не удалось отправить заявку. Пожалуйста, напишите нам напрямую в WhatsApp/Telegram.');
    } finally {
      setFormLoading(false);
    }
  };

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans selection:bg-[#0b57d0] selection:text-white antialiased">
      
      {/* Top Practical Notice Bar (Slim & Clean) */}
      <aside aria-label="Рабочий статус" className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white">SmartSale ERP 2.0</span>
            <span className="text-slate-400 hidden sm:inline">— Автоматизация оптовой торговли и дистрибуции в Таджикистане</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <a
              href="https://t.me/tajcodes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 transition-colors"
              title="Написать в Telegram разработчику"
            >
              <Send className="w-3 h-3" />
              <span>Telegram: @tajcodes</span>
            </a>
            <span className="text-slate-700 hidden md:inline">•</span>
            <a
              href="mailto:tajcodes@gmail.com"
              className="text-slate-300 hover:text-white font-medium flex items-center gap-1 transition-colors hidden sm:flex"
              title="Написать на email"
            >
              <Mail className="w-3 h-3 text-emerald-400" />
              <span>tajcodes@gmail.com</span>
            </a>
            <span className="text-slate-700 hidden md:inline">•</span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-amber-400 font-medium hover:text-amber-300 transition-colors flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              <span>Демо →</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Header Navigation (Neat & Modern) */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo with Real App Icon */}
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img
              src={appIcon}
              alt="SmartSale Icon"
              className="w-8 h-8 rounded-xl object-contain shadow-sm ring-1 ring-slate-900/5 group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl tracking-tight text-slate-900">
                Smart<span className="text-[#0b57d0]">Sale</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-blue-50 text-[#0b57d0] border border-blue-200/80">
                2.0
              </span>
            </div>
          </div>

          {/* Desktop Nav Links (Clean & balanced) */}
          <nav className="hidden lg:flex items-center gap-6 text-[13px] font-semibold text-slate-600">
            <button onClick={() => scrollTo('features')} className="hover:text-[#0b57d0] transition-colors">
              Возможности
            </button>
            <button onClick={() => scrollTo('integration-1c')} className="hover:text-[#0b57d0] transition-colors">
              Связка с 1С
            </button>
            <button onClick={() => scrollTo('comparison')} className="hover:text-[#0b57d0] transition-colors">
              Сравнение
            </button>
            <button onClick={() => scrollTo('calculator')} className="hover:text-[#0b57d0] transition-colors">
              Окупаемость
            </button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-[#0b57d0] transition-colors">
              Тарифы
            </button>
            <button onClick={() => scrollTo('faq')} className="hover:text-[#0b57d0] transition-colors">
              Вопросы
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <a
              href="/SmartSale_app.apk"
              download="SmartSale_app.apk"
              className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200"
              title="Скачать APK на телефон"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>APK</span>
            </a>
            <button
              onClick={() => navigate('/login')}
              className="px-3.5 py-1.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all"
            >
              Вход
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#0b57d0] hover:bg-[#0848b0] text-white text-xs font-bold shadow-sm hover:shadow transition-all active:scale-[0.98]"
            >
              Попробовать бесплатно
            </button>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            aria-label="Открыть меню"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-5 py-4 space-y-2.5 shadow-xl">
            <button onClick={() => scrollTo('features')} className="block w-full text-left py-1.5 font-semibold text-slate-700 text-sm">
              Возможности системы
            </button>
            <button onClick={() => scrollTo('integration-1c')} className="block w-full text-left py-1.5 font-semibold text-slate-700 text-sm">
              Связка с 1С (15 минут)
            </button>
            <button onClick={() => scrollTo('comparison')} className="block w-full text-left py-1.5 font-semibold text-slate-700 text-sm">
              Сравнение решений
            </button>
            <button onClick={() => scrollTo('calculator')} className="block w-full text-left py-1.5 font-semibold text-slate-700 text-sm">
              Калькулятор окупаемости
            </button>
            <button onClick={() => scrollTo('pricing')} className="block w-full text-left py-1.5 font-semibold text-slate-700 text-sm">
              Тарифы в сомони
            </button>
            <button onClick={() => scrollTo('faq')} className="block w-full text-left py-1.5 font-semibold text-slate-700 text-sm">
              Вопросы и ответы
            </button>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <a
                href="/SmartSale_app.apk"
                download="SmartSale_app.apk"
                className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                Скачать APK агента
              </a>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold text-center"
              >
                Вход в систему
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); setIsModalOpen(true); }}
                className="w-full py-2.5 rounded-xl bg-[#0b57d0] text-white text-xs font-bold text-center"
              >
                Запросить демо
              </button>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-around text-xs text-slate-600">
                <a href="https://t.me/tajcodes" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sky-600 font-bold">
                  <Send className="w-3.5 h-3.5" />
                  <span>@tajcodes</span>
                </a>
                <span>•</span>
                <a href="mailto:tajcodes@gmail.com" className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  <span>tajcodes@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO: BRUTALLY PRACTICAL & DIRECT */}
      <section className="pt-10 pb-16 md:pt-16 md:pb-20 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left: Direct Commercial Offer */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#0b57d0] text-xs font-bold mb-4">
                <ShieldCheck className="w-4 h-4 text-[#0b57d0]" />
                <span>Создано для оптовиков и дистрибьюторов FMCG</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-[1.15]">
                Полный порядок в оптовых продажах и доставке
              </h1>

              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                Единая система для дистрибьюторов: приложение агента, склад, честный GPS-контроль и быстрая связка с 1С без программистов.
              </p>

              {/* 3 Clean Highlight Cards */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
                  <div className="text-[10px] font-bold text-[#0b57d0] uppercase tracking-wider">GPS-контроль</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">Радиус визита 25м</div>
                </div>
                <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
                  <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Стоп-лист</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">Защита от должников</div>
                </div>
                <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Связка с 1С</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">Подключение за 15 мин</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0b57d0] hover:bg-[#0848b0] text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>Попробовать 14 дней бесплатно</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="/SmartSale_app.apk"
                  download="SmartSale_app.apk"
                  className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold transition-all border border-slate-300 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Скачать APK на телефон</span>
                </a>
              </div>

              <div className="mt-4 text-[11px] text-slate-500 flex flex-wrap items-center gap-2 sm:gap-3">
                <span>⚡ Запуск за 24 часа</span>
                <span>•</span>
                <span>📱 100% офлайн без интернета</span>
                <span>•</span>
                <span>💼 Честные тарифы в сомони</span>
              </div>
            </div>

            {/* Right: Authentic MacBook Pro + Smartphone Mockup (Frameless & Clean) */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
              <div
                className="relative group cursor-pointer w-full transition-transform duration-300 hover:scale-[1.02]"
                onClick={() => setIsModalOpen(true)}
                title="Нажмите, чтобы попробовать SmartSale в действии"
              >
                {/* Pure devices mockup without artificial box or borders */}
                <img
                  src={heroDevicesMockup}
                  alt="SmartSale 2.0 Web Dashboard и Мобильное приложение агента"
                  className="w-full h-auto object-contain select-none filter drop-shadow-xl"
                  loading="eager"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION: DEDICATED 1C INTEGRATION BLOCK (SAVES 90% WORRIES) */}
      <section id="integration-1c" className="py-14 bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-950 text-blue-300 text-xs font-bold mb-3 border border-blue-800">
                <Database className="w-4 h-4 text-blue-400" />
                <span>Интеграция с учетной системой</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                «А как это свяжется с 1С?» — Легко и за 15 минут
              </h2>
              <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
                Без риска для базы и без переписывания конфигураций. Подключение через стандартную внешнюю обработку (1С:УТ, 1С:Бухгалтерия или МойСклад).
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-800/90 border border-slate-700/80 p-3.5 rounded-xl">
                  <div className="font-bold text-emerald-400 text-sm">🛡️ База нетронута</div>
                  <div className="text-slate-400 text-[11px] mt-1 leading-snug">Никаких правок в конфигурации. Проводки в полной безопасности.</div>
                </div>
                <div className="bg-slate-800/90 border border-slate-700/80 p-3.5 rounded-xl">
                  <div className="font-bold text-emerald-400 text-sm">⚡ 1 клик — накладные</div>
                  <div className="text-slate-400 text-[11px] mt-1 leading-snug">Сотни заказов агентов создаются документами в 1С без ручного ввода.</div>
                </div>
                <div className="bg-slate-800/90 border border-slate-700/80 p-3.5 rounded-xl">
                  <div className="font-bold text-emerald-400 text-sm">🔄 Авто-обмен</div>
                  <div className="text-slate-400 text-[11px] mt-1 leading-snug">Цены, остатки и стоп-листы сразу у агентов на смартфонах.</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700 p-6 rounded-2xl">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-700 text-xs font-bold text-slate-200">
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Схема синхронизации данных:</span>
              </div>

              <div className="mt-4 space-y-3 text-xs font-sans">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold">1С:Предприятие / Склад</div>
                    <div className="text-[10px] text-slate-400">Цены, остатки, список должников</div>
                  </div>
                  <span className="text-emerald-400 font-bold text-[11px]">➔ Выгрузка</span>
                </div>

                <div className="p-3 rounded-xl bg-[#0b57d0]/20 border border-blue-500/40 flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold">Сервер SmartSale Cloud</div>
                    <div className="text-[10px] text-blue-200">Мгновенный обмен через безопасный API</div>
                  </div>
                  <span className="text-blue-300 font-bold text-[11px]">↔ Автоматически</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold">Телефоны торговых агентов</div>
                    <div className="text-[10px] text-slate-400">Заказы, координаты, чеки, возвраты</div>
                  </div>
                  <span className="text-emerald-400 font-bold text-[11px]">➔ В накладные</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION: 6 CORE MODULES (INTERACTIVE TABS) */}
      <section id="features" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs uppercase font-extrabold tracking-wider text-[#0b57d0] bg-blue-50 px-3 py-1 rounded border border-blue-200">
            Функционал платформы
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
            Все звенья оптового бизнеса в одной простой программе
          </h2>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('sfa')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'sfa' ? 'bg-[#0b57d0] text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Приложение агента (SFA)
          </button>

          <button
            onClick={() => setActiveTab('mbi')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'mbi' ? 'bg-[#0b57d0] text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
            Конструктор MBI в Excel
          </button>

          <button
            onClick={() => setActiveTab('gps')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'gps' ? 'bg-[#0b57d0] text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            GPS-контроль маршрутов
          </button>

          <button
            onClick={() => setActiveTab('wms')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'wms' ? 'bg-[#0b57d0] text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Package className="w-4 h-4" />
            Склад и WMS
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'finance' ? 'bg-[#0b57d0] text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Coins className="w-4 h-4" />
            Финансы и Стоп-лист
          </button>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'telegram' ? 'bg-[#0b57d0] text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Send className="w-4 h-4 text-sky-500" />
            B2B Telegram Бот
          </button>
        </div>

        {/* Tab Detail Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          {activeTab === 'sfa' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[11px] font-bold text-[#0b57d0] uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  Приложение агента (Android / iOS)
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                  Заказ за 30 секунд прямо в торговой точке
                </h3>
                <p className="text-slate-600 mt-2 text-xs sm:text-sm leading-relaxed">
                  Понятный интерфейс без лишних кнопок. Агент сразу видит долг магазина, актуальные остатки склада и персональные цены со скидками.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    ⚡ 100% офлайн без связи
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    📦 Актуальный склад
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    🖨️ Чек на термопринтере
                  </span>
                </div>
              </div>
              <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm text-xs font-sans">
                {/* Mobile Client & GPS Card */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs mb-3">
                  <div className="flex justify-between items-center text-[10px] mb-1">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      GPS: 12м • В точке
                    </span>
                    <span className="text-slate-500 font-medium font-mono">Заказ № 04819</span>
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm">ТТ "Супермаркет Ситора"</div>
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-1 mt-1">
                    <span>г. Душанбе, пр. Рудаки, 48</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded text-[10px] border border-emerald-200/60">
                      Долг: 0 TJS • Лимит: 8,000 TJS
                    </span>
                  </div>
                </div>

                {/* Items in cart */}
                <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  {/* Item 1 */}
                  <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                    <div className="pr-2">
                      <div className="font-bold text-slate-900 text-[11px]">Сок "Оби Зулол" Яблоко 1л</div>
                      <div className="text-[10px] text-slate-400 font-mono">12.00 TJS • Склад: 1,420 уп.</div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] font-bold text-slate-700">
                        <span className="w-5 h-5 flex items-center justify-center text-slate-400 select-none">−</span>
                        <span className="px-2 font-mono">15</span>
                        <span className="w-5 h-5 flex items-center justify-center text-emerald-600 select-none">+</span>
                      </div>
                      <div className="text-right min-w-[65px]">
                        <span className="font-extrabold text-slate-900 font-mono text-xs">180.00</span>
                        <span className="text-[9px] text-slate-400 block font-sans">TJS</span>
                      </div>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                    <div className="pr-2">
                      <div className="font-bold text-slate-900 text-[11px]">Масло "Олейна" 5л</div>
                      <div className="text-[10px] text-slate-400 font-mono">85.00 TJS • Склад: 640 шт.</div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] font-bold text-slate-700">
                        <span className="w-5 h-5 flex items-center justify-center text-slate-400 select-none">−</span>
                        <span className="px-2 font-mono">10</span>
                        <span className="w-5 h-5 flex items-center justify-center text-emerald-600 select-none">+</span>
                      </div>
                      <div className="text-right min-w-[65px]">
                        <span className="font-extrabold text-slate-900 font-mono text-xs">850.00</span>
                        <span className="text-[9px] text-slate-400 block font-sans">TJS</span>
                      </div>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="pr-2">
                      <div className="font-bold text-slate-900 text-[11px]">Чай "Сабо" зеленый 200г</div>
                      <div className="text-[10px] text-slate-400 font-mono">18.00 TJS • Склад: 890 пач.</div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] font-bold text-slate-700">
                        <span className="w-5 h-5 flex items-center justify-center text-slate-400 select-none">−</span>
                        <span className="px-2 font-mono">20</span>
                        <span className="w-5 h-5 flex items-center justify-center text-emerald-600 select-none">+</span>
                      </div>
                      <div className="text-right min-w-[65px]">
                        <span className="font-extrabold text-slate-900 font-mono text-xs">360.00</span>
                        <span className="text-[9px] text-slate-400 block font-sans">TJS</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total breakdown */}
                <div className="mt-3 bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-xl">
                  <div className="flex justify-between items-center text-[11px] text-emerald-950">
                    <span className="text-slate-600">Сумма без скидки: 1,463.00 TJS</span>
                    <span className="font-bold text-emerald-700">Скидка 5%: −73.00 TJS</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-black text-emerald-950 mt-1 pt-1.5 border-t border-emerald-200/60">
                    <span>ИТОГО К ОПЛАТЕ:</span>
                    <span className="text-base text-emerald-700 font-mono">1,390.00 TJS</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs text-center shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>✓ ОТПРАВИТЬ ЗАКАЗ НА СКЛАД</span>
                  </button>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                    title="Печать накладной на карманном термопринтере"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Чек</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mbi' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  Аналитика и MBI Конструктор
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                  Любые отчеты в красивый Excel за 30 секунд
                </h3>
                <p className="text-slate-600 mt-2 text-xs sm:text-sm leading-relaxed">
                  Стройте любые срезы (Агенты × Бренды × Дни) в один клик без ожидания и без оплаты программистов 1С.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    📊 2D Матрицы (Pivot)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    📥 Готовый дизайнерский Excel
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    ⚡ Без программистов
                  </span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm text-xs font-sans overflow-x-auto">
                <div className="bg-emerald-700 text-white px-3 py-1.5 rounded-t font-mono text-[11px] flex justify-between">
                  <span>📊 Отчет_Продажи_Август.xlsx</span>
                  <span>Microsoft Excel</span>
                </div>
                <table className="w-full text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="p-2 border border-slate-200">Торговый агент</th>
                      <th className="p-2 text-right border border-slate-200">Соки / Напитки</th>
                      <th className="p-2 text-right border border-slate-200">Бакалея</th>
                      <th className="p-2 text-right border border-slate-200">Итого (TJS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    <tr>
                      <td className="p-2 font-bold border border-slate-200">Баходур С.</td>
                      <td className="p-2 text-right border border-slate-200">24,500</td>
                      <td className="p-2 text-right border border-slate-200">18,300</td>
                      <td className="p-2 text-right font-black text-emerald-700 border border-slate-200">42,800</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold border border-slate-200">Рустам К.</td>
                      <td className="p-2 text-right border border-slate-200">19,200</td>
                      <td className="p-2 text-right border border-slate-200">22,100</td>
                      <td className="p-2 text-right font-black text-emerald-700 border border-slate-200">41,300</td>
                    </tr>
                    <tr className="bg-slate-100 font-black text-slate-900">
                      <td className="p-2 border border-slate-200">ИТОГО:</td>
                      <td className="p-2 text-right border border-slate-200">43,700</td>
                      <td className="p-2 text-right border border-slate-200">40,400</td>
                      <td className="p-2 text-right text-emerald-800 border border-slate-200">84,100 TJS</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'gps' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7">
                  <span className="text-[11px] font-bold text-[#0b57d0] uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    GPS-контроль и трекинг
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                    Полная прозрачность маршрутов в реальном времени
                  </h3>
                  <p className="text-slate-600 mt-2 text-xs sm:text-sm leading-relaxed">
                    Супервайзер видит точный трек движения, фиксацию времени в каждой точке и остаток запланированных визитов.
                  </p>
                  <div className="mt-3.5 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                      📍 Заказ строго в радиусе 25м
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                      ⏱️ Учет времени стоянок (P 19м)
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                      ▶️ Плеер трека дня со скоростью
                    </span>
                  </div>
                </div>

                {/* Real-time mini agent chips */}
                <div className="lg:col-span-5 bg-slate-50/80 p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-[#0b57d0]" />
                      <span className="font-bold text-slate-900 text-xs">Статус агентов онлайн:</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      2 в поле
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2 bg-white border border-[#e3e3e8] rounded-lg flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-[#0b57d0] flex items-center justify-center font-black text-xs">Б</div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Баходур С.</div>
                          <div className="text-[10px] text-slate-500">Маршрут "Центр": 18/22 • Бат: 87%</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">В точке (14м)</span>
                    </div>

                    <div className="p-2 bg-white border border-[#e3e3e8] rounded-lg flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">Р</div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Рустам К.</div>
                          <div className="text-[10px] text-slate-500">Маршрут "Запад": 15/20 • Бат: 65%</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">В пути (25 км/ч)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* REAL GPS MAP SCREENSHOT FROM SMARTSALE */}
              <div
                className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-md bg-white group cursor-pointer"
                onClick={() => setIsModalOpen(true)}
                title="Нажмите, чтобы открыть тест-драйв SmartSale"
              >
                <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs font-sans border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold">Интерактивная GPS-карта: трек движения, фиксация стоянок и плеер истории</span>
                  </div>
                  <span className="text-[10px] text-slate-400 hidden sm:inline font-mono">
                    г. Худжанд • Агент Тестовый (Пробег: 19.0 км)
                  </span>
                </div>

                <div className="relative overflow-hidden bg-slate-100">
                  <img
                    src={gpsTrackingMap}
                    alt="Реальная GPS-карта трекинга агентов в SmartSale"
                    className="w-full h-auto object-cover select-none transition-transform duration-300 group-hover:scale-[1.005]"
                    loading="lazy"
                  />

                  {/* Trust Pill */}
                  <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg shadow-lg border border-slate-700 text-[11px] font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Живой модуль SmartSale GPS (Leaflet / OpenStreetMap)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wms' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                  Складской учет и WMS
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                  Мгновенный резерв товара без пересортицы
                </h3>
                <p className="text-slate-600 mt-2 text-xs sm:text-sm leading-relaxed">
                  Товар бронируется в момент отправки заказа. Агенты видят только фактические свободные остатки.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    📦 FEFO партионный учет
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    ⚠️ Контроль критических остатков
                  </span>
                </div>
              </div>
              <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm text-xs font-sans">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0b57d0]" />
                    <span className="font-bold text-slate-900 text-xs">Склад №1 (Главный Душанбе)</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                    FEFO партионный учет
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Item 1 */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900">Сок "Оби Зулол" 1L</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Категория: Напитки • Срок: 12.2026</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-800 bg-emerald-50 border border-emerald-200">
                        ● В наличии
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-[10px] text-slate-600 font-mono">
                      <span>На складе: <strong>1,420 уп.</strong> (Резерв: 230)</span>
                      <span className="text-emerald-700 font-bold">Доступно: 1,190 уп.</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '84%' }} />
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900">Масло растительное 5L</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Категория: Бакалея • Срок: 09.2026</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-800 bg-emerald-50 border border-emerald-200">
                        ● В наличии
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-[10px] text-slate-600 font-mono">
                      <span>На складе: <strong>640 шт.</strong> (Резерв: 95)</span>
                      <span className="text-emerald-700 font-bold">Доступно: 545 шт.</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900">Мука пшеничная "Фаровон" 50кг</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Категория: Мука • Срок: 03.2026</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-rose-800 bg-rose-50 border border-rose-200">
                        ⚠️ Критический остаток
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-[10px] text-slate-600 font-mono">
                      <span>На складе: <strong>45 мешков</strong> (Резерв: 30)</span>
                      <span className="text-rose-700 font-bold">Доступно: 15 мешков</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '18%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                  Кредитный контроль и дебиторка
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                  Защита оборотных средств от безнадежных долгов
                </h3>
                <p className="text-slate-600 mt-2 text-xs sm:text-sm leading-relaxed">
                  Автоматическая блокировка отгрузки при превышении лимита или срока отсрочки платежа.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    ⛔ Блокировка должников
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    📋 Сверка и касса день в день
                  </span>
                </div>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl text-rose-950 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm mb-1 text-rose-700">
                  <AlertCircle className="w-4 h-4" /> Внимание: Стоп-лист активен
                </div>
                <p className="mt-1 leading-relaxed">
                  Магазин «Олим» превысил срок отсрочки на 7 дней. Текущий долг: <strong>4,200 TJS</strong>. Создание накладной заблокировано до внесения оплаты в кассу.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'telegram' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                  B2B Канал продаж 24/7
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                  Круглосуточный бот для заказов магазинов
                </h3>
                <p className="text-slate-600 mt-2 text-xs sm:text-sm leading-relaxed">
                  Торговые точки сами оформляют дозаказы вечером и в выходные, а директор получает сводку выручки в 21:00.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    🤖 Заказы магазинов 24/7
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    📊 Сводка директору в 21:00
                  </span>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-sky-700 mb-1">Telegram Бот: @smartsalerbot</div>
                <div className="p-3 bg-white rounded border border-slate-200 text-slate-800 space-y-1">
                  <div className="font-bold">📊 Сводка директору за 18 сентября:</div>
                  <div>• Собрано заказов: 58,400 TJS (106% к плану)</div>
                  <div>• Сдано в кассу: 52,100 TJS</div>
                  <div>• Новых магазинов подключено: +4 точки</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION: 24-HOUR LAUNCH TIMELINE */}
      <section className="py-16 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs uppercase font-extrabold tracking-wider text-[#0b57d0] bg-blue-50 px-3 py-1 rounded border border-blue-200">
              Быстрый старт
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
              Как мы запускаем вашу компанию всего за 24 часа
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1.5">
              Никаких многонедельных простоев. Торговля не останавливается ни на один день.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-mono text-[#0b57d0] font-bold mb-1">ШАГ 1 • 10:00</div>
              <h3 className="font-bold text-sm text-slate-900">Передаете прайс-лист</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Вы скидываете нам номенклатуру товаров и список магазинов в любом виде: Excel, накладная или выгрузка из 1С.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-mono text-[#0b57d0] font-bold mb-1">ШАГ 2 • 14:00</div>
              <h3 className="font-bold text-sm text-slate-900">Настройка базы</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Наш инженер загружает товары, цены, кредитные лимиты, склады и распределяет магазины по маршрутам агентов.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-mono text-[#0b57d0] font-bold mb-1">ШАГ 3 • 17:00</div>
              <h3 className="font-bold text-sm text-slate-900">Установка агентам</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Агенты скачивают приложение по ссылке, вводят свои логины. Обучение работе с приложением занимает всего 20 минут.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-mono text-emerald-600 font-bold mb-1">ШАГ 4 • СЛЕДУЮЩЕЕ УТРО</div>
              <h3 className="font-bold text-sm text-slate-900">Работа в полях</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                С 8:00 утра агенты на маршрутах собирают первые заказы в системе, а вы видите выручку в реальном времени.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: COMPARISON WITH OTHER SYSTEMS */}
      <section id="comparison" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs uppercase font-extrabold tracking-wider text-slate-600 bg-slate-100 px-3 py-1 rounded border border-slate-200">
            Сравнение подходов
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
            Почему SmartSale выгоднее обычных закрытых систем и тетрадок
          </h2>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3.5 px-5 font-bold text-slate-700 w-2/5">Критерий</th>
                  <th className="py-3.5 px-5 font-black text-[#0b57d0] bg-blue-50/70 border-x border-blue-200 text-center w-1/5">
                    SmartSale 2.0
                  </th>
                  <th className="py-3.5 px-5 font-bold text-slate-600 text-center w-1/5">
                    Традиционные SFA-системы
                  </th>
                  <th className="py-3.5 px-5 font-bold text-slate-600 text-center w-1/5">
                    Классическая 1С:Предприятие
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3 px-5 font-semibold text-slate-900">Срок запуска в работу</td>
                  <td className="py-3 px-5 text-center font-bold text-emerald-600 bg-blue-50/40 border-x border-blue-100">
                    ⚡ 1 рабочий день (24 часа)
                  </td>
                  <td className="py-3 px-5 text-center text-rose-600">4–6 недель внедрения</td>
                  <td className="py-3 px-5 text-center text-slate-500">2–3 месяца доработок</td>
                </tr>

                <tr>
                  <td className="py-3 px-5 font-semibold text-slate-900">Конструктор отчетов (MBI Pivot)</td>
                  <td className="py-3 px-5 text-center font-bold text-emerald-600 bg-blue-50/40 border-x border-blue-100">
                    ✅ Визуальный Drag&Drop в Excel
                  </td>
                  <td className="py-3 px-5 text-center text-slate-400">❌ Только жесткие фикс. отчеты</td>
                  <td className="py-3 px-5 text-center text-slate-400">❌ Требует программиста 1С</td>
                </tr>

                <tr>
                  <td className="py-3 px-5 font-semibold text-slate-900">Команды до 15 агентов</td>
                  <td className="py-3 px-5 text-center font-bold text-emerald-600 bg-blue-50/40 border-x border-blue-100">
                    ✅ От 3 агентов (открыто для всех)
                  </td>
                  <td className="py-3 px-5 text-center text-rose-600">❌ Требуют от 50+ человек</td>
                  <td className="py-3 px-5 text-center text-slate-500">Дорогие клиентские лицензии</td>
                </tr>

                <tr>
                  <td className="py-3 px-5 font-semibold text-slate-900">B2B Telegram Бот для магазинов</td>
                  <td className="py-3 px-5 text-center font-bold text-emerald-600 bg-blue-50/40 border-x border-blue-100">
                    ✅ Встроен «из коробки»
                  </td>
                  <td className="py-3 px-5 text-center text-slate-500">⚠️ Дорогой отдельный модуль</td>
                  <td className="py-3 px-5 text-center text-slate-400">❌ Нет</td>
                </tr>

                <tr>
                  <td className="py-3 px-5 font-semibold text-slate-900">Стоимость и валюта</td>
                  <td className="py-3 px-5 text-center font-black text-[#0b57d0] bg-blue-50/40 border-x border-blue-100">
                    От 85 TJS/мес за агента (в сомони)
                  </td>
                  <td className="py-3 px-5 text-center text-rose-700 font-medium">$20–$35/мес в долларах США</td>
                  <td className="py-3 px-5 text-center text-slate-700">Оклад штатного 1С-ника</td>
                </tr>

                <tr>
                  <td className="py-3 px-5 font-semibold text-slate-900">Защита от фейковых визитов</td>
                  <td className="py-3 px-5 text-center font-bold text-emerald-600 bg-blue-50/40 border-x border-blue-100">
                    ✅ Радиус 25м + блокировка Mock GPS
                  </td>
                  <td className="py-3 px-5 text-center text-emerald-600">✅ Базовый GPS</td>
                  <td className="py-3 px-5 text-center text-slate-400">❌ Отсутствует</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION: PRACTICAL ROI CALCULATOR */}
      <section id="calculator" className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 bg-emerald-950 px-3 py-1 rounded border border-emerald-800">
              Экономика для собственника
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
              Калькулятор окупаемости внедрения SmartSale
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-2">
              Укажите параметры вашей компании и посмотрите реальную экономию.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Controls (7 cols) */}
            <div className="lg:col-span-7 bg-slate-800/80 border border-slate-700 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                <span className="text-xs font-bold text-slate-300 uppercase">Валюта:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                  <button
                    onClick={() => setCurrency('TJS')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      currency === 'TJS' ? 'bg-[#0b57d0] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    TJS (сомони)
                  </button>
                  <button
                    onClick={() => setCurrency('USD')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      currency === 'USD' ? 'bg-[#0b57d0] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    onClick={() => setCurrency('UZS')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      currency === 'UZS' ? 'bg-[#0b57d0] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    UZS (сум)
                  </button>
                </div>
              </div>

              {/* Slider 1 */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="agent-count-slider" className="text-xs sm:text-sm font-bold text-slate-200">
                    Торговых представителей в штате:
                  </label>
                  <span className="text-lg font-black text-amber-400 bg-slate-900 px-3 py-1 rounded border border-slate-700">
                    {agentCount} чел.
                  </span>
                </div>
                <input
                  id="agent-count-slider"
                  type="range"
                  min={3}
                  max={50}
                  step={1}
                  value={agentCount}
                  onChange={(e) => setAgentCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#0b57d0]"
                />
              </div>

              {/* Slider 2 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="monthly-revenue-slider" className="text-xs sm:text-sm font-bold text-slate-200">
                    Примерный месячный оборот:
                  </label>
                  <span className="text-lg font-black text-emerald-400 bg-slate-900 px-3 py-1 rounded border border-slate-700">
                    {Math.round(monthlyRevenue * currRate).toLocaleString()} {currSymbol}
                  </span>
                </div>
                <input
                  id="monthly-revenue-slider"
                  type="range"
                  min={50000}
                  max={1500000}
                  step={25000}
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#0b57d0]"
                />
              </div>
            </div>

            {/* Calculated Output (5 cols) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#0b57d0] to-[#1e3a8a] rounded-2xl p-6 sm:p-8 border border-blue-400/30">
              <div className="text-xs uppercase font-bold text-blue-200">
                Оценка ежемесячной выгоды:
              </div>

              <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                +{Math.round((potentialAdditionalRevenue + debtPreventionSavings) * currRate).toLocaleString()} {currSymbol}
              </div>

              <div className="mt-5 space-y-3 border-t border-blue-400/30 pt-4 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-100">Прирост за счет контроля АКБ:</span>
                  <span className="font-bold text-white">+{Math.round(potentialAdditionalRevenue * currRate).toLocaleString()} {currSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Предотвращение долгов (стоп-лист):</span>
                  <span className="font-bold text-emerald-300">+{Math.round(debtPreventionSavings * currRate).toLocaleString()} {currSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Экономия времени операторов:</span>
                  <span className="font-bold text-amber-300">~{operatorHoursSaved} часов в месяц</span>
                </div>
                <div className="flex justify-between bg-blue-950/50 p-2.5 rounded border border-blue-400/20 font-bold">
                  <span>Окупаемость программы:</span>
                  <span className="text-amber-300">Всего {estimatedPaybackDays} дней</span>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-6 w-full py-3 rounded-xl bg-white text-[#0b57d0] font-bold text-xs shadow-lg hover:bg-blue-50 transition-all text-center"
              >
                Получить коммерческое предложение
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION: TRANSPARENT PRICING IN TJS */}
      <section id="pricing" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs uppercase font-extrabold tracking-wider text-[#0b57d0] bg-blue-50 px-3 py-1 rounded border border-blue-200">
            Честные тарифы
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
            Прозрачная цена в сомони. Никаких валютных скачков.
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-2">
            14 дней бесплатный тест-драйв. Оплата только если система принесла реальную пользу.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* Tier 1: Старт */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="text-xs font-bold uppercase text-slate-400">Для малых команд</div>
              <h3 className="text-xl font-black text-slate-900 mt-1">«Старт»</h3>
              <p className="text-xs text-slate-500 mt-1">До 5 торговых агентов. Быстрый порядок.</p>
              
              <div className="my-5 pb-5 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">85 TJS</span>
                  <span className="text-xs text-slate-500 font-medium">/ агент в месяц</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-bold mt-1">Дешевле пачки сигарет в день на агента</div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>До 5 мобильных агентов (Android)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>GPS-контроль точек и маршруты</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Складской учет и остатки</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Базовые отчеты по продажам</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Бесплатное обучение за 20 минут</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 w-full py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all"
            >
              Выбрать «Старт»
            </button>
          </div>

          {/* Tier 2: Бизнес (Хит) */}
          <div className="bg-slate-900 text-white rounded-2xl border-2 border-[#0b57d0] p-6 flex flex-col justify-between shadow-xl relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0b57d0] text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
              🔥 Самый популярный выбор
            </div>

            <div>
              <div className="text-xs font-bold uppercase text-blue-400">Хит продаж</div>
              <h3 className="text-xl font-black text-white mt-1">«Бизнес Дистрибуция»</h3>
              <p className="text-xs text-slate-400 mt-1">Для растущих компаний от 6 до 25 агентов.</p>
              
              <div className="my-5 pb-5 border-b border-slate-800">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">110 TJS</span>
                  <span className="text-xs text-blue-200 font-medium">/ агент в месяц</span>
                </div>
                <div className="text-[11px] text-emerald-400 font-bold mt-1">Полная окупаемость за 7–9 дней</div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span><strong>Всё из тарифа «Старт»</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span><strong>Конструктор MBI в Excel (2D Pivot)</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span><strong>B2B Telegram Бот</strong> заказов для магазинов</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Кредитный стоп-лист и лимиты долга</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Готовая связка с 1С за 15 минут</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Прямая связь с техподдержкой в WhatsApp/TG</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 w-full py-3 rounded-xl bg-[#0b57d0] hover:bg-[#0848b0] text-white text-xs font-bold shadow-lg transition-all"
            >
              Подключить «Бизнес»
            </button>
          </div>

          {/* Tier 3: Enterprise */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="text-xs font-bold uppercase text-slate-400">Крупный опт</div>
              <h3 className="text-xl font-black text-slate-900 mt-1">«Enterprise»</h3>
              <p className="text-xs text-slate-500 mt-1">От 25+ агентов, филиалы в Согде, Хатлоне и РРП.</p>
              
              <div className="my-5 pb-5 border-b border-slate-100">
                <div className="text-2xl font-black text-slate-900">Индивидуально</div>
                <div className="text-xs text-slate-500 mt-0.5">Выделенный сервер / On-Premise</div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Неограниченное число агентов</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Развертывание на вашем сервере</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Кастомные доработки под логистику</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Персональный инженер 24/7</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 w-full py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all"
            >
              Обсудить условия
            </button>
          </div>

        </div>
      </section>

      {/* SECTION: HONEST FAQ */}
      <section id="faq" className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs uppercase font-extrabold tracking-wider text-[#0b57d0] bg-blue-50 px-3 py-1 rounded border border-blue-200">
            Вопрос - Ответ
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
            Честные ответы на частые вопросы
          </h2>
        </div>

        <div className="space-y-3 text-xs sm:text-sm">
          {[
            {
              q: 'Сколько времени занимает полный переход на SmartSale?',
              a: 'Ровно 1 рабочий день (24 часа). Мы сами переносим вашу базу товаров, остатки и клиентов из Excel или 1С. Вам не нужно останавливать продажи.'
            },
            {
              q: 'Можно ли безболезненно перейти с других программ или 1С?',
              a: 'Да. Мы предоставляем готовый конвертер данных: клиенты, прайс-листы, адреса и дебиторская задолженность переносятся без потери истории за один день.'
            },
            {
              q: 'Что делать, если в магазине или на рынке нет мобильного интернета?',
              a: 'Приложение SmartSale работает на 100% автономно в офлайн-режиме. Вся база точек и цен загружена в память смартфона. Когда агент выходит на связь (или подключается к Wi-Fi), все данные синхронизируются с сервером за пару секунд.'
            },
            {
              q: 'Смогут ли мои агенты научиться пользоваться программой?',
              a: 'Интерфейс сделан максимально простым — там всего несколько кнопок. Даже сотрудники в возрасте без опыта работы со смартфонами осваивают его за 20–30 минут.'
            },
            {
              q: 'Подходит ли система, если у нас небольшая компания (3–5 человек)?',
              a: 'Да! В отличие от других систем, которые отсекают небольшие компании и требуют минимум 50 пользователей, SmartSale открыт для малого и среднего бизнеса с тарифом «Старт».'
            },
            {
              q: 'Как защититься от накрутки координат GPS агентами?',
              a: 'Система имеет тройную защиту: сверяет радиус до точки (заказ не оформить дальше 25 метров), определяет фиктивные приложения Mock GPS и сохраняет время нахождения внутри магазина.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full py-3.5 px-5 text-left font-bold text-slate-900 flex items-center justify-between gap-3 hover:text-[#0b57d0] transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    openFaqIndex === idx ? 'rotate-180 text-[#0b57d0]' : ''
                  }`}
                />
              </button>
              {openFaqIndex === idx && (
                <div className="px-5 pb-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-2.5">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SECTION: CTA FORM (MEET US / REQUEST DEMO) */}
      <section className="py-16 bg-[#0b57d0] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-black">
            Попробуйте систему на ваших реальных товарах
          </h2>
          <p className="mt-3 text-blue-100 text-xs sm:text-sm">
            Оставьте телефон или напишите нам в Telegram — подключим бесплатный демо-доступ на 14 дней и покажем систему на ваших данных.
          </p>

          <div className="mt-8 bg-white rounded-2xl p-6 text-slate-900 text-left shadow-xl max-w-lg mx-auto">
            {formSuccess ? (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Заявка успешно отправлена!</h4>
                <p className="text-slate-600 text-xs mt-1.5">
                  Наш инженер свяжется с вами в течение 15 минут по телефону или в WhatsApp.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-3.5 text-xs">
                {formError && (
                  <div className="p-2.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor={ctaNameId} className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ваше имя *
                  </label>
                  <input
                    id={ctaNameId}
                    type="text"
                    required
                    placeholder="Например: Рустам"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#0b57d0] outline-none text-xs"
                  />
                </div>

                <div>
                  <label htmlFor={ctaPhoneId} className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Телефон (WhatsApp / Telegram) *
                  </label>
                  <input
                    id={ctaPhoneId}
                    type="tel"
                    required
                    placeholder="+992 900 00 00 00"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#0b57d0] outline-none text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={ctaCompanyId} className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Компания / Товар
                    </label>
                    <input
                      id={ctaCompanyId}
                      type="text"
                      placeholder="Название"
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#0b57d0] outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor={ctaAgentsId} className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Сколько агентов?
                    </label>
                    <select
                      id={ctaAgentsId}
                      value={formAgents}
                      onChange={(e) => setFormAgents(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#0b57d0] outline-none text-xs bg-white"
                    >
                      <option value="1-5">1 – 5 агентов</option>
                      <option value="5-15">5 – 15 агентов</option>
                      <option value="15-30">15 – 30 агентов</option>
                      <option value="30+">Более 30 агентов</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3.5 rounded-xl bg-[#0b57d0] hover:bg-[#0848b0] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {formLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Получить бесплатный доступ на 14 дней</span>
                  )}
                </button>
              </form>
            )}

            {/* Direct Instant Contact */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <span>Либо напишите напрямую:</span>
              <a
                href="https://t.me/tajcodes"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-[#0b57d0] hover:underline bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
              >
                <Send className="w-3 h-3 text-[#0b57d0]" />
                <span>Telegram: @tajcodes</span>
              </a>
              <a
                href="mailto:tajcodes@gmail.com"
                className="inline-flex items-center gap-1 font-bold text-slate-700 hover:underline bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"
              >
                <Mail className="w-3 h-3 text-emerald-600" />
                <span>tajcodes@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded bg-[#0b57d0] flex items-center justify-center font-bold text-white text-sm">
                  S
                </div>
                <span className="font-bold text-base text-white">SmartSale ERP</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Автоматизация полевых продаж, склада и дебиторки для дистрибьюторов в Таджикистане и Центральной Азии.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white text-xs uppercase mb-2.5">Разделы</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li><button onClick={() => scrollTo('features')} className="hover:text-white">Приложение агента (SFA)</button></li>
                <li><button onClick={() => scrollTo('mbi-constructor')} className="hover:text-white">Конструктор MBI в Excel</button></li>
                <li><button onClick={() => scrollTo('integration-1c')} className="hover:text-white">Связка с 1С</button></li>
                <li><button onClick={() => scrollTo('pricing')} className="hover:text-white">Тарифы в сомони</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-xs uppercase mb-2.5">Связь с нами</h4>
              <ul className="space-y-2 text-[11px] text-slate-400">
                <li className="flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  <span>Чат в Telegram: <a href="https://t.me/tajcodes" target="_blank" rel="noopener noreferrer" className="text-white font-bold hover:underline">@tajcodes</a></span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Email: <a href="mailto:tajcodes@gmail.com" className="text-white hover:underline font-mono">tajcodes@gmail.com</a></span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span>Telegram Бот: <a href="https://t.me/smartsalerbot" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:underline">@smartsalerbot</a></span>
                </li>
                <li>Техподдержка 24/7 для клиентов</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-xs uppercase mb-2.5">Приложение агента</h4>
              <p className="text-[11px] text-slate-500 mb-2">
                Прямая ссылка на APK файл для мобильных телефонов агентов:
              </p>
              <a
                href="/SmartSale_app.apk"
                download="SmartSale_app.apk"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] border border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Скачать SmartSale APK</span>
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>© 2026 Savdo Tech. Все права защищены. SmartSale ERP 2.0</div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/login')} className="hover:text-white">Вход для клиентов</button>
              <span>•</span>
              <button onClick={() => setIsModalOpen(true)} className="hover:text-white">Запросить выезд специалиста</button>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL: DEMO REQUEST */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => { setIsModalOpen(false); setFormSuccess(false); setFormError(''); }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {formSuccess ? (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">Заявка принята!</h4>
                <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                  Спасибо! Мы свяжемся с вами в течение 15 минут. Также можете написать нам напрямую в Telegram: <a href="https://t.me/tajcodes" target="_blank" rel="noopener noreferrer" className="text-[#0b57d0] font-bold hover:underline">@tajcodes</a> или на почту <a href="mailto:tajcodes@gmail.com" className="text-[#0b57d0] font-bold hover:underline">tajcodes@gmail.com</a>.
                </p>
                <button
                  onClick={() => { setIsModalOpen(false); setFormSuccess(false); }}
                  className="mt-5 px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Попробуйте SmartSale 2.0 в действии
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Заполните поля — мы покажем реальную работу системы на ваших данных.
                </p>

                {formError && (
                  <div className="mt-3 p-2.5 rounded bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleLeadSubmit} className="mt-4 space-y-3 text-xs">
                  <div>
                    <label htmlFor={modalNameId} className="block font-bold text-slate-700 uppercase mb-1">
                      Имя *
                    </label>
                    <input
                      id={modalNameId}
                      type="text"
                      required
                      placeholder="Ваше имя"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0b57d0] outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor={modalPhoneId} className="block font-bold text-slate-700 uppercase mb-1">
                      Телефон (Telegram / WhatsApp) *
                    </label>
                    <input
                      id={modalPhoneId}
                      type="tel"
                      required
                      placeholder="+992 900 00 00 00"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0b57d0] outline-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor={modalCompanyId} className="block font-bold text-slate-700 uppercase mb-1">
                        Компания
                      </label>
                      <input
                        id={modalCompanyId}
                        type="text"
                        placeholder="Название"
                        value={formCompany}
                        onChange={(e) => setFormCompany(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0b57d0] outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor={modalAgentsId} className="block font-bold text-slate-700 uppercase mb-1">
                        Агентов в штате
                      </label>
                      <select
                        id={modalAgentsId}
                        value={formAgents}
                        onChange={(e) => setFormAgents(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#0b57d0] outline-none bg-white"
                      >
                        <option value="1-5">1 – 5 агентов</option>
                        <option value="5-15">5 – 15 агентов</option>
                        <option value="15-30">15 – 30 агентов</option>
                        <option value="30+">30+ агентов</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor={modalCommentId} className="block font-bold text-slate-700 uppercase mb-1">
                      Текущая система
                    </label>
                    <textarea
                      id={modalCommentId}
                      rows={2}
                      placeholder="Например: сейчас ведем учет в Excel / 1С / тетрадях..."
                      value={formComment}
                      onChange={(e) => setFormComment(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:border-[#0b57d0] outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full py-3 rounded-xl bg-[#0b57d0] hover:bg-[#0848b0] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-1"
                  >
                    {formLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Отправить заявку</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
