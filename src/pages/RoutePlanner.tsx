import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Plus, RefreshCw, Save, Trash, X } from 'lucide-react';
import api from '../services/api';

const card = 'bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl shadow-sm';
const input = 'w-full px-3 py-2 text-xs border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#191919] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
const button = 'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50';
const primary = `${button} bg-indigo-600 text-white hover:bg-indigo-700`;
const secondary = `${button} border border-[#e9e9e7] dark:border-[#3f3f3f] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2a2a2a]`;

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const PERIODS: Array<[number, string]> = [[1, 'Каждую неделю'], [2, 'Через 1 неделю'], [3, 'Через 2 недели'], [4, 'Через 3 недели'], [5, 'Через 4 недели'], [0, 'Раз в месяц']];
const STATUS_STYLE: Record<string, string> = {
  ok: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300',
  under: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300',
  over: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300',
};

const errorText = (err: any, fallback: string) => {
  const message = err?.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || fallback;
};

const nextMonth = () => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
  return d.toISOString().slice(0, 7);
};

interface Settings {
  normMin: number;
  normMax: number;
  zonesByWeekday: Record<string, string[]>;
  zonesByDate: Record<string, string[]>;
  useTemplates: boolean;
}

const DEFAULT_SETTINGS: Settings = { normMin: 20, normMax: 30, zonesByWeekday: {}, zonesByDate: {}, useTemplates: true };

// Per-agent schedule is a convenience of this browser; the plan itself is saved on the server
const settingsKey = (agentId: string) => `smartsale_planner_${agentId}`;
const loadSettings = (agentId: string): Settings => {
  try {
    const raw = localStorage.getItem(settingsKey(agentId));
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

function monthGrid(month: string) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days: Array<{ date: string; day: number; weekday: number } | null> = [];
  const lead = (first.getUTCDay() + 6) % 7;
  for (let i = 0; i < lead; i++) days.push(null);
  for (let d = first; d.getUTCMonth() === m - 1; d = new Date(d.getTime() + 86_400_000)) {
    days.push({ date: d.toISOString().slice(0, 10), day: d.getUTCDate(), weekday: ((d.getUTCDay() + 6) % 7) + 1 });
  }
  return days;
}

export default function RoutePlanner() {
  const [tab, setTab] = useState<'plan' | 'templates'>('plan');
  const [agents, setAgents] = useState<any[]>([]);
  const [agentId, setAgentId] = useState('');
  const [month, setMonth] = useState(nextMonth());
  const [zones, setZones] = useState<any[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [plan, setPlan] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string | null>(null);

  useEffect(() => {
    api.get('/route-plans/agents').then((res) => {
      setAgents(res.data || []);
      if (res.data?.length) setAgentId((current) => current || res.data[0].id);
    }).catch((err) => setError(errorText(err, 'Не удалось загрузить агентов')));
  }, []);

  useEffect(() => {
    if (!agentId) return;
    setPlan(null);
    setSettings(loadSettings(agentId));
    api.get('/route-plans/zones', { params: { agentId } }).then((res) => setZones(res.data || [])).catch(() => setZones([]));
  }, [agentId]);

  const updateSettings = (next: Settings) => {
    setSettings(next);
    try {
      localStorage.setItem(settingsKey(agentId), JSON.stringify(next));
    } catch {
      // storage is optional
    }
  };

  const toggleZone = (weekday: number, zone: string) => {
    const current = settings.zonesByWeekday[weekday] ?? [];
    const next = current.includes(zone) ? current.filter((z) => z !== zone) : [...current, zone];
    updateSettings({ ...settings, zonesByWeekday: { ...settings.zonesByWeekday, [weekday]: next } });
  };

  const setDateZones = (date: string, value: string[] | null) => {
    const zonesByDate = { ...settings.zonesByDate };
    if (value === null) delete zonesByDate[date];
    else zonesByDate[date] = value;
    updateSettings({ ...settings, zonesByDate });
  };

  const body = () => ({
    agentId,
    month,
    normMin: settings.normMin,
    normMax: settings.normMax,
    zonesByWeekday: settings.zonesByWeekday,
    zonesByDate: Object.fromEntries(Object.entries(settings.zonesByDate).filter(([d]) => d.startsWith(month))),
    useTemplates: settings.useTemplates,
  });

  const preview = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setPlan((await api.post('/route-plans/preview', body())).data);
    } catch (err) {
      setError(errorText(err, 'Не удалось рассчитать план'));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!plan) return;
    const off = settings.useTemplates ? '' : '\nПостоянные шаблоны агента будут выключены, чтобы не задваивать визиты.';
    if (!window.confirm(`Сохранить план на ${month}: ${plan.summary.placed} визитов? Прежний план месяца без отметок о визите заменится.${off}`)) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/route-plans/apply', body());
      setPlan(res.data);
      setNotice(`План сохранён: добавлено ${res.data.applied.created} визитов, заменено прежних ${res.data.applied.removed}${res.data.applied.templatesOff ? `, выключено шаблонов ${res.data.applied.templatesOff}` : ''}. Агент увидит маршрут дня в приложении.`);
    } catch (err) {
      setError(errorText(err, 'Не удалось сохранить план'));
    } finally {
      setBusy(false);
    }
  };

  const grid = useMemo(() => monthGrid(month), [month]);
  const dayByDate = useMemo(() => new Map<string, any>((plan?.days ?? []).map((d: any) => [d.date, d])), [plan]);
  const zoneNames = zones.map((z) => z.zone);
  const zonesFor = (date: string, weekday: number) => settings.zonesByDate[date] ?? settings.zonesByWeekday[weekday] ?? [];
  const maxLoad = Math.max(settings.normMax, ...(plan?.days ?? []).map((d: any) => d.total));
  const agent = agents.find((a) => a.id === agentId);

  return (
    <div className="space-y-5">
      <div className={`${card} p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3`}>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" /> Планировщик маршрутов
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Раскладывает всю клиентскую базу агента (ОКБ) по рабочим дням месяца: каждый клиент один раз, соседние точки в один день.
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-[#191919] p-1 rounded-lg">
          {(['plan', 'templates'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${tab === t ? 'bg-white dark:bg-[#2a2a2a] text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>
              {t === 'plan' ? 'План на месяц' : 'Постоянные шаблоны'}
            </button>
          ))}
        </div>
      </div>

      <div className={`${card} p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end`}>
        <label className="text-xs space-y-1 col-span-2">
          <span className="text-slate-500">Агент</span>
          <select className={input} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            {agents.length === 0 && <option value="">Нет агентов с закреплёнными клиентами</option>}
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.clients} клиентов{a.sectors.length ? ` · ${a.sectors.map((s: any) => s.code).join(', ')}` : ''}</option>)}
          </select>
        </label>
        {tab === 'plan' && (
          <>
            <label className="text-xs space-y-1">
              <span className="text-slate-500">Месяц</span>
              <input type="month" className={input} value={month} onChange={(e) => { setMonth(e.target.value); setPlan(null); }} />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-slate-500">Норма визитов в день: от</span>
              <input type="number" min={0} className={input} value={settings.normMin} onChange={(e) => updateSettings({ ...settings, normMin: Number(e.target.value) })} />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-slate-500">до</span>
              <input type="number" min={1} className={input} value={settings.normMax} onChange={(e) => updateSettings({ ...settings, normMax: Number(e.target.value) })} />
            </label>
          </>
        )}
      </div>

      {error && <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 border border-rose-200">{error}</div>}
      {notice && <div className="p-3 text-xs rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{notice}</div>}

      {tab === 'templates' && agentId && <TemplatesTab agentId={agentId} />}

      {tab === 'plan' && agentId && (
        <>
          <div className={`${card} p-4 space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Рабочие дни и районы</h3>
              <span className="text-xs text-slate-500">Район берётся из города клиента, затем региона, затем канала. Отметьте, какие районы агент обходит в какой день.</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-slate-500 font-medium">Район</th>
                    {WEEKDAYS.map((w) => <th key={w} className="p-2 text-slate-500 font-medium w-12">{w}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z) => (
                    <tr key={z.zone} className="border-t border-[#f1f1ef] dark:border-[#2a2a2a]">
                      <td className="p-2 pr-6 whitespace-nowrap">
                        <span className="font-semibold">{z.zone}</span>
                        <span className="text-slate-400"> · {z.clients} кл.{z.withCoordinates ? `, ${z.withCoordinates} с коорд.` : ''}</span>
                      </td>
                      {WEEKDAYS.map((_, i) => (
                        <td key={i} className="p-2 text-center">
                          <input type="checkbox" checked={(settings.zonesByWeekday[i + 1] ?? []).includes(z.zone)} onChange={() => toggleZone(i + 1, z.zone)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={settings.useTemplates} onChange={(e) => updateSettings({ ...settings, useTemplates: e.target.checked })} />
                Учитывать постоянные шаблоны (их визиты уже в календаре)
              </label>
              <div className="flex-1" />
              <button className={secondary} disabled={busy} onClick={preview}><RefreshCw className="w-3.5 h-3.5" /> Рассчитать</button>
              <button className={primary} disabled={busy || !plan} onClick={apply}><Save className="w-3.5 h-3.5" /> Сохранить план</button>
            </div>
          </div>

          {plan && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                ['ОКБ агента', plan.summary.clients],
                ['Разложено по дням', plan.summary.placed],
                ['Уже в шаблонах', plan.summary.fixedClients],
                ['Не поместились', plan.summary.unplaced],
                ['Рабочих дней · в среднем', `${plan.summary.workDays} · ${plan.summary.averagePerDay}`],
              ].map(([label, value]) => (
                <div key={label as string} className={`${card} p-4`}>
                  <div className="text-[11px] text-slate-500">{label}</div>
                  <div className={`text-lg font-bold mt-1 ${label === 'Не поместились' && plan.summary.unplaced > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'}`}>{value}</div>
                </div>
              ))}
            </div>
          )}

          <div className={`${card} p-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold">Календарь {month}{agent ? ` · ${agent.name}` : ''}</h3>
              <span className="text-xs text-slate-500">Нажмите на число, чтобы поменять районы этой даты или сделать её выходной. Нажмите на день с планом, чтобы увидеть точки.</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((w) => <div key={w} className="text-[10px] uppercase text-slate-400 text-center">{w}</div>)}
              {grid.map((cell, i) => {
                if (!cell) return <div key={`e${i}`} />;
                const planned: any = dayByDate.get(cell.date);
                const dayZones = zonesFor(cell.date, cell.weekday);
                const overridden = settings.zonesByDate[cell.date] !== undefined;
                return (
                  <div
                    key={cell.date}
                    onClick={() => planned && setOpenDay(cell.date)}
                    className={`min-h-[86px] p-1.5 rounded-lg border text-[11px] ${planned ? `${STATUS_STYLE[planned.status]} cursor-pointer` : dayZones.length ? 'border-[#e9e9e7] dark:border-[#2f2f2f]' : 'border-dashed border-[#e9e9e7] dark:border-[#2f2f2f] text-slate-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <button className={`font-bold hover:underline ${overridden ? 'text-indigo-600' : ''}`} onClick={(e) => { e.stopPropagation(); setEditDate(cell.date); }}>{cell.day}</button>
                      {planned && <span className="font-bold">{planned.total}</span>}
                    </div>
                    <div className="truncate">{dayZones.join(', ') || 'выходной'}</div>
                    {planned && (
                      <>
                        <div className="h-1.5 mt-1 rounded bg-white/60 dark:bg-black/30 overflow-hidden">
                          <div className="h-full bg-current opacity-60" style={{ width: `${Math.min(100, (planned.total / maxLoad) * 100)}%` }} />
                        </div>
                        <div className="mt-1 opacity-80 truncate">
                          {planned.fixedCount > 0 && `шаблон ${planned.fixedCount} · `}{planned.groups.slice(0, 3).map((g: any) => `${g.label} ${g.count}`).join(', ')}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-emerald-50 border-emerald-200" /> в норме</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-amber-50 border-amber-200" /> меньше нормы</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-rose-50 border-rose-200" /> больше нормы</span>
              <span className="flex items-center gap-1"><span className="text-indigo-600 font-bold">12</span> районы даты изменены вручную</span>
            </div>
          </div>

          {plan && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className={card}>
                <div className="p-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f] text-sm font-bold">По районам</div>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-[#191919] text-slate-500 text-[10px] uppercase">
                    <tr><th className="text-left p-2.5">Район</th><th className="text-right p-2.5">Клиентов</th><th className="text-right p-2.5">Дней</th><th className="text-right p-2.5">В плане</th><th className="text-right p-2.5">Не вошли</th></tr>
                  </thead>
                  <tbody>
                    {plan.zones.map((z: any) => (
                      <tr key={z.zone} className="border-t border-[#f1f1ef] dark:border-[#2a2a2a]">
                        <td className="p-2.5 font-semibold">{z.zone}</td>
                        <td className="p-2.5 text-right">{z.clients}</td>
                        <td className="p-2.5 text-right">{z.days || <span className="text-rose-600">нет дня</span>}</td>
                        <td className="p-2.5 text-right">{z.placed}</td>
                        <td className={`p-2.5 text-right ${z.unplaced ? 'text-rose-600 font-bold' : ''}`}>{z.unplaced}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={card}>
                <div className="p-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f] text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Не помещаются · {plan.unplaced.length}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {plan.unplaced.map((u: any) => (
                        <tr key={u.id} className="border-t border-[#f1f1ef] dark:border-[#2a2a2a]">
                          <td className="p-2.5 font-mono text-slate-400">{u.code || ''}</td>
                          <td className="p-2.5">{u.name}</td>
                          <td className="p-2.5 text-slate-500">{u.zone}</td>
                          <td className="p-2.5 text-right text-slate-500">{u.reason === 'no_day' ? 'району не назначен день' : 'сверх нормы'}</td>
                        </tr>
                      ))}
                      {plan.unplaced.length === 0 && <tr><td className="p-6 text-center text-slate-400">Все клиенты разложены по дням</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {openDay && dayByDate.get(openDay) && (
        <DayModal day={dayByDate.get(openDay)} onClose={() => setOpenDay(null)} />
      )}
      {editDate && (
        <DateZonesModal
          date={editDate}
          zones={zoneNames}
          current={settings.zonesByDate[editDate]}
          weekdayZones={settings.zonesByWeekday[((new Date(`${editDate}T00:00:00Z`).getUTCDay() + 6) % 7) + 1] ?? []}
          onSave={(value) => { setDateZones(editDate, value); setEditDate(null); }}
          onClose={() => setEditDate(null)}
        />
      )}
    </div>
  );
}

function DayModal({ day, onClose }: { day: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${card} w-full max-w-2xl p-5 space-y-3 max-h-[85vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">{day.date} ({day.weekdayLabel}) · {day.zones.join(', ')} · {day.total} визитов</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        {day.fixedCount > 0 && <div className="text-xs text-slate-500">Ещё {day.fixedCount} визитов из постоянных шаблонов.</div>}
        <div className="overflow-y-auto">
          <table className="w-full text-xs">
            <tbody>
              {day.clients.map((c: any, i: number) => (
                <tr key={c.id} className="border-t border-[#f1f1ef] dark:border-[#2a2a2a]">
                  <td className="p-2 text-slate-400 w-8">{i + 1}</td>
                  <td className="p-2 font-mono text-slate-400">{c.code || ''}</td>
                  <td className="p-2">{c.name}</td>
                  <td className="p-2 text-slate-500">{c.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DateZonesModal({ date, zones, current, weekdayZones, onSave, onClose }: {
  date: string; zones: string[]; current?: string[]; weekdayZones: string[]; onSave: (value: string[] | null) => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(current ?? weekdayZones);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${card} w-full max-w-sm p-5 space-y-3`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">Районы на {date}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="text-xs text-slate-500">По дню недели: {weekdayZones.join(', ') || 'выходной'}</div>
        <div className="space-y-1.5">
          {zones.map((z) => (
            <label key={z} className="text-xs flex items-center gap-2">
              <input type="checkbox" checked={selected.includes(z)} onChange={() => setSelected(selected.includes(z) ? selected.filter((x) => x !== z) : [...selected, z])} />
              {z}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button className={secondary} onClick={() => onSave(null)}>Как в день недели</button>
          <button className={secondary} onClick={() => onSave([])}>Выходной</button>
          <button className={primary} onClick={() => onSave(selected)}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}

function TemplatesTab({ agentId }: { agentId: string }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState({ clientId: '', weekdays: [] as number[], periodWeeks: 1, startDate: new Date().toISOString().slice(0, 10) });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get('/route-plans/templates', { params: { agentId } }).then((res) => setTemplates(res.data || []));

  useEffect(() => {
    load().catch((err) => setError(errorText(err, 'Не удалось загрузить шаблоны')));
    api.get('/clients').then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setClients(list.filter((c: any) => c.agentId === agentId));
    }).catch(() => setClients([]));
  }, [agentId]);

  const save = async () => {
    setError('');
    try {
      await api.put('/route-plans/templates', { agentId, ...form });
      setForm({ ...form, clientId: '', weekdays: [] });
      await load();
    } catch (err) {
      setError(errorText(err, 'Не удалось сохранить шаблон'));
    }
  };

  const remove = async (id: string) => {
    await api.delete(`/route-plans/templates/${id}`);
    await load();
  };

  const active = templates.filter((t) => t.active);
  const byWeekday = WEEKDAYS.map((label, i) => ({ label, items: active.filter((t) => t.weekday === i + 1) }));
  const options = clients.filter((c) => !search || `${c.name} ${c.externalCode || ''}`.toLowerCase().includes(search.toLowerCase())).slice(0, 200);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className={`${card} p-4 space-y-3`}>
        <h3 className="text-sm font-bold">Постоянный визит</h3>
        <p className="text-xs text-slate-500">Клиент посещается в выбранные дни с заданной периодичностью. Маршрут дня создаётся из шаблонов, ручные правки дня сохраняются.</p>
        <input className={input} placeholder="Поиск клиента" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={input} size={6} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
          {options.map((c) => <option key={c.id} value={c.id}>{c.externalCode ? `${c.externalCode} · ` : ''}{c.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((w, i) => (
            <label key={w} className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={form.weekdays.includes(i + 1)} onChange={() => setForm({ ...form, weekdays: form.weekdays.includes(i + 1) ? form.weekdays.filter((x) => x !== i + 1) : [...form.weekdays, i + 1] })} />
              {w}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className={input} value={form.periodWeeks} onChange={(e) => setForm({ ...form, periodWeeks: Number(e.target.value) })}>
            {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input type="date" className={input} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
        {error && <div className="text-xs text-rose-600">{error}</div>}
        <button className={`${primary} w-full justify-center`} disabled={!form.clientId} onClick={save}><Plus className="w-3.5 h-3.5" /> Сохранить шаблон</button>
      </div>
      <div className={`${card} lg:col-span-2`}>
        <div className="p-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f] text-sm font-bold">Шаблоны агента · {active.length}</div>
        <div className="divide-y divide-[#f1f1ef] dark:divide-[#2a2a2a]">
          {byWeekday.filter((d) => d.items.length > 0).map((d) => (
            <div key={d.label} className="p-3">
              <div className="text-xs font-bold text-slate-500 mb-1">{d.label} · {d.items.length}</div>
              <table className="w-full text-xs">
                <tbody>
                  {d.items.map((t) => (
                    <tr key={t.id}>
                      <td className="py-1 pr-2 font-mono text-slate-400 w-24">{t.client.externalCode || ''}</td>
                      <td className="py-1 pr-2">{t.client.name}</td>
                      <td className="py-1 pr-2 text-slate-500">{t.zone}</td>
                      <td className="py-1 pr-2 text-slate-500">{t.periodLabel}</td>
                      <td className="py-1 pr-2 text-slate-400">с {String(t.startDate).slice(0, 10)}</td>
                      <td className="py-1 text-right"><button className="text-slate-400 hover:text-rose-600" onClick={() => remove(t.id)}><Trash className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {active.length === 0 && <div className="p-6 text-center text-xs text-slate-400">Постоянных шаблонов нет</div>}
        </div>
      </div>
    </div>
  );
}
