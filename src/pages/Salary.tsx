import { useEffect, useState } from 'react';
import api from '../services/api';
import { Coins, RefreshCw, CheckCircle2, AlertCircle, Settings2, Save, Target, Plus, Edit2, Sparkles } from 'lucide-react';

export default function Salary() {
  const [activeTab, setActiveTab] = useState<'sheet' | 'settings' | 'targets'>('sheet');
  const [calculations, setCalculations] = useState<any[]>([]);
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [salesTargets, setSalesTargets] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [recalculating, setRecalculating] = useState(false);

  // Sales target modal states
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetForm, setTargetForm] = useState({
    salesRepId: '',
    targetRevenue: '50000',
    targetAkb: '30',
    targetOrders: '45',
    notes: '',
  });

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

  const fetchTargets = async () => {
    setLoadingTargets(true);
    try {
      const [res, uRes] = await Promise.all([
        api.get('/salary/targets', { params: { month } }),
        allUsers.length === 0 ? api.get('/users').catch(() => ({ data: [] })) : Promise.resolve({ data: allUsers }),
      ]);
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setSalesTargets(items);
      if (allUsers.length === 0 && uRes.data) {
        setAllUsers(uRes.data);
      }
    } catch (err) {
      console.error('Failed to load sales targets', err);
    } finally {
      setLoadingTargets(false);
    }
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetForm.salesRepId) {
      alert('Пожалуйста, выберите торгового представителя');
      return;
    }
    try {
      await api.post('/salary/targets', {
        salesRepId: targetForm.salesRepId,
        month,
        targetRevenue: parseFloat(targetForm.targetRevenue) || 0,
        targetAkb: parseInt(targetForm.targetAkb) || 0,
        targetOrders: parseInt(targetForm.targetOrders) || 0,
        notes: targetForm.notes || undefined,
      });
      setShowTargetModal(false);
      fetchTargets();
    } catch (err: any) {
      console.error('Failed to save target', err);
      alert(err.response?.data?.message || 'Ошибка сохранения плана продаж');
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
    } else if (activeTab === 'settings') {
      fetchSettings();
    } else if (activeTab === 'targets') {
      fetchTargets();
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
      <div className="space-y-6 animate-pulse">
        {/* Top action panel Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
          <div className="space-y-2">
            <div className="h-5 w-52 bg-slate-200 rounded-md"></div>
            <div className="h-3 w-80 bg-slate-100 rounded-md"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-28 bg-slate-100 rounded-lg"></div>
            <div className="h-8 w-28 bg-slate-200 rounded-lg"></div>
          </div>
        </div>

        {/* Tabs Menu Skeleton */}
        <div className="flex border-b border-[#e9e9e7] gap-6 pb-2">
          <div className="h-4 w-36 bg-slate-200 rounded"></div>
          <div className="h-4 w-40 bg-slate-100 rounded"></div>
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm space-y-2">
              <div className="h-3 w-32 bg-slate-100 rounded"></div>
              <div className="h-7 w-28 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white border border-[#e9e9e7] rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex gap-6 bg-slate-50/50">
            <div className="h-3.5 w-32 bg-slate-200 rounded"></div>
            <div className="h-3.5 w-24 bg-slate-200 rounded"></div>
            <div className="h-3.5 w-28 bg-slate-200 rounded"></div>
            <div className="h-3.5 w-28 bg-slate-200 rounded"></div>
            <div className="h-3.5 w-24 bg-slate-200 rounded ml-auto"></div>
          </div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                  <div className="space-y-1">
                    <div className="h-3.5 w-32 bg-slate-200 rounded"></div>
                    <div className="h-2.5 w-20 bg-slate-100 rounded"></div>
                  </div>
                </div>
                <div className="h-4 w-20 bg-slate-100 rounded"></div>
                <div className="h-4 w-24 bg-slate-100 rounded"></div>
                <div className="h-4 w-24 bg-slate-100 rounded"></div>
                <div className="h-5 w-28 bg-slate-200 rounded font-bold"></div>
              </div>
            ))}
          </div>
        </div>
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
          {(activeTab === 'sheet' || activeTab === 'targets') && (
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg px-3 py-1.5 text-xs font-medium text-[#37352f] focus:outline-none cursor-pointer"
            >
              <option value="2026-01">Январь 2026</option>
              <option value="2026-02">Февраль 2026</option>
              <option value="2026-03">Март 2026</option>
              <option value="2026-04">Апрель 2026</option>
              <option value="2026-05">Май 2026</option>
              <option value="2026-06">Июнь 2026</option>
              <option value="2026-07">Июль 2026</option>
              <option value="2026-08">Август 2026</option>
              <option value="2026-09">Сентябрь 2026</option>
              <option value="2026-10">Октябрь 2026</option>
              <option value="2026-11">Ноябрь 2026</option>
              <option value="2026-12">Декабрь 2026</option>
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

          {activeTab === 'targets' && (
            <button
              onClick={() => {
                const defaultRep = allUsers.find((u: any) => u.role?.name === 'SALES_REP' || u.role === 'SALES_REP')?.id || allUsers[0]?.id || '';
                setTargetForm({
                  salesRepId: defaultRep,
                  targetRevenue: '50000',
                  targetAkb: '30',
                  targetOrders: '45',
                  notes: '',
                });
                setShowTargetModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-bold text-xs transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Установить план</span>
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
          onClick={() => setActiveTab('targets')}
          className={`pb-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'targets'
              ? 'border-b-2 border-[#0071e3] text-[#0071e3]'
              : 'text-[#86868b] hover:text-[#37352f] border-b-2 border-transparent'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          Планы продаж и KPI
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
                  <th className="p-3.5 text-rose-600">Штрафы</th>
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
                      <td className="p-3.5 font-mono font-bold text-rose-600">
                        {item.penaltyAmount && parseFloat(item.penaltyAmount) > 0 ? (
                          <div>
                            <span>-{parseFloat(item.penaltyAmount).toFixed(2)} TJS</span>
                            {item.penaltyReason && (
                              <span className="block text-[9px] text-rose-400 font-normal italic">{item.penaltyReason}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#86868b] font-normal">0.00 TJS</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-[#1d1d1f] text-sm bg-slate-50/40">
                        {parseFloat(item.totalSalary).toFixed(2)} TJS
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
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
                          <button
                            onClick={() => {
                              const amountStr = prompt(`Введите сумму штрафа (TJS) для ${item.user?.firstName}:`, item.penaltyAmount || '100');
                              if (amountStr !== null) {
                                const reasonStr = prompt(`Укажите причину штрафа:`, item.penaltyReason || 'Нарушение регламента / Опоздание') || 'Ручной штраф администратора';
                                api.post('/salary/apply-penalty', {
                                  userId: item.userId,
                                  month,
                                  penaltyAmount: parseFloat(amountStr) || 0,
                                  penaltyReason: reasonStr
                                }).then(() => {
                                  alert('Штраф успешно применен!');
                                  fetchCalculations();
                                }).catch(err => {
                                  console.error(err);
                                  alert('Ошибка выписки штрафа');
                                });
                              }
                            }}
                            title="Выписать ручной штраф"
                            className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 text-[10px] font-bold rounded-lg transition-colors"
                          >
                            ⛔ Штраф
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === 'settings' ? (
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
      ) : (
        <div className="space-y-6">
          {/* Targets Metric Cards */}
          {(() => {
            const list = Array.isArray(salesTargets) ? salesTargets : [];
            const totalTargetRevenue = list.reduce((sum, t) => sum + Number(t.targetRevenue || 0), 0);
            const totalActualRevenue = list.reduce((sum, t) => sum + Number(t.actualRevenue || 0), 0);
            const revPct = totalTargetRevenue > 0 ? Math.round((totalActualRevenue / totalTargetRevenue) * 100) : 0;

            const totalTargetAkb = list.reduce((sum, t) => sum + Number(t.targetAkb || 0), 0);
            const totalActualAkb = list.reduce((sum, t) => sum + Number(t.actualAkb || 0), 0);
            const akbPct = totalTargetAkb > 0 ? Math.round((totalActualAkb / totalTargetAkb) * 100) : 0;

            const totalTargetOrders = list.reduce((sum, t) => sum + Number(t.targetOrders || 0), 0);
            const totalActualOrders = list.reduce((sum, t) => sum + Number(t.actualOrders || 0), 0);
            const ordPct = totalTargetOrders > 0 ? Math.round((totalActualOrders / totalTargetOrders) * 100) : 0;

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                      План выручки отдела
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${revPct >= 100 ? 'bg-emerald-50 text-emerald-600' : revPct >= 70 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                      {revPct}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-bold text-[#1d1d1f] font-mono">
                      {totalActualRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs text-[#86868b]">/ {totalTargetRevenue.toLocaleString('ru-RU')} TJS</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${revPct >= 100 ? 'bg-emerald-500' : revPct >= 70 ? 'bg-[#0071e3]' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(revPct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                      Активная Клиентская База (АКБ)
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${akbPct >= 100 ? 'bg-emerald-50 text-emerald-600' : akbPct >= 70 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                      {akbPct}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-bold text-emerald-600 font-mono">{totalActualAkb}</span>
                    <span className="text-xs text-[#86868b]">/ {totalTargetAkb} ТТ</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${akbPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(akbPct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider block">
                      Количество заказов
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ordPct >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-[#37352f]'}`}>
                      {ordPct}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-bold text-[#0071e3] font-mono">{totalActualOrders}</span>
                    <span className="text-xs text-[#86868b]">/ {totalTargetOrders} шт</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-[#0071e3] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(ordPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Targets Table */}
          <div className="bg-white border border-[#e9e9e7] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#e9e9e7] flex justify-between items-center">
              <div>
                <h4 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#0071e3]" />
                  Индивидуальные планы торговых представителей ({salesTargets.length})
                </h4>
                <p className="text-[11px] text-[#86868b] mt-0.5">
                  План vs Факт по выручке, охвату клиентской базы и прогноз выполнения (Pace / Forecast)
                </p>
              </div>
            </div>

            {loadingTargets ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0071e3]" />
                <span className="text-xs font-medium">Загрузка планов продаж...</span>
              </div>
            ) : salesTargets.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Target className="w-10 h-10 text-slate-300 mx-auto" />
                <h5 className="font-bold text-sm text-[#1d1d1f]">Планы на {month} еще не установлены</h5>
                <p className="text-xs text-[#86868b] max-w-md mx-auto">
                  Установите индивидуальные квоты по выручке и АКБ для торговых агентов, чтобы отслеживать прогресс в реальном времени.
                </p>
                <button
                  onClick={() => {
                    const defaultRep = allUsers.find((u: any) => u.role?.name === 'SALES_REP' || u.role === 'SALES_REP')?.id || allUsers[0]?.id || '';
                    setTargetForm({
                      salesRepId: defaultRep,
                      targetRevenue: '50000',
                      targetAkb: '30',
                      targetOrders: '45',
                      notes: '',
                    });
                    setShowTargetModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] text-white rounded-lg text-xs font-bold hover:bg-[#0077ed] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Установить первый план
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e9e9e7] bg-[#fbfbfa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                      <th className="p-3.5">Торговый представитель</th>
                      <th className="p-3.5">План выручки</th>
                      <th className="p-3.5">Факт выручки</th>
                      <th className="p-3.5">Прогресс</th>
                      <th className="p-3.5">АКБ (Факт / План)</th>
                      <th className="p-3.5">Заказы</th>
                      <th className="p-3.5">Прогноз к концу месяца</th>
                      <th className="p-3.5 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e9e9e7]/70 text-xs">
                    {(Array.isArray(salesTargets) ? salesTargets : []).map((item: any, idx: number) => {
                      const rep = item.user || item.salesRep;
                      const repId = item.salesRepId || rep?.id || '';
                      const revPct = Number(item.revenuePercent || 0);
                      const akbPct = Number(item.akbPercent || 0);
                      const forecast = Number(item.projectedRevenue || item.paceForecast?.forecastRevenue || 0);

                      return (
                        <tr key={item.id || item.targetId || repId || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[11px] text-[#37352f]">
                                {rep?.firstName ? rep.firstName[0] : 'U'}
                              </div>
                              <div>
                                <span className="font-bold text-[#1d1d1f] block">
                                  {rep?.firstName} {rep?.lastName}
                                </span>
                                <span className="text-[10px] text-[#86868b]">@{rep?.username}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono font-medium text-[#37352f]">
                            {Number(item.targetRevenue).toLocaleString('ru-RU')} TJS
                          </td>
                          <td className="p-3.5 font-mono font-bold text-[#1d1d1f]">
                            {Number(item.actualRevenue).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TJS
                          </td>
                          <td className="p-3.5">
                            <div className="w-28 space-y-1">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span className={revPct >= 100 ? 'text-emerald-600' : revPct >= 70 ? 'text-[#0071e3]' : 'text-amber-600'}>
                                  {revPct}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${revPct >= 100 ? 'bg-emerald-500' : revPct >= 70 ? 'bg-[#0071e3]' : 'bg-amber-500'}`}
                                  style={{ width: `${Math.min(revPct, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-800">{item.actualAkb}</span>
                            <span className="text-slate-400"> / {item.targetAkb} ТТ</span>
                            <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({akbPct}%)</span>
                          </td>
                          <td className="p-3.5 font-mono text-[#37352f]">
                            <span className="font-bold">{item.actualOrders}</span>
                            <span className="text-slate-400"> / {item.targetOrders}</span>
                          </td>
                          <td className="p-3.5 font-mono">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                              <Sparkles className="w-3 h-3 text-[#0071e3]" />
                              {forecast.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} TJS
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => {
                                setTargetForm({
                                  salesRepId: repId,
                                  targetRevenue: String(item.targetRevenue || ''),
                                  targetAkb: String(item.targetAkb || ''),
                                  targetOrders: String(item.targetOrders || ''),
                                  notes: item.notes || '',
                                });
                                setShowTargetModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-[#0071e3] hover:bg-slate-100 rounded-lg transition-all"
                              title="Редактировать план"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Target Setup Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#e9e9e7] max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#e9e9e7] pb-3">
              <h3 className="font-bold text-sm text-[#1d1d1f] flex items-center gap-2">
                <Target className="w-4 h-4 text-[#0071e3]" />
                Установка плана продаж на {month}
              </h3>
              <button
                onClick={() => setShowTargetModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#37352f] mb-1">
                  Торговый представитель
                </label>
                <select
                  value={targetForm.salesRepId}
                  onChange={(e) => setTargetForm({ ...targetForm, salesRepId: e.target.value })}
                  className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs font-medium text-[#37352f] focus:outline-none focus:border-[#0071e3]"
                  required
                >
                  <option value="">Выберите сотрудника</option>
                  {allUsers
                    .filter((u: any) => u.role?.name === 'SALES_REP' || u.role === 'SALES_REP' || u.role?.name === 'SUPERVISOR' || u.role === 'SUPERVISOR')
                    .map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} (@{user.username})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#37352f] mb-1">
                  План по выручке (TJS)
                </label>
                <input
                  type="number"
                  step="100"
                  value={targetForm.targetRevenue}
                  onChange={(e) => setTargetForm({ ...targetForm, targetRevenue: e.target.value })}
                  placeholder="Например: 50000"
                  className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#0071e3]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#37352f] mb-1">
                    План АКБ (торговых точек)
                  </label>
                  <input
                    type="number"
                    value={targetForm.targetAkb}
                    onChange={(e) => setTargetForm({ ...targetForm, targetAkb: e.target.value })}
                    placeholder="Например: 35"
                    className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#0071e3]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#37352f] mb-1">
                    План заказов (шт.)
                  </label>
                  <input
                    type="number"
                    value={targetForm.targetOrders}
                    onChange={(e) => setTargetForm({ ...targetForm, targetOrders: e.target.value })}
                    placeholder="Например: 50"
                    className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#0071e3]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#37352f] mb-1">
                  Заметки / Дополнительные условия
                </label>
                <textarea
                  value={targetForm.notes}
                  onChange={(e) => setTargetForm({ ...targetForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Комментарии по приоритетным категориям или фокусным товарам..."
                  className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#e9e9e7]">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="px-4 py-2 border border-[#e9e9e7] rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Сохранить план
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
