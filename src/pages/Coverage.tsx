import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Target } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import api from '../services/api';
import { useScope } from '../context/ScopeContext';

const card = 'bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl shadow-sm';
const input = 'w-full px-3 py-2 text-xs border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#191919] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
const button = 'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50';

const STATUS: Record<string, { label: string; style: string }> = {
  visited: { label: 'Посещён', style: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  visited_unplanned: { label: 'Посещён вне плана', style: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' },
  missed: { label: 'Пропущен', style: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  pending: { label: 'Визит впереди', style: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  not_planned: { label: 'Нет в плане', style: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
};

const TOTAL_COLUMNS: Array<[string, string]> = [
  ['okb', 'ОКБ'], ['planned', 'В плане'], ['visited', 'Посещено'], ['missed', 'Пропущено'], ['pending', 'Впереди'],
  ['notPlanned', 'Нет в плане'], ['coveragePct', 'Покрытие ОКБ, %'], ['planDonePct', 'Выполнение плана, %'],
];

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function Coverage() {
  const { selectedZone } = useScope();
  const [month, setMonth] = useState(currentMonth());
  const [agentId, setAgentId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [agents, setAgents] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [data, setData] = useState<any | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The header's zone filter is a sector
  useEffect(() => {
    setSectorId(selectedZone || '');
  }, [selectedZone]);

  useEffect(() => {
    api.get('/route-plans/agents').then((r) => setAgents(r.data || [])).catch(() => setAgents([]));
    api.get('/territory/sectors').then((r) => setSectors(r.data || [])).catch(() => setSectors([]));
  }, []);

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.get('/route-plans/coverage', { params: { month, agentId: agentId || undefined, sectorId: sectorId || undefined } });
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось построить отчёт');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, [month, agentId, sectorId]);

  const clients = useMemo(() => (data?.clients ?? []).filter((c: any) => !status || c.status === status), [data, status]);

  const exportExcel = () => {
    if (!data) return;
    const header = { font: { bold: true }, fill: { fgColor: { rgb: 'EEF2FF' } } };
    const totalsSheet = (title: string, rows: any[], nameOf: (r: any) => string) => {
      const aoa = [[title, ...TOTAL_COLUMNS.map(([, label]) => label)], ...rows.map((r) => [nameOf(r), ...TOTAL_COLUMNS.map(([key]) => r[key])])];
      const sheet = XLSX.utils.aoa_to_sheet(aoa);
      for (let c = 0; c <= TOTAL_COLUMNS.length; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
        if (cell) cell.s = header;
      }
      sheet['!cols'] = [{ wch: 32 }, ...TOTAL_COLUMNS.map(() => ({ wch: 14 }))];
      return sheet;
    };
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, totalsSheet('Агент', [...data.byAgent, { agentName: 'Итого', ...data.totals }], (r) => r.agentName), 'По агентам');
    XLSX.utils.book_append_sheet(book, totalsSheet('Сектор', data.bySector, (r) => (r.sectorCode ? `${r.sectorCode} · ${r.sectorName}` : r.sectorName)), 'По секторам');

    const clientRows = [
      ['Агент', 'Сектор', 'Район', 'Код', 'Клиент', 'Адрес', 'Статус', 'Дни плана', 'Дни визитов'],
      ...data.clients.map((c: any) => [c.agentName, c.sectorName || '', c.zone, c.code || '', c.name, c.address || '', STATUS[c.status]?.label || c.status, c.plannedDates.join(', '), c.visitDates.join(', ')]),
    ];
    const clientSheet = XLSX.utils.aoa_to_sheet(clientRows);
    clientSheet['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 40 }, { wch: 28 }, { wch: 18 }, { wch: 28 }, { wch: 28 }];
    for (let c = 0; c < 9; c++) clientSheet[XLSX.utils.encode_cell({ r: 0, c })].s = header;
    XLSX.utils.book_append_sheet(book, clientSheet, 'Клиенты');

    const missed = [['Агент', 'Код', 'Клиент', 'Район', 'Дни плана'], ...data.clients.filter((c: any) => c.status === 'missed').map((c: any) => [c.agentName, c.code || '', c.name, c.zone, c.plannedDates.join(', ')])];
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(missed), 'Пропущенные');
    XLSX.writeFile(book, `pokrytie_okb_${data.month}.xlsx`);
  };

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    (data?.clients ?? []).forEach((c: any) => { result[c.status] = (result[c.status] ?? 0) + 1; });
    return result;
  }, [data]);

  return (
    <div className="space-y-5">
      <div className={`${card} p-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3`}>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" /> Покрытие ОКБ за месяц
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ОКБ — закреплённые за агентом клиенты. План — маршруты месяца и визиты по шаблонам. Факт — визиты агента (чекин или отметка «посещён»).
            Пропущен — все дни плана прошли без визита{data?.asOf ? ` (на ${data.asOf})` : ''}.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-w-[min(100%,640px)]">
          <input type="month" className={input} value={month} onChange={(e) => setMonth(e.target.value)} />
          <select className={input} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">Все агенты</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className={input} value={sectorId} onChange={(e) => setSectorId(e.target.value)}>
            <option value="">Все секторы</option>
            {sectors.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button className={`${button} border border-[#e9e9e7] dark:border-[#3f3f3f] flex-1 justify-center`} onClick={load} disabled={busy}><RefreshCw className="w-3.5 h-3.5" /></button>
            <button className={`${button} bg-emerald-600 text-white hover:bg-emerald-700 flex-[3] justify-center`} onClick={exportExcel} disabled={!data}><Download className="w-3.5 h-3.5" /> Excel</button>
          </div>
        </div>
      </div>

      {error && <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 border border-rose-200">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              ['ОКБ', data.totals.okb, ''],
              ['В плане', data.totals.planned, ''],
              ['Посещено', data.totals.visited, 'text-emerald-600'],
              ['Пропущено', data.totals.missed, 'text-rose-600'],
              ['Визит впереди', data.totals.pending, 'text-sky-600'],
              ['Нет в плане', data.totals.notPlanned, 'text-amber-600'],
              ['Покрытие ОКБ', `${data.totals.coveragePct}%`, 'text-indigo-600'],
            ].map(([label, value, color]) => (
              <div key={label as string} className={`${card} p-4`}>
                <div className="text-[11px] text-slate-500">{label}</div>
                <div className={`text-lg font-bold mt-1 ${color || 'text-slate-900 dark:text-slate-100'}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <TotalsTable title="По агентам" rows={data.byAgent} nameOf={(r) => r.agentName} />
            <TotalsTable title="По секторам" rows={data.bySector} nameOf={(r) => (r.sectorCode ? `${r.sectorCode} · ${r.sectorName}` : r.sectorName)} />
          </div>

          <div className={card}>
            <div className="p-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f] flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold mr-2">Клиенты · {clients.length}</span>
              <button className={`px-2.5 py-1 text-[11px] rounded-full border ${!status ? 'bg-slate-800 text-white border-slate-800' : 'border-[#e9e9e7]'}`} onClick={() => setStatus('')}>Все {data.clients.length}</button>
              {Object.entries(STATUS).map(([key, s]) => (
                <button key={key} className={`px-2.5 py-1 text-[11px] rounded-full ${status === key ? 'ring-2 ring-indigo-400' : ''} ${s.style}`} onClick={() => setStatus(key)}>
                  {s.label} {counts[key] ?? 0}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-[#191919] text-slate-500 text-[10px] uppercase sticky top-0">
                  <tr>
                    <th className="text-left p-2.5">Код</th><th className="text-left p-2.5">Клиент</th><th className="text-left p-2.5">Район</th>
                    <th className="text-left p-2.5">Агент</th><th className="text-left p-2.5">Статус</th><th className="text-left p-2.5">План</th><th className="text-left p-2.5">Визиты</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.slice(0, 1000).map((c: any) => (
                    <tr key={`${c.agentId}-${c.clientId}`} className="border-t border-[#f1f1ef] dark:border-[#2a2a2a]">
                      <td className="p-2.5 font-mono text-slate-400">{c.code || ''}</td>
                      <td className="p-2.5">{c.name}</td>
                      <td className="p-2.5 text-slate-500">{c.zone}</td>
                      <td className="p-2.5 text-slate-500">{c.agentName}</td>
                      <td className="p-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS[c.status]?.style}`}>{STATUS[c.status]?.label}</span></td>
                      <td className="p-2.5 text-slate-500">{c.plannedDates.map((d: string) => d.slice(8)).join(', ')}</td>
                      <td className="p-2.5 text-slate-500">{c.visitDates.map((d: string) => d.slice(8)).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clients.length > 1000 && <div className="p-3 text-center text-xs text-slate-400">Показаны первые 1000, полный список в Excel</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TotalsTable({ title, rows, nameOf }: { title: string; rows: any[]; nameOf: (row: any) => string }) {
  return (
    <div className={card}>
      <div className="p-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f] text-sm font-bold">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-[#191919] text-slate-500 text-[10px] uppercase">
            <tr><th className="text-left p-2.5"></th>{TOTAL_COLUMNS.map(([key, label]) => <th key={key} className="text-right p-2.5">{label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#f1f1ef] dark:border-[#2a2a2a]">
                <td className="p-2.5 font-semibold whitespace-nowrap">{nameOf(r)}</td>
                {TOTAL_COLUMNS.map(([key]) => <td key={key} className={`p-2.5 text-right ${key === 'missed' && r[key] ? 'text-rose-600 font-bold' : ''}`}>{r[key]}</td>)}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-slate-400">Нет данных</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
