import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { AlertTriangle, CheckCircle2, FileArchive, Loader2, Upload, XCircle } from 'lucide-react';

interface Report {
  dataDate: string;
  archive: { inFile: number; added: number; reclassified: number; removed: number; byKind: Record<string, number> };
  clients: { inFile: number; created: number; withSector: number; withAgent: number; unknownBranch: string[] };
  priceTypes: { changed: number; unknownType: string[] };
  cards: { phones: number; addresses: number; coordinates: number };
  coordinatesFromVisits: number;
  debts: { changed: number; cleared: number; delta: number; skippedSmartSaleDocuments: number; notFound: number; notFoundSum: number; total: number };
  ageing?: { clients: number; rewritten: number; olderThanHistory: number };
  stock: Record<string, { changed: number; before: number; after: number; unknownCodes: number } | string>;
  notes: string[];
}

interface Run {
  id: string;
  status: 'checking' | 'ready' | 'applying' | 'applied' | 'failed' | 'superseded';
  fileName: string;
  dataDate: string | null;
  preview: Report | null;
  result: Report | null;
  error: string | null;
  createdAt: string;
  appliedAt: string | null;
  createdBy: string | null;
  appliedBy: string | null;
}

const n = (v: number) => Math.round(v).toLocaleString('ru-RU');
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const STATUS: Record<Run['status'], { text: string; cls: string }> = {
  checking: { text: 'Проверяется', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  ready: { text: 'Проверено, ждёт применения', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  applying: { text: 'Применяется', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  applied: { text: 'Применено', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { text: 'Ошибка', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  superseded: { text: 'Заменена новой выгрузкой', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};

function ReportView({ r, applied }: { r: Report; applied: boolean }) {
  const verb = applied ? '' : 'будет ';
  const rows: Array<[string, string]> = [
    ['Архив продаж', `${verb}добавлено ${n(r.archive.added)} документов` +
      (r.archive.reclassified ? `, ${n(r.archive.reclassified)} заказов станут перебросками` : '') +
      (r.archive.removed ? `, ${n(r.archive.removed)} удалено (их больше нет в Smartup)` : '')],
    ['Новые клиенты', `${n(r.clients.created)}: с зоной ${n(r.clients.withSector)}, с агентом ${n(r.clients.withAgent)}`],
    ['Долги', `${n(r.debts.changed)} клиентов, изменение ${r.debts.delta >= 0 ? '+' : ''}${n(r.debts.delta)} TJS` +
      (r.debts.cleared ? `, ${n(r.debts.cleared)} погасили полностью` : '') + `. Всего долг по Smartup ${n(r.debts.total)} TJS`],
    ...(r.ageing ? [['Возраст долга', `${verb}пересчитан по заказам у ${n(r.ageing.rewritten)} клиентов из ${n(r.ageing.clients)}` +
      (r.ageing.olderThanHistory ? `; у ${n(r.ageing.olderThanHistory)} часть долга старше истории Smartup` : '')] as [string, string]] : []),
    ['Остатки', Object.entries(r.stock).map(([b, s]) => (typeof s === 'string' ? `${b}: ${s}` : `${b}: ${n(s.changed)} поз. (${n(s.before)} → ${n(s.after)} шт.)`)).join('; ')],
    ['Типы цен', `${n(r.priceTypes.changed)} клиентов`],
    ['Контакты и координаты', `телефонов ${n(r.cards.phones)}, адресов ${n(r.cards.addresses)}, координат ${n(r.cards.coordinates + r.coordinatesFromVisits)} (из них по визитам ${n(r.coordinatesFromVisits)})`],
  ];
  const warnings = [
    ...(r.debts.skippedSmartSaleDocuments ? [`Долг не тронут у ${r.debts.skippedSmartSaleDocuments} клиентов: у них есть документы, оформленные в SmartSale`] : []),
    ...(r.debts.notFound ? [`${r.debts.notFound} должников на ${n(r.debts.notFoundSum)} TJS нет среди клиентов`] : []),
    ...(r.priceTypes.unknownType.length ? [`Нет таких типов цен в SmartSale: ${r.priceTypes.unknownType.join(', ')}`] : []),
    ...r.notes.filter((x) => !x.startsWith('Остатки ')),
  ];
  return (
    <div className="space-y-3">
      <table className="w-full text-xs">
        <tbody className="divide-y divide-[#e3e3e8]/60">
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="py-2 pr-4 font-semibold text-[#1d1d1f] w-48 align-top">{k}</td>
              <td className="py-2 text-[#37352f]">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {warnings.length > 0 && (
        <ul className="space-y-1">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Loading the company's data from a Smartup backup archive: check first, apply on confirmation */
export default function Integrations() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  // Share of the archive sent to the server; null when nothing is being sent
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState('');
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/integrations/smartup/runs');
      setRuns(res.data);
      setError('');
      return res.data as Run[];
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось загрузить журнал');
      return [];
    }
  }, []);

  // While a check or an apply runs, the page follows it
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const list = await load();
      if (!alive) return;
      const running = list.some((r) => r.status === 'checking' || r.status === 'applying');
      timer.current = window.setTimeout(tick, running ? 3000 : 30000);
    };
    tick();
    return () => {
      alive = false;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [load]);

  const upload = async () => {
    if (!file) {
      setError('Выберите zip-архив выгрузки Smartup');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      setSent(0);
      await api.post('/integrations/smartup/runs', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setSent(e.total ? Math.round((e.loaded / e.total) * 100) : null),
      });
      setFile(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось загрузить архив');
    } finally {
      setBusy(false);
      setSent(null);
    }
  };

  const apply = async (run: Run) => {
    if (!window.confirm(`Применить выгрузку на ${when(run.dataDate)}? Долги и остатки станут как в Smartup на эту дату.`)) return;
    setBusy(true);
    try {
      await api.post(`/integrations/smartup/runs/${run.id}/apply`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось применить');
    } finally {
      setBusy(false);
    }
  };

  const latest = runs[0];
  const running = runs.some((r) => r.status === 'checking' || r.status === 'applying');
  const stale = latest?.preview?.notes?.some((x) => x.includes('старше уже загруженной'));

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e3e3e8] p-5 rounded-2xl shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2">
            <FileArchive className="w-5 h-5 text-[#0b57d0]" /> Загрузка данных из Smartup
          </h2>
          <p className="text-xs text-[#86868b] mt-1">
            Загрузите zip-архив полной выгрузки Smartup. Сначала он проверяется: вы увидите, что изменится, и только после
            подтверждения долги, остатки, клиенты и архив продаж станут как в Smartup на дату выгрузки. Повторная загрузка ничего не задваивает.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="file"
            accept=".zip"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError('');
            }}
            className="text-xs"
          />
          <button
            onClick={upload}
            disabled={busy || running}
            className="px-4 py-2 bg-[#0b57d0] hover:bg-[#0a4bb3] disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          >
            {sent !== null ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {sent < 100 ? `Загрузка… ${sent}%` : 'Файл получен, проверка…'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Проверить архив
              </>
            )}
          </button>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>

      {latest && (latest.status === 'checking' || latest.status === 'applying') && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {latest.status === 'checking' ? 'Архив проверяется: обычно до минуты.' : 'Выгрузка применяется: обычно 1–3 минуты. Страницу можно закрыть.'}
        </div>
      )}

      {latest?.status === 'ready' && latest.preview && (
        <div className="bg-white border-2 border-amber-200 p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#1d1d1f]">Что изменится: выгрузка на {when(latest.dataDate)}</h3>
              <p className="text-[11px] text-[#86868b]">{latest.fileName} · загрузил {latest.createdBy ?? '—'}</p>
            </div>
            <button
              onClick={() => apply(latest)}
              disabled={busy || running || stale}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Применить
            </button>
          </div>
          <ReportView r={latest.preview} applied={false} />
        </div>
      )}

      <div className="bg-white border border-[#e3e3e8] rounded-2xl shadow-sm overflow-x-auto">
        <h3 className="text-sm font-bold text-[#1d1d1f] px-5 pt-4">Журнал загрузок</h3>
        {runs.length === 0 ? (
          <p className="p-5 text-xs text-[#86868b]">Выгрузки ещё не загружались.</p>
        ) : (
          <div className="divide-y divide-[#e3e3e8]/60 mt-2">
            {runs.map((r) => (
              <details key={r.id} className="px-5 py-3 text-xs">
                <summary className="cursor-pointer flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS[r.status].cls}`}>{STATUS[r.status].text}</span>
                  <span className="font-semibold text-[#1d1d1f]">данные на {when(r.dataDate)}</span>
                  <span className="text-[#86868b]">
                    загружено {when(r.createdAt)} ({r.createdBy ?? '—'})
                    {r.appliedAt && ` · применено ${when(r.appliedAt)} (${r.appliedBy ?? '—'})`}
                  </span>
                </summary>
                <div className="mt-3">
                  {r.status === 'failed' ? (
                    <p className="text-rose-600 flex items-start gap-1.5"><XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {r.error ?? 'Прервано'}</p>
                  ) : r.result ? (
                    <ReportView r={r.result} applied />
                  ) : r.preview ? (
                    <ReportView r={r.preview} applied={false} />
                  ) : (
                    <p className="text-[#86868b]">Идёт проверка…</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
