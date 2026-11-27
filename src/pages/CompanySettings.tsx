import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, History, Loader2, Lock, RotateCcw, Settings2, ShieldCheck } from 'lucide-react';
import api from '../services/api';

type Value = boolean | number | string;
type Group = 'field' | 'finance';

interface Loaded {
  values: Record<string, Value>;
  defaults: Record<string, Value>;
  groups: Record<string, Group>;
  canUpdate: Record<Group, boolean>;
}

interface Def {
  key: string;
  title: string;
  hint: string;
  control: { kind: 'toggle' } | { kind: 'number'; min: number; max: number; step: number; unit: string } | { kind: 'choice'; options: Array<[string, string]> };
  /** Shown before saving a value that weakens control */
  risk?: (v: Value) => string | null;
}

const SECTIONS: Array<{ title: string; text: string; items: Def[] }> = [
  {
    title: 'Визиты и смена',
    text: 'Как агенты отмечаются у точек и когда им можно работать.',
    items: [
      {
        key: 'visit.radiusMeters',
        title: 'Радиус отметки у точки',
        hint: 'Агент может начать визит, только если стоит не дальше этого расстояния от магазина. Действует для точек с координатами.',
        control: { kind: 'number', min: 30, max: 1000, step: 10, unit: 'м' },
        risk: (v) => (Number(v) > 300 ? 'При радиусе больше 300 м отметка почти не проверяет, был ли агент в магазине.' : null),
      },
      {
        key: 'visit.allowRemoteWithReason',
        title: 'Отметка издалека с указанием причины',
        hint: 'Если агент дальше радиуса, он может отметиться, написав причину (неточный GPS, точка переехала). Причина видна супервайзеру.',
        control: { kind: 'toggle' },
        risk: (v) => (v ? 'Агент сможет отметиться у точки с любого расстояния, написав причину.' : null),
      },
      {
        key: 'visit.requireShift',
        title: 'Работа только на открытой смене',
        hint: 'Визиты, заказы и приём оплат агентам и экспедиторам доступны только после «Начать смену». Смена включает GPS-трек.',
        control: { kind: 'toggle' },
        risk: (v) => (v ? null : 'Сотрудники смогут работать без смены: GPS-трек и рабочее время станут неполными.'),
      },
      {
        key: 'visit.autoPinCoordinates',
        title: 'Координаты точки по отметкам агентов',
        hint: 'Если у магазина нет координат, они ставятся сами, когда отметки агентов совпадут: нужное число визитов в разные дни, две трети отметок рядом. Записывается в журнал аудита; уже заполненные координаты не меняются.',
        control: { kind: 'toggle' },
      },
      {
        key: 'visit.autoPinMinVisits',
        title: 'Сколько совпавших визитов нужно',
        hint: 'Визиты должны быть минимум в два разных дня: две отметки за одно посещение ничего не доказывают.',
        control: { kind: 'number', min: 2, max: 5, step: 1, unit: 'визита' },
      },
      {
        key: 'visit.autoPinRadiusMeters',
        title: 'Насколько близко должны быть отметки',
        hint: 'Отметки считаются совпавшими, если лежат в этом радиусе от их середины.',
        control: { kind: 'number', min: 30, max: 300, step: 10, unit: 'м' },
        risk: (v) => (Number(v) > 150 ? 'При радиусе больше 150 м точка может встать у соседнего магазина или на улице.' : null),
      },
    ],
  },
  {
    title: 'Клиенты',
    text: 'Кто может заводить новые торговые точки в поле.',
    items: [
      { key: 'clients.salesRepCanCreate', title: 'Агенты добавляют новых клиентов', hint: 'Агент сможет завести новую точку с телефона. Иначе — только офис.', control: { kind: 'toggle' } },
      { key: 'clients.driverCanCreate', title: 'Экспедиторы добавляют новых клиентов', hint: 'Экспедитор сможет завести новую точку при доставке.', control: { kind: 'toggle' } },
    ],
  },
  {
    title: 'Оплаты и кредит',
    text: 'Кто принимает деньги и что делать, когда клиент превышает лимит.',
    items: [
      { key: 'payments.salesRepCanCollect', title: 'Агенты принимают оплату', hint: 'Агент сможет принять деньги у клиента; долг уменьшится на эту сумму.', control: { kind: 'toggle' } },
      { key: 'payments.driverCanCollect', title: 'Экспедиторы принимают оплату', hint: 'Экспедитор принимает оплату при доставке; без этого доставка не закрывает долг.', control: { kind: 'toggle' } },
      {
        key: 'integrations.smartupImport',
        title: 'Загрузка данных из Smartup',
        hint: 'Для компании, которая переходит со Smartup: в меню появится «Загрузка из Smartup» — долги, остатки, клиенты и история продаж по выгрузке.',
        control: { kind: 'toggle' },
      },
      {
        key: 'returns.requireItems',
        title: 'Возврат только товарами',
        hint: 'Агент выбирает возвращаемые товары, а сумму считает сервер по цене, по которой клиент их покупал. Брак уходит на склад брака. Включайте, когда у всех агентов обновлено приложение.',
        control: { kind: 'toggle' },
        risk: (v) => (v ? null : 'Агенты смогут оформлять возврат любой суммой без товаров.'),
      },
      {
        key: 'payments.debtReducesOn',
        title: 'Когда оплата уменьшает долг',
        hint: 'Сразу при приёме денег агентом или экспедитором, или только после того, как кассир провёл деньги в кассе (как в Smartup). Отклонённая кассиром оплата долг не меняет.',
        control: { kind: 'choice', options: [['collect', 'Сразу при приёме'], ['cashier', 'После проведения кассиром']] },
        risk: (v) => (v === 'collect' ? 'Долг будет уменьшаться сразу, ещё до того как деньги дошли до кассы.' : null),
      },
      {
        key: 'credit.overLimit',
        title: 'Заказ сверх кредитного лимита',
        hint: 'Что происходит, если долг клиента вместе с новым заказом больше его лимита. Лимит 0 — без ограничения.',
        control: {
          kind: 'choice',
          options: [
            ['hold', 'На проверку супервайзеру'],
            ['block', 'Запретить до оплаты'],
            ['allow', 'Пропускать'],
          ],
        },
        risk: (v) => (v === 'allow' ? 'Заказы сверх кредитного лимита будут проходить без всякой проверки.' : null),
      },
    ],
  },
];

const ALL: Record<string, Def> = Object.fromEntries(SECTIONS.flatMap((s) => s.items).map((d) => [d.key, d]));
const WHO: Record<Group, string> = { field: 'владелец, директор, менеджер продаж', finance: 'владелец, директор, финансист' };

const show = (def: Def | undefined, v: Value): string => {
  if (!def) return String(v);
  if (def.control.kind === 'toggle') return v ? 'Да' : 'Нет';
  if (def.control.kind === 'number') return `${v} ${def.control.unit}`;
  return def.control.options.find(([k]) => k === v)?.[1] ?? String(v);
};

const card = 'rounded-2xl bg-white dark:bg-[#111] border border-[#e3e3e8] dark:border-[#1a1a1a] shadow-sm';

export default function CompanySettings() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<Record<string, Value>>({});
  const [history, setHistory] = useState<Array<{ at: string; by: string; key: string; from: Value; to: Value }>>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [s, h] = await Promise.all([api.get('/settings'), api.get('/settings/history?limit=20')]);
      setLoaded(s.data);
      setDraft(s.data.values);
      setHistory(h.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Не удалось загрузить настройки.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changed = useMemo(
    () => (loaded ? Object.keys(draft).filter((k) => draft[k] !== loaded.values[k]) : []),
    [draft, loaded],
  );

  // Leaving with unsaved changes asks first
  useEffect(() => {
    if (changed.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed.length]);

  const save = async (confirmed = false) => {
    if (!loaded) return;
    const risks = changed.map((k) => ALL[k]?.risk?.(draft[k])).filter((r): r is string => !!r);
    if (risks.length > 0 && !confirmed) {
      setConfirming(risks);
      return;
    }
    setConfirming(null);
    setSaving(true);
    setError('');
    try {
      await api.patch('/settings', {
        changes: Object.fromEntries(changed.map((k) => [k, draft[k]])),
        expected: Object.fromEntries(changed.map((k) => [k, loaded.values[k]])),
      });
      setNotice(`Сохранено: ${changed.length}. Правила уже действуют для всех сотрудников.`);
      await load();
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' ') : msg || 'Не удалось сохранить.');
      if (e.response?.status === 409) await load();
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-[#86868b]">
        {error || (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Загрузка настроек…
          </>
        )}
      </div>
    );
  }

  const setValue = (key: string, v: Value) => {
    setNotice('');
    setDraft((d) => ({ ...d, [key]: v }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-28">
      <div className={`${card} p-5 flex items-start gap-4`}>
        <div className="w-11 h-11 rounded-xl bg-[#e8f0fe] text-[#0b57d0] flex items-center justify-center shrink-0">
          <Settings2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#1d1d1f] dark:text-white">Настройки компании</h1>
          <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-1 leading-relaxed">
            Правила работы, которые компания задаёт сама. Изменения действуют сразу для всех сотрудников и записываются в журнал ниже.
          </p>
        </div>
      </div>

      {notice && <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs px-4 py-3">{notice}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3">{error}</div>}

      {SECTIONS.map((section) => (
        <section key={section.title} className={card}>
          <div className="px-5 pt-5 pb-3 border-b border-[#f0f0f2] dark:border-[#1a1a1a]">
            <h2 className="text-sm font-bold text-[#1d1d1f] dark:text-white">{section.title}</h2>
            <p className="text-xs text-[#86868b] mt-0.5">{section.text}</p>
          </div>
          <div className="divide-y divide-[#f0f0f2] dark:divide-[#1a1a1a]">
            {section.items.map((def) => {
              const group = loaded.groups[def.key];
              const editable = loaded.canUpdate[group];
              const value = draft[def.key];
              const isChanged = value !== loaded.values[def.key];
              const isDefault = loaded.values[def.key] === loaded.defaults[def.key];
              return (
                <div key={def.key} data-setting={def.key} className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 ${isChanged ? 'bg-[#fffbeb] dark:bg-amber-950/20' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#1d1d1f] dark:text-white">{def.title}</span>
                      {!isDefault && !isChanged && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#e8f0fe] text-[#0b57d0]">изменено компанией</span>
                      )}
                      {isChanged && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">не сохранено</span>}
                    </div>
                    <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-1 leading-relaxed">{def.hint}</p>
                    {!editable && (
                      <p className="text-[11px] text-[#86868b] mt-1 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Меняет: {WHO[group]}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Control def={def} value={value} disabled={!editable || saving} onChange={(v) => setValue(def.key, v)} />
                    {!isDefault && editable && (
                      <button
                        type="button"
                        onClick={() => setValue(def.key, loaded.defaults[def.key])}
                        className="mt-1.5 text-[11px] text-[#86868b] hover:text-[#0b57d0] flex items-center gap-1 sm:ml-auto"
                      >
                        <RotateCcw className="w-3 h-3" /> Как по умолчанию ({show(def, loaded.defaults[def.key])})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className={card}>
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-[#86868b]" />
          <h2 className="text-sm font-bold text-[#1d1d1f] dark:text-white">История изменений</h2>
        </div>
        {history.length === 0 ? (
          <p className="px-5 pb-5 text-xs text-[#86868b]">Настройки ещё не менялись: действуют значения по умолчанию.</p>
        ) : (
          <ul className="px-5 pb-5 space-y-2">
            {history.map((h, i) => (
              <li key={i} className="text-xs text-[#37352f] dark:text-[#d1d1d6] flex flex-wrap gap-x-2">
                <span className="text-[#86868b] tabular-nums">{new Date(h.at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</span>
                <span className="font-semibold">{h.by}</span>
                <span>
                  {ALL[h.key]?.title ?? h.key}: {show(ALL[h.key], h.from)} → <b>{show(ALL[h.key], h.to)}</b>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {changed.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1200] w-[calc(100%-2rem)] max-w-2xl rounded-2xl bg-[#1d1d1f] text-white shadow-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 text-xs">
            <b>Изменено: {changed.length}.</b>{' '}
            {changed.map((k) => `${ALL[k]?.title}: ${show(ALL[k], loaded.values[k])} → ${show(ALL[k], draft[k])}`).join('; ')}
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" disabled={saving} onClick={() => setDraft(loaded.values)} className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20">
              Отменить
            </button>
            <button type="button" disabled={saving} onClick={() => save()} className="px-4 py-2 rounded-lg text-xs font-bold bg-[#0b57d0] hover:bg-[#094cb3] flex items-center gap-1.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Сохранить
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-[2200] bg-black/40 flex items-center justify-center p-4" onMouseDown={() => setConfirming(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="risk-title" className={`${card} w-full max-w-md p-5`} onMouseDown={(e) => e.stopPropagation()}>
            <h3 id="risk-title" className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Это ослабит контроль
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-[#37352f] dark:text-[#d1d1d6] list-disc pl-5">
              {confirming.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-[#86868b] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Изменение запишется в журнал с вашим именем.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(null)} className="px-3 py-2 rounded-lg text-xs font-semibold border border-[#d2d2d7] dark:border-[#333]">
                Отмена
              </button>
              <button type="button" onClick={() => save(true)} className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white">
                Всё равно сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Control({ def, value, disabled, onChange }: { def: Def; value: Value; disabled: boolean; onChange: (v: Value) => void }) {
  const c = def.control;
  if (c.kind === 'toggle') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={!!value}
        aria-label={def.title}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${value ? 'bg-[#0b57d0]' : 'bg-[#d2d2d7] dark:bg-[#333]'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    );
  }
  if (c.kind === 'number') {
    const n = Number(value);
    return (
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={c.min}
          max={c.max}
          step={c.step}
          value={n}
          disabled={disabled}
          aria-label={def.title}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-32 accent-[#0b57d0]"
        />
        <input
          type="number"
          min={c.min}
          max={c.max}
          step={c.step}
          value={n}
          disabled={disabled}
          onChange={(e) => {
            const v = Math.round(Number(e.target.value));
            if (Number.isFinite(v)) onChange(Math.min(c.max, Math.max(c.min, v)));
          }}
          className="w-20 bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg px-2 py-1.5 text-sm text-right text-[#37352f] dark:text-white disabled:opacity-50"
        />
        <span className="text-xs text-[#86868b]">{c.unit}</span>
      </div>
    );
  }
  return (
    <div role="radiogroup" aria-label={def.title} className="inline-flex flex-col sm:flex-row rounded-lg border border-[#e3e3e8] dark:border-[#333] overflow-hidden">
      {c.options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          disabled={disabled}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
            value === key ? 'bg-[#0b57d0] text-white' : 'bg-white dark:bg-transparent text-[#37352f] dark:text-[#d1d1d6] hover:bg-[#f5f5f7] dark:hover:bg-white/5'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
