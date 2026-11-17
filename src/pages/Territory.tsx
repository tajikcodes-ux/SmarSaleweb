import { useEffect, useMemo, useState } from 'react';
import { Download, Edit, FileUp, Layers, Plus, Tag, Trash, Upload, Users, X } from 'lucide-react';
import api from '../services/api';
import { useScope } from '../context/ScopeContext';
import { downloadTemplate, parseImportFile, type ParsedFile } from '../utils/territoryImport';

type Tab = 'sectors' | 'channels' | 'brands' | 'import';

const card = 'bg-white dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl shadow-sm';
const input = 'w-full px-3 py-2 text-xs border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg bg-white dark:bg-[#191919] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
const button = 'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50';
const primary = `${button} bg-indigo-600 text-white hover:bg-indigo-700`;
const secondary = `${button} border border-[#e9e9e7] dark:border-[#3f3f3f] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2a2a2a]`;

const errorText = (err: any, fallback: string) => {
  const message = err?.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || fallback;
};

export default function Territory() {
  const { refreshScopeData } = useScope();
  const [tab, setTab] = useState<Tab>('sectors');
  const [sectors, setSectors] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    const [s, c, b] = await Promise.all([
      api.get('/territory/sectors'),
      api.get('/territory/channels'),
      api.get('/territory/brands'),
    ]);
    setSectors(s.data || []);
    setChannels(c.data || []);
    setBrands(b.data || []);
  };

  useEffect(() => {
    load().catch((err) => setError(errorText(err, 'Не удалось загрузить секторы')));
    api.get('/branches').then((r) => setBranches(r.data || [])).catch(() => setBranches([]));
    api.get('/users').then((r) => setUsers(Array.isArray(r.data) ? r.data : r.data?.data || [])).catch(() => setUsers([]));
  }, []);

  const reload = async () => {
    await load();
    refreshScopeData();
  };

  const tabs: Array<{ key: Tab; label: string; count?: number }> = [
    { key: 'sectors', label: 'Секторы', count: sectors.length },
    { key: 'channels', label: 'Каналы', count: channels.length },
    { key: 'brands', label: 'Бренды', count: brands.length },
    { key: 'import', label: 'Импорт из Excel / Smartup' },
  ];

  return (
    <div className="space-y-5">
      <div className={`${card} p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3`}>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" /> Секторы, каналы и бренды
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Рабочие зоны дистрибьютора с агентами и клиентами. По ним работают фильтры «Зона» и «Бренд» в шапке.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-[#191919] p-1 rounded-lg">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md ${tab === t.key ? 'bg-white dark:bg-[#2a2a2a] text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              {t.label}{t.count !== undefined ? ` · ${t.count}` : ''}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 border border-rose-200">{error}</div>}

      {tab === 'sectors' && <SectorsTab sectors={sectors} branches={branches} users={users} brands={brands} onChange={reload} />}
      {tab === 'channels' && <ChannelsTab channels={channels} onChange={reload} />}
      {tab === 'brands' && <BrandsTab brands={brands} onChange={reload} />}
      {tab === 'import' && <ImportTab sectors={sectors} branches={branches} users={users} onDone={reload} />}
    </div>
  );
}

function SectorsTab({ sectors, branches, users, brands, onChange }: { sectors: any[]; branches: any[]; users: any[]; brands: any[]; onChange: () => Promise<void> }) {
  const [editing, setEditing] = useState<any | null>(null);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    try {
      const body = { code: editing.code, name: editing.name, branchId: editing.branchId || null, agentIds: editing.agentIds, brandIds: editing.brandIds, status: editing.status };
      if (editing.id) await api.put(`/territory/sectors/${editing.id}`, body);
      else await api.post('/territory/sectors', body);
      setEditing(null);
      await onChange();
    } catch (err) {
      setError(errorText(err, 'Не удалось сохранить сектор'));
    }
  };

  const remove = async (sector: any) => {
    if (!window.confirm(`Удалить сектор ${sector.code}?`)) return;
    try {
      await api.delete(`/territory/sectors/${sector.id}`);
      await onChange();
    } catch (err) {
      window.alert(errorText(err, 'Не удалось удалить сектор'));
    }
  };

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <div className={card}>
      <div className="flex items-center justify-between p-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
        <span className="text-xs text-slate-500">Сектор = рабочая зона (room в Smartup). У агента может быть несколько секторов.</span>
        <button className={primary} onClick={() => setEditing({ code: '', name: '', branchId: '', agentIds: [], brandIds: [], status: 'active' })}>
          <Plus className="w-3.5 h-3.5" /> Сектор
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-[#191919] text-slate-500 uppercase text-[10px] tracking-wide">
            <tr>
              <th className="text-left p-3">Код</th>
              <th className="text-left p-3">Название</th>
              <th className="text-left p-3">Филиал</th>
              <th className="text-left p-3">Агенты</th>
              <th className="text-left p-3">Бренды</th>
              <th className="text-right p-3">Клиентов</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {sectors.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-slate-400">Секторов пока нет. Создайте вручную или загрузите выгрузку Smartup во вкладке «Импорт».</td></tr>
            )}
            {sectors.map((s) => (
              <tr key={s.id} className="border-t border-[#f1f1ef] dark:border-[#2a2a2a]">
                <td className="p-3 font-mono font-semibold text-slate-800 dark:text-slate-100">{s.code}</td>
                <td className="p-3 text-slate-700 dark:text-slate-200">
                  {s.name}
                  {s.status !== 'active' && <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">неактивен</span>}
                </td>
                <td className="p-3 text-slate-500">{s.branchName || '—'}</td>
                <td className="p-3 text-slate-600 dark:text-slate-300">{s.agents.map((a: any) => a.name).join(', ') || '—'}</td>
                <td className="p-3 text-slate-600 dark:text-slate-300">{s.brands.map((b: any) => b.name).join(', ') || '—'}</td>
                <td className="p-3 text-right font-semibold">{s.clients}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button className="p-1.5 text-slate-400 hover:text-indigo-600" title="Изменить" onClick={() => setEditing({ ...s, branchId: s.branchId || '', agentIds: s.agents.map((a: any) => a.id), brandIds: s.brands.map((b: any) => b.id) })}>
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-rose-600" title="Удалить" onClick={() => remove(s)}>
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className={`${card} w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{editing.id ? `Сектор ${editing.code}` : 'Новый сектор'}</h3>
              <button onClick={() => setEditing(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs space-y-1">
                <span className="text-slate-500">Код</span>
                <input className={input} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="100_4" />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-slate-500">Филиал</span>
                <select className={input} value={editing.branchId} onChange={(e) => setEditing({ ...editing, branchId: e.target.value })}>
                  <option value="">—</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            </div>
            <label className="text-xs space-y-1 block">
              <span className="text-slate-500">Название</span>
              <input className={input} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Регион Актив Шахзод" />
            </label>
            {editing.id && (
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={editing.status === 'active'} onChange={(e) => setEditing({ ...editing, status: e.target.checked ? 'active' : 'inactive' })} />
                Активен
              </label>
            )}
            <div className="text-xs space-y-1">
              <span className="text-slate-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Агенты сектора</span>
              <div className="max-h-40 overflow-y-auto border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg p-2 grid grid-cols-2 gap-1">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={editing.agentIds.includes(u.id)} onChange={() => setEditing({ ...editing, agentIds: toggle(editing.agentIds, u.id) })} />
                    <span className="truncate">{`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username}</span>
                  </label>
                ))}
              </div>
            </div>
            {brands.length > 0 && (
              <div className="text-xs space-y-1">
                <span className="text-slate-500 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Бренды сектора</span>
                <div className="flex flex-wrap gap-2">
                  {brands.map((b) => (
                    <label key={b.id} className="flex items-center gap-1.5">
                      <input type="checkbox" checked={editing.brandIds.includes(b.id)} onChange={() => setEditing({ ...editing, brandIds: toggle(editing.brandIds, b.id) })} />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {error && <div className="text-xs text-rose-600">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button className={secondary} onClick={() => setEditing(null)}>Отмена</button>
              <button className={primary} onClick={save}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelsTab({ channels, onChange }: { channels: any[]; onChange: () => Promise<void> }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const add = async () => {
    if (!code.trim()) return;
    try {
      await api.post('/territory/channels', { code, name });
      setCode('');
      setName('');
      await onChange();
    } catch (err) {
      window.alert(errorText(err, 'Не удалось добавить канал'));
    }
  };
  return (
    <div className={card}>
      <div className="flex flex-wrap items-end gap-2 p-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
        <input className={`${input} max-w-[160px]`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код, например HRC-1" />
        <input className={`${input} max-w-[240px]`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" />
        <button className={primary} onClick={add}><Plus className="w-3.5 h-3.5" /> Канал</button>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-slate-50 dark:bg-[#191919] text-slate-500 uppercase text-[10px] tracking-wide">
          <tr><th className="text-left p-3">Код</th><th className="text-left p-3">Название</th><th className="text-right p-3">Клиентов</th></tr>
        </thead>
        <tbody>
          {channels.map((c) => (
            <tr key={c.id} className="border-t border-[#f1f1ef] dark:border-[#2a2a2a]">
              <td className="p-3 font-mono font-semibold">{c.code}</td>
              <td className="p-3">{c.name}</td>
              <td className="p-3 text-right font-semibold">{c.clients}</td>
            </tr>
          ))}
          {channels.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-slate-400">Каналов нет</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function BrandsTab({ brands, onChange }: { brands: any[]; onChange: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const add = async () => {
    if (!name.trim()) return;
    try {
      await api.post('/territory/brands', { name });
      setName('');
      await onChange();
    } catch (err) {
      window.alert(errorText(err, 'Не удалось добавить бренд'));
    }
  };

  const openProducts = async (brand: any) => {
    const res = await api.get('/catalog/products');
    const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
    setProducts(list);
    setEditing({ ...brand, productIds: list.filter((p: any) => p.brandId === brand.id).map((p: any) => p.id) });
  };

  const saveProducts = async () => {
    try {
      await api.put(`/territory/brands/${editing.id}`, { productIds: editing.productIds });
      setEditing(null);
      await onChange();
    } catch (err) {
      window.alert(errorText(err, 'Не удалось сохранить товары бренда'));
    }
  };

  const remove = async (brand: any) => {
    if (!window.confirm(`Удалить бренд ${brand.name}? Товары останутся без бренда.`)) return;
    await api.delete(`/territory/brands/${brand.id}`);
    await onChange();
  };

  const visible = products.filter((p) => !search || `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={card}>
      <div className="flex flex-wrap items-end gap-2 p-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
        <input className={`${input} max-w-[260px]`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Название бренда" />
        <button className={primary} onClick={add}><Plus className="w-3.5 h-3.5" /> Бренд</button>
        <span className="text-xs text-slate-500">Бренд в шапке фильтрует заказы по товарам бренда и клиентов по секторам, которые его продают.</span>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-slate-50 dark:bg-[#191919] text-slate-500 uppercase text-[10px] tracking-wide">
          <tr><th className="text-left p-3">Бренд</th><th className="text-right p-3">Товаров</th><th className="text-right p-3">Секторов</th><th className="p-3"></th></tr>
        </thead>
        <tbody>
          {brands.map((b) => (
            <tr key={b.id} className="border-t border-[#f1f1ef] dark:border-[#2a2a2a]">
              <td className="p-3 font-semibold">{b.name}</td>
              <td className="p-3 text-right">{b.products}</td>
              <td className="p-3 text-right">{b.sectors}</td>
              <td className="p-3 text-right whitespace-nowrap">
                <button className={secondary} onClick={() => openProducts(b)}>Товары</button>
                <button className="p-1.5 ml-1 text-slate-400 hover:text-rose-600" onClick={() => remove(b)}><Trash className="w-3.5 h-3.5" /></button>
              </td>
            </tr>
          ))}
          {brands.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">Брендов нет</td></tr>}
        </tbody>
      </table>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className={`${card} w-full max-w-xl p-5 space-y-3`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Товары бренда «{editing.name}» · {editing.productIds.length}</h3>
              <button onClick={() => setEditing(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <input className={input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск товара" />
            <div className="max-h-80 overflow-y-auto border border-[#e9e9e7] dark:border-[#3f3f3f] rounded-lg divide-y divide-[#f1f1ef] dark:divide-[#2a2a2a]">
              {visible.map((p) => (
                <label key={p.id} className="flex items-center gap-2 p-2 text-xs">
                  <input
                    type="checkbox"
                    checked={editing.productIds.includes(p.id)}
                    onChange={() => setEditing({ ...editing, productIds: editing.productIds.includes(p.id) ? editing.productIds.filter((x: string) => x !== p.id) : [...editing.productIds, p.id] })}
                  />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="font-mono text-slate-400">{p.sku}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button className={secondary} onClick={() => setEditing(null)}>Отмена</button>
              <button className={primary} onClick={saveProducts}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportTab({ sectors, branches, users, onDone }: { sectors: any[]; branches: any[]; users: any[]; onDone: () => Promise<void> }) {
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [branchId, setBranchId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [createTemplates, setCreateTemplates] = useState(true);

  const onFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      setParsed(await parseImportFile(file));
    } catch (err: any) {
      setParsed(null);
      setError(err.message || 'Не удалось прочитать файл');
    }
  };

  const stats = useMemo(() => {
    if (!parsed || parsed.kind !== 'clients') return null;
    const count = (key: string) => new Set(parsed.rows.map((r: any) => r[key]).filter(Boolean)).size;
    return {
      sectors: count('room_code'),
      agents: count('robot_code'),
      channels: count('channel'),
      withDays: parsed.rows.filter((r) => r.visit_days).length,
      withCoordinates: parsed.rows.filter((r) => r.latitude && r.longitude).length,
    };
  }, [parsed]);

  const needsSector = parsed?.kind === 'clients' && !stats?.sectors;
  const needsAgent = parsed?.kind === 'plan' || (parsed?.kind === 'clients' && !stats?.agents);

  const run = async () => {
    if (!parsed) return;
    setBusy(true);
    setError('');
    try {
      if (parsed.kind === 'plan') {
        if (!agentId) throw new Error('Выберите агента, чей это план.');
        const res = await api.post('/route-plans/import', { agentId, rows: parsed.rows });
        setResult({ kind: 'plan', ...res.data });
      } else {
        const sector = sectors.find((s) => s.code === roomCode);
        const rows = parsed.rows.map((r) => ({
          ...r,
          ...(roomCode && !r.room_code ? { room_code: roomCode, room_name: sector?.name } : {}),
        }));
        const res = await api.post('/territory/import', {
          rows,
          options: { branchId: branchId || undefined, agentId: agentId || undefined, startDate, createTemplates },
        });
        setResult({ kind: 'clients', ...res.data });
      }
      await onDone();
    } catch (err: any) {
      setError(err.message && !err.response ? err.message : errorText(err, 'Импорт не выполнен'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className={`${card} p-5 space-y-4 lg:col-span-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Файл</h3>
            <p className="text-xs text-slate-500 mt-1">
              Excel по шаблону импорта Smartup (room_code, robot_code, person_code, person_name, address, address_guide, region_name, town_name),
              выгрузка планов визитов Smartup (.json) или месячный черновик маршрута (лист «Маршрут»: Дата, Код клиента).
            </p>
          </div>
          <button className={secondary} onClick={downloadTemplate}><Download className="w-3.5 h-3.5" /> Шаблон</button>
        </div>
        <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#e0e0dd] dark:border-[#3f3f3f] rounded-xl cursor-pointer hover:border-indigo-400">
          <FileUp className="w-6 h-6 text-indigo-500" />
          <span className="text-xs text-slate-600 dark:text-slate-300">{fileName || 'Выберите .xlsx, .xls, .csv или .json'}</span>
          <input type="file" accept=".xlsx,.xls,.csv,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>

        {parsed && (
          <div className="text-xs space-y-2">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#191919]">
              {parsed.kind === 'plan' ? (
                <>План маршрута: <b>{parsed.rows.length}</b> строк, дней: <b>{new Set(parsed.rows.map((r) => String(r.date))).size}</b>.</>
              ) : (
                <>
                  Клиентов: <b>{parsed.rows.length}</b> · секторов в файле: <b>{stats?.sectors}</b> · агентов: <b>{stats?.agents}</b> ·
                  каналов: <b>{stats?.channels}</b> · с днями визита: <b>{stats?.withDays}</b> · с координатами: <b>{stats?.withCoordinates}</b>
                  <div className="text-slate-400 mt-1">Колонки: {parsed.columns.join(', ')}</div>
                </>
              )}
            </div>
            <div className="overflow-x-auto max-h-56 border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-lg">
              <table className="w-full text-[11px]">
                <tbody>
                  {parsed.rows.slice(0, 8).map((r: any, i) => (
                    <tr key={i} className="border-t border-[#f1f1ef] dark:border-[#2a2a2a]">
                      {Object.values(r).slice(0, 8).map((v: any, j) => <td key={j} className="p-1.5 whitespace-nowrap">{String(v ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {error && <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 border border-rose-200">{error}</div>}
      </div>

      <div className={`${card} p-5 space-y-3`}>
        <h3 className="text-sm font-bold">Параметры</h3>
        {parsed?.kind !== 'plan' && (
          <>
            <label className="text-xs space-y-1 block">
              <span className="text-slate-500">Филиал новых секторов и клиентов</span>
              <select className={input} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">—</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            {needsSector && (
              <label className="text-xs space-y-1 block">
                <span className="text-slate-500">Сектор (в файле нет room_code)</span>
                <select className={input} value={roomCode} onChange={(e) => setRoomCode(e.target.value)}>
                  <option value="">— без сектора —</option>
                  {sectors.map((s) => <option key={s.id} value={s.code}>{s.code} · {s.name}</option>)}
                </select>
              </label>
            )}
          </>
        )}
        <label className="text-xs space-y-1 block">
          <span className="text-slate-500">{parsed?.kind === 'plan' ? 'Агент плана' : needsAgent ? 'Агент (в файле нет robot_code)' : 'Агент, если robot_code не найден'}</span>
          <select className={input} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">—</option>
            {users.map((u) => <option key={u.id} value={u.id}>{`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username}</option>)}
          </select>
        </label>
        {parsed?.kind !== 'plan' && (
          <>
            <label className="text-xs flex items-center gap-2">
              <input type="checkbox" checked={createTemplates} onChange={(e) => setCreateTemplates(e.target.checked)} />
              Дни визита из файла → шаблоны маршрута
            </label>
            <label className="text-xs space-y-1 block">
              <span className="text-slate-500">Начало шаблонов, если в строке нет даты</span>
              <input type="date" className={input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
          </>
        )}
        <button className={`${primary} w-full justify-center`} disabled={!parsed || busy} onClick={run}>
          <Upload className="w-3.5 h-3.5" /> {busy ? 'Загрузка…' : 'Загрузить'}
        </button>

        {result && result.kind === 'clients' && (
          <div className="text-xs space-y-1 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
            <div>Создано клиентов: <b>{result.created}</b>, обновлено: <b>{result.updated}</b></div>
            <div>Новых секторов: <b>{result.sectorsCreated}</b>, каналов: <b>{result.channelsCreated}</b>, шаблонов: <b>{result.templates}</b></div>
            {result.skipped?.length > 0 && <div className="text-rose-700">Пропущено строк: {result.skipped.length} (первая: строка {result.skipped[0].row}, {result.skipped[0].reason})</div>}
            {result.warnings?.length > 0 && <div className="text-amber-700">Предупреждений: {result.warnings.length} ({result.warnings[0].message})</div>}
          </div>
        )}
        {result && result.kind === 'plan' && (
          <div className="text-xs space-y-1 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
            <div>Визитов добавлено: <b>{result.created}</b>, уже были в плане: <b>{result.skipped}</b></div>
            {result.problems?.length > 0 && <div className="text-rose-700">Не распознано строк: {result.problems.length} (строка {result.problems[0].row}: {result.problems[0].message})</div>}
          </div>
        )}
      </div>
    </div>
  );
}
