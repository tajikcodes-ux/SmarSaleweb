import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { Users } from 'lucide-react';

interface NameRow {
  name: string;
  branch: string | null;
  orders: number;
  payments: number;
  lastDocument: string;
  userId: string | null;
  suggestion: { id: string; confidence: 'sure' | 'maybe' } | null;
}
interface UserRow { id: string; name: string; username: string; role: string | null; branch: string | null; legacyName: string | null; primarySystem: string }

/**
 * Which SmartSale employee each Smartup name is, and where the employee works now. Suggestions come from the names;
 * nothing is saved until someone presses the button.
 */
export default function AgentMapping() {
  const [names, setNames] = useState<NameRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [system, setSystem] = useState<Record<string, string>>({});
  const [state, setState] = useState<'loading' | 'idle' | 'saving' | 'saved'>('loading');
  const [error, setError] = useState('');

  const apply = (data: { names: NameRow[]; users: UserRow[] }) => {
    setNames(data.names);
    setUsers(data.users);
    setChoice(Object.fromEntries(data.names.map((n) => [n.name, n.userId ?? (n.suggestion?.confidence === 'sure' ? n.suggestion.id : '')])));
    setSystem(Object.fromEntries(data.users.map((u) => [u.id, u.primarySystem])));
  };

  useEffect(() => {
    api.get('/integrations/smartup/agents')
      .then((res) => { apply(res.data); setState('idle'); })
      .catch((err) => { setError(err.response?.data?.message || 'Не удалось загрузить список'); setState('idle'); });
  }, []);

  const userName = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const chosen = Object.values(choice).filter(Boolean);
  const duplicate = chosen.find((id, i) => chosen.indexOf(id) !== i);
  const matched = names.filter((n) => choice[n.name]).length;

  const save = async () => {
    if (duplicate) {
      setError(`${userName.get(duplicate)?.name} выбран для двух имён Smartup`);
      return;
    }
    setState('saving');
    setError('');
    try {
      const res = await api.put('/integrations/smartup/agents', {
        names: names.map((n) => ({ name: n.name, userId: choice[n.name] || null })),
        systems: [...new Set(chosen)].map((id) => ({ userId: id, primarySystem: system[id] || 'smartup' })),
      });
      apply(res.data);
      setState('saved');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось сохранить');
      setState('idle');
    }
  };

  if (state === 'loading') return null;
  if (!names.length && !error) return null;

  return (
    <div className="bg-white border border-[#e3e3e8] rounded-2xl shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 pb-3">
        <div>
          <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0b57d0]" /> Агенты Smartup → сотрудники SmartSale
          </h3>
          <p className="text-[11px] text-[#86868b] mt-0.5">
            Сопоставлено {matched} из {names.length}. Пары подобраны по ФИО — проверьте отмеченные «?». «Работает в SmartSale»: его заказы из Smartup
            покажутся как двойной ввод, а долги его клиентов загрузка больше не меняет.
          </p>
        </div>
        <button
          onClick={save}
          disabled={state === 'saving'}
          className="px-4 py-2 bg-[#0b57d0] hover:bg-[#0a4bb3] disabled:opacity-50 text-white rounded-xl text-xs font-bold whitespace-nowrap"
        >
          {state === 'saving' ? 'Сохранение…' : state === 'saved' ? 'Сохранено ✓' : 'Сохранить'}
        </button>
      </div>
      {error && <p className="px-5 pb-2 text-xs text-rose-600">{error}</p>}
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f8f9fa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider sticky top-0">
            <tr>
              <th className="p-2.5">Имя в Smartup</th><th className="p-2.5">Филиал</th><th className="p-2.5 text-right">Заказов</th>
              <th className="p-2.5">Сотрудник SmartSale</th><th className="p-2.5">Работает в</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e3e3e8]/60">
            {names.map((n) => {
              const id = choice[n.name] || '';
              const guess = !n.userId && n.suggestion && id === '' ? n.suggestion : null;
              return (
                <tr key={n.name}>
                  <td className="p-2.5 font-semibold text-[#1d1d1f]">{n.name}</td>
                  <td className="p-2.5">{n.branch ?? '—'}</td>
                  <td className="p-2.5 text-right font-mono">{n.orders || '—'}</td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={id}
                        onChange={(e) => { setChoice({ ...choice, [n.name]: e.target.value }); setState('idle'); }}
                        className="max-w-[260px] bg-white border border-[#e3e3e8] rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="">— не сопоставлен —</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}{u.branch ? ` · ${u.branch}` : ''}</option>
                        ))}
                      </select>
                      {guess && (
                        <button
                          onClick={() => { setChoice({ ...choice, [n.name]: guess.id }); setState('idle'); }}
                          className="text-[10px] font-semibold text-amber-700 hover:underline whitespace-nowrap"
                          title="Совпало одно слово имени: проверьте, тот ли это человек"
                        >
                          ? {userName.get(guess.id)?.name}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5">
                    {id ? (
                      <select
                        value={system[id] || 'smartup'}
                        onChange={(e) => { setSystem({ ...system, [id]: e.target.value }); setState('idle'); }}
                        className="bg-white border border-[#e3e3e8] rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="smartup">Smartup</option>
                        <option value="smartsale">SmartSale</option>
                      </select>
                    ) : (
                      <span className="text-[#86868b]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
