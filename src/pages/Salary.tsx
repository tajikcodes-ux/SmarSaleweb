import { useEffect, useState } from 'react';
import api from '../services/api';
import { Coins, RefreshCw, CheckCircle2, AlertCircle, Settings2, Save } from 'lucide-react';

export default function Salary() {
  const [activeTab, setActiveTab] = useState<'sheet' | 'settings'>('sheet');
  const [calculations, setCalculations] = useState<any[]>([]);
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [recalculating, setRecalculating] = useState(false);

  // Form states for settings
  const [selectedRole, setSelectedRole] = useState('SALES_REP');
  const [baseSalary, setBaseSalary] = useState('2000');
  const [bonusPercentage, setBonusPercentage] = useState('2.0');
  const [minVisitRate, setMinVisitRate] = useState('85');

  const fetchCalculations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/salary/calculations', { params: { month } });
      setCalculations(response.data);
    } catch (err) {
      console.error('Failed to load salary calculations', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/salary/kpi-settings');
      setSettingsList(response.data);
      
      // Auto-populate form with active role settings if found
      const current = response.data.find((s: any) => s.role === selectedRole);
      if (current) {
        setBaseSalary(parseFloat(current.baseSalary).toString());
        setBonusPercentage((parseFloat(current.bonusPercentage) * 100).toFixed(1));
        setMinVisitRate(parseFloat(current.minVisitRate).toString());
      }
    } catch (err) {
      console.error('Failed to load KPI settings', err);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.post('/salary/recalculate', { month });
      await fetchCalculations();
    } catch (err) {
      console.error('Recalculation failed', err);
      alert('Ошибка при перерасчете ведомости');
    } finally {
      setRecalculating(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedBonus = parseFloat(bonusPercentage) / 100.0;
      await api.post('/salary/kpi-settings', {
        role: selectedRole,
        baseSalary: parseFloat(baseSalary),
        bonusPercentage: parsedBonus,
        minVisitRate: parseFloat(minVisitRate),
      });
      alert('Настройки сохранены!');
      fetchSettings();
    } catch (err) {
      console.error('Failed to save KPI settings', err);
      alert('Ошибка сохранения настроек');
    }
  };

  useEffect(() => {
    if (activeTab === 'sheet') {
      fetchCalculations();
    } else {
      fetchSettings();
    }
  }, [month, activeTab]);

  // Adjust inputs when active role changes in settings form
  useEffect(() => {
    const current = settingsList.find((s: any) => s.role === selectedRole);
    if (current) {
      setBaseSalary(parseFloat(current.baseSalary).toString());
      setBonusPercentage((parseFloat(current.bonusPercentage) * 100).toFixed(1));
      setMinVisitRate(parseFloat(current.minVisitRate).toString());
    } else {
      // Default fallbacks if no entry exists yet
      if (selectedRole === 'SUPERVISOR') {
        setBaseSalary('3500');
        setBonusPercentage('1.5');
        setMinVisitRate('90');
      } else if (selectedRole === 'SALES_REP') {
        setBaseSalary('2000');
        setBonusPercentage('2.0');
        setMinVisitRate('85');
      } else {
        setBaseSalary('3000');
        setBonusPercentage('0.0');
        setMinVisitRate('0');
      }
    }
  }, [selectedRole, settingsList]);

  // Calculate quick summary metrics
  const totalPayout = calculations.reduce((sum, item) => sum + Number(item.totalSalary), 0);
  const totalSales = calculations.reduce((sum, item) => sum + Number(item.salesVolume), 0);
  
  const targetMetCount = calculations.filter((item) => {
    const visitRatePercent = Number(item.visitRate) * 100;
    
    // Find dynamic threshold from settingsList, else fallback
    const rule = settingsList.find((s: any) => s.role === item.user?.role);
    const minRequired = rule ? parseFloat(rule.minVisitRate) : (item.user?.role === 'SUPERVISOR' ? 90 : 85);
    
    return visitRatePercent >= minRequired;
  }).length;
  
  const targetMetPercentage = calculations.length > 0 ? Math.round((targetMetCount / calculations.length) * 100) : 100;

  if (loading && calculations.length === 0 && activeTab === 'sheet') {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="w-8 h-8 border-4 border-slate-200 border-t-[#37352f] rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-[#37352f]">
      {/* Top action panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
        <div>
          <h3 className="font-bold text-[#1d1d1f] text-base flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#37352f]" />
            Зарплата и Бонусы (KPI)
          </h3>
          <p className="text-[11px] text-[#86868b] mt-0.5">
            Расчет заработной платы на основе базового оклада и бонусов при выполнении KPI посещений
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'sheet' && (
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg px-3 py-1.5 text-xs font-medium text-[#37352f] focus:outline-none cursor-pointer"
            >
              <option value="2026-05">Май 2026</option>
              <option value="2026-06">Июнь 2026</option>
              <option value="2026-07">Июль 2026</option>
            </select>
          )}

          {activeTab === 'sheet' && (
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#f1f1f0] border border-[#e9e9e7] hover:bg-slate-100 text-[#37352f] disabled:opacity-50 rounded-lg font-bold text-xs transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
              <span>Пересчитать</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu - Apple daylight style */}
      <div className="flex border-b border-[#e9e9e7] gap-6 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('sheet')}
          className={`pb-2 transition-all ${
            activeTab === 'sheet'
              ? 'border-b-2 border-[#0071e3] text-[#0071e3]'
              : 'text-[#86868b] hover:text-[#37352f] border-b-2 border-transparent'
          }`}
        >
          Ведомость начислений
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'settings'
              ? 'border-b-2 border-[#0071e3] text-[#0071e3]'
              : 'text-[#86868b] hover:text-[#37352f] border-b-2 border-transparent'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          Настройки KPI по ролям
        </button>
      </div>

      {activeTab === 'sheet' ? (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                Фонд оплаты труда за месяц
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-bold text-[#1d1d1f] font-mono">
                  {totalPayout.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-[#86868b] font-bold">TJS</span>
              </div>
              <span className="text-[10px] text-[#86868b] block mt-1">Оклад + начисленные бонусы за продажи</span>
            </div>

            <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                Выполнение KPI (Визиты)
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-bold text-emerald-600 font-mono">{targetMetPercentage}%</span>
                <span className="text-xs text-[#86868b] font-bold">отдела</span>
              </div>
              <span className="text-[10px] text-[#86868b] block mt-1">
                Соблюдение минимального лимита посещений из настроек KPI
              </span>
            </div>

            <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                Объем учтенных продаж
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-bold text-[#0071e3] font-mono">
                  {totalSales.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-[#86868b] font-bold">TJS</span>
              </div>
              <span className="text-[10px] text-[#86868b] block mt-1">Сумма доставленных и отгруженных заказов</span>
            </div>
          </div>

          {/* Main calculation sheet table */}
          <div className="bg-white border border-[#e9e9e7] rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e9e9e7] bg-[#fbfbfa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                  <th className="p-3.5">Сотрудник</th>
                  <th className="p-3.5">Роль</th>
                  <th className="p-3.5">Оклад</th>
                  <th className="p-3.5">Посещения (KPI)</th>
                  <th className="p-3.5">Личные продажи</th>
                  <th className="p-3.5">Бонус</th>
                  <th className="p-3.5">Итого к выплате</th>
                  <th className="p-3.5 text-center">Условие KPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9e9e7]/60 text-xs">
                {calculations.map((item) => {
                  const visitRatePercent = Math.round(Number(item.visitRate) * 100);
                  const userRoleName = typeof item.user?.role === 'object' && item.user?.role !== null
                    ? (item.user.role as any).name
                    : item.user?.role;
                  const rule = settingsList.find((s: any) => s.role === userRoleName);
                  const minRequired = rule ? parseFloat(rule.minVisitRate) : (userRoleName === 'SUPERVISOR' ? 90 : 85);
                  const kpiPassed = visitRatePercent >= minRequired;

                  return (
                    <tr key={item.id} className="hover:bg-[#fbfbfa] transition-colors">
                      <td className="p-3.5 font-bold text-[#37352f]">
                        {item.user?.firstName} {item.user?.lastName}
                        <span className="block text-[9px] font-normal text-[#86868b] mt-0.5">@{item.user?.username}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[#86868b] text-[9px] font-bold">
                          {userRoleName}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[#37352f]">
                        {parseFloat(item.baseSalary).toFixed(2)} TJS
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold font-mono ${kpiPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {visitRatePercent}%
                          </span>
                          <span className="text-[10px] text-[#86868b]">из {minRequired}%</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-[#37352f]">
                        {parseFloat(item.salesVolume).toFixed(2)} TJS
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-700">
                        {parseFloat(item.bonusEarned).toFixed(2)} TJS
                      </td>
                      <td className="p-3.5 font-mono font-bold text-[#1d1d1f] text-sm bg-slate-50/40">
                        {parseFloat(item.totalSalary).toFixed(2)} TJS
                      </td>
                      <td className="p-3.5 text-center">
                        {kpiPassed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[9px] border border-emerald-100">
                            <CheckCircle2 className="w-3 h-3" />
                            Выполнен
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full text-[9px] border border-amber-100">
                            <AlertCircle className="w-3 h-3" />
                            Недостаточно
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Settings panel */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Edit Form */}
          <div className="lg:col-span-1 bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm space-y-4">
            <h4 className="font-bold text-[#1d1d1f] text-xs pb-2 border-b border-[#e9e9e7] flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-[#0071e3]" />
              Редактирование правил KPI
            </h4>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Роль сотрудника</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none text-[#37352f] font-bold"
                >
                  <option value="SALES_REP">Торговый представитель (SALES_REP)</option>
                  <option value="SUPERVISOR">Супервайзер (SUPERVISOR)</option>
                  <option value="SALES_MANAGER">Менеджер по продажам (SALES_MANAGER)</option>
                  <option value="OWNER">Владелец (OWNER)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Базовый оклад (TJS)</label>
                <input
                  type="number"
                  required
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Бонус (% от продаж)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={bonusPercentage}
                  onChange={(e) => setBonusPercentage(e.target.value)}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Норма визитов (минимальный %)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={minVisitRate}
                  onChange={(e) => setMinVisitRate(e.target.value)}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg text-xs font-bold shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                Сохранить в базу
              </button>
            </form>
          </div>

          {/* Current Settings Table */}
          <div className="lg:col-span-2 bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
            <h4 className="font-bold text-[#1d1d1f] text-xs pb-3 border-b border-[#e9e9e7]">
              Действующие тарифы и пороги визитов
            </h4>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e9e9e7] bg-[#fbfbfa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                    <th className="p-3">Роль</th>
                    <th className="p-3">Оклад</th>
                    <th className="p-3">Комиссия</th>
                    <th className="p-3">Норма визитов</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9e9e7]/60 text-xs">
                  {settingsList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                        Пользовательские тарифы не настроены. Используются правила по умолчанию.
                      </td>
                    </tr>
                  ) : (
                    settingsList.map((item) => (
                      <tr key={item.id} className="hover:bg-[#fbfbfa]">
                        <td className="p-3 font-bold text-[#37352f]">{item.role}</td>
                        <td className="p-3 font-mono">{parseFloat(item.baseSalary).toFixed(2)} TJS</td>
                        <td className="p-3 font-mono">{(parseFloat(item.bonusPercentage) * 100).toFixed(1)} %</td>
                        <td className="p-3 font-mono font-bold text-[#0071e3]">{parseFloat(item.minVisitRate).toFixed(0)} %</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
