import { useEffect, useState } from 'react';
import api from '../services/api';
import { UserPlus, Shield, Smartphone, Clock, X } from 'lucide-react';

export default function Agents() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Shifts modal state
  const [selectedUserForShifts, setSelectedUserForShifts] = useState<any | null>(null);
  const [shiftsHistory, setShiftsHistory] = useState<any[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('SALES_REP');
  const [roles, setRoles] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users'),
        api.get('/roles'),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data || []);
    } catch (err) {
      console.error('Failed to load users or roles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadShiftsHistory = async (userId: string) => {
    setLoadingShifts(true);
    try {
      const response = await api.get(`/users/${userId}/shifts`);
      setShiftsHistory(response.data);
    } catch (err) {
      console.error('Failed to load shifts history', err);
    } finally {
      setLoadingShifts(false);
    }
  };

  useEffect(() => {
    if (selectedUserForShifts) {
      loadShiftsHistory(selectedUserForShifts.id);
    }
  }, [selectedUserForShifts]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', {
        username,
        password,
        firstName,
        lastName,
        phone,
        role,
        email: email || undefined,
      });
      setShowAddForm(false);
      loadUsers();
      // Clear fields
      setUsername('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при создании сотрудника');
    }
  };

  const formatDuration = (started: string, ended: string | null) => {
    if (!ended) return 'В процессе';
    const diffMs = new Date(ended).getTime() - new Date(started).getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs} ч. ${diffMins} мин.`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="w-8 h-8 border-4 border-slate-200 border-t-[#37352f] rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
        <div>
          <h3 className="font-bold text-[#1d1d1f] text-base">Сотрудники компании</h3>
          <p className="text-[11px] text-[#86868b] mt-0.5">Управление учетными записями, ролями и правами доступа агентов</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Скрыть форму' : 'Добавить сотрудника'}</span>
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateUser} className="bg-white border border-[#e9e9e7] p-5 rounded-xl space-y-4 max-w-2xl shadow-sm">
          <h4 className="font-bold text-[#1d1d1f] text-xs">Новый сотрудник</h4>
          {error && <div className="text-rose-600 text-xs bg-rose-50 border border-rose-100 p-3 rounded-lg">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Имя пользователя (username)*"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <input
              type="password"
              placeholder="Пароль*"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <input
              type="text"
              placeholder="Имя*"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <input
              type="text"
              placeholder="Фамилия*"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <input
              type="text"
              placeholder="Телефон*"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <input
              type="email"
              placeholder="Email (необязательно)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f]"
            >
              {roles.map((r: any) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs shadow-sm transition-all"
          >
            Создать аккаунт
          </button>
        </form>
      )}

      <div className="bg-white border border-[#e9e9e7] rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e9e9e7] bg-[#fbfbfa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
              <th className="p-3.5">ФИО</th>
              <th className="p-3.5">Логин</th>
              <th className="p-3.5">Роль</th>
              <th className="p-3.5">Телефон</th>
              <th className="p-3.5">Смена</th>
              <th className="p-3.5">Статус</th>
              <th className="p-3.5 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9e9e7]/60 text-xs">
            {users.map((item) => (
              <tr key={item.id} className="hover:bg-[#fbfbfa] transition-colors">
                <td className="p-3.5 font-bold text-[#37352f]">
                  {item.firstName} {item.lastName}
                </td>
                <td className="p-3.5 text-[#6a6a65]">{item.username}</td>
                <td className="p-3.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[9px] ${
                    item.role === 'OWNER'
                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                      : item.role === 'SALES_REP'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                  }`}>
                    {item.role === 'SALES_REP' ? <Smartphone className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                    {item.role}
                  </span>
                </td>
                <td className="p-3.5 text-[#37352f]">{item.phone}</td>
                <td className="p-3.5">
                  {item.role === 'SALES_REP' ? (
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                      item.onShift
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse'
                        : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      {item.onShift ? 'На смене' : 'Вне смены'}
                    </span>
                  ) : (
                    <span className="text-[#86868b] text-[10px]">—</span>
                  )}
                </td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                    item.status === 'active' || !item.status
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    {item.status || 'active'}
                  </span>
                </td>
                <td className="p-3.5 text-right">
                  {item.role === 'SALES_REP' && (
                    <button
                      onClick={() => setSelectedUserForShifts(item)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[#37352f] rounded-lg font-semibold text-[11px] transition-all"
                    >
                      <Clock className="w-3 h-3" />
                      <span>История смен</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shifts History Modal */}
      {selectedUserForShifts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-[#e9e9e7] w-full max-w-xl rounded-2xl shadow-xl overflow-hidden animate-scaleUp">
            <div className="flex justify-between items-center bg-[#fbfbfa] border-b border-[#e9e9e7] p-4">
              <div>
                <h4 className="font-bold text-[#1d1d1f] text-sm">История рабочих смен</h4>
                <p className="text-[10px] text-[#86868b] mt-0.5">
                  Сотрудник: {selectedUserForShifts.firstName} {selectedUserForShifts.lastName} (@{selectedUserForShifts.username})
                </p>
              </div>
              <button
                onClick={() => setSelectedUserForShifts(null)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-[400px] overflow-y-auto space-y-4">
              {loadingShifts ? (
                <div className="flex h-32 items-center justify-center">
                  <span className="w-6 h-6 border-3 border-slate-200 border-t-[#37352f] rounded-full animate-spin"></span>
                </div>
              ) : shiftsHistory.length === 0 ? (
                <div className="text-center py-10 text-[#86868b] text-xs">
                  Нет зарегистрированных смен для данного сотрудника.
                </div>
              ) : (
                <div className="border border-[#e9e9e7] rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#e9e9e7] bg-[#fbfbfa] text-[9px] font-bold text-[#86868b] uppercase tracking-wider">
                        <th className="p-3">Дата</th>
                        <th className="p-3">Начало</th>
                        <th className="p-3">Окончание</th>
                        <th className="p-3 text-right">Длительность</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e9e9e7]/60">
                      {shiftsHistory.map((shift) => (
                        <tr key={shift.id} className="hover:bg-[#fbfbfa]">
                          <td className="p-3 font-semibold text-[#37352f]">{formatDate(shift.startedAt)}</td>
                          <td className="p-3 text-emerald-600 font-semibold">{formatTime(shift.startedAt)}</td>
                          <td className="p-3 text-slate-600 font-semibold">
                            {shift.endedAt ? formatTime(shift.endedAt) : <span className="text-emerald-500 animate-pulse font-bold">Активна</span>}
                          </td>
                          <td className="p-3 text-right font-bold text-[#1d1d1f]">
                            {formatDuration(shift.startedAt, shift.endedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t border-[#e9e9e7] bg-[#fbfbfa]">
              <button
                onClick={() => setSelectedUserForShifts(null)}
                className="px-4 py-1.5 border border-[#e9e9e7] bg-white hover:bg-slate-50 text-xs font-bold rounded-lg transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
