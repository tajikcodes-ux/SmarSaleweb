import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, User, X } from 'lucide-react';
import api from '../services/api';

const field =
  'w-full bg-[#fbfbfa] dark:bg-white/5 border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#0071e3] text-[#37352f] dark:text-white';
const label = 'block text-[11px] font-semibold text-[#86868b] mb-1';

/** The signed-in user as stored at login; the flag is cleared here once the password is changed. */
export function markPasswordChanged() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user) localStorage.setItem('user', JSON.stringify({ ...user, mustChangePassword: false }));
  } catch {
    /* a broken stored user is replaced at the next login */
  }
}

/** Current password, new one twice. The server checks the current password and rejects simple ones. */
export function ChangePasswordForm({ onDone, submitLabel = 'Сменить пароль' }: { onDone: () => void; submitLabel?: string }) {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 8) return setError('Новый пароль должен быть не короче 8 символов.');
    if (newPass !== repeat) return setError('Новый пароль и повтор не совпадают.');
    setSaving(true);
    try {
      await api.post('/users/change-password', { currentPass, newPass });
      markPasswordChanged();
      setCurrentPass('');
      setNewPass('');
      setRepeat('');
      onDone();
    } catch (err: any) {
      const message = err.response?.data?.message;
      setError(Array.isArray(message) ? message.join(' ') : message || 'Не удалось сменить пароль.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className={label}>Текущий пароль</label>
        <input type="password" autoComplete="current-password" required value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} className={field} />
      </div>
      <div>
        <label className={label}>Новый пароль (не короче 8 символов)</label>
        <input type="password" autoComplete="new-password" required value={newPass} onChange={(e) => setNewPass(e.target.value)} className={field} />
      </div>
      <div>
        <label className={label}>Повторите новый пароль</label>
        <input type="password" autoComplete="new-password" required value={repeat} onChange={(e) => setRepeat(e.target.value)} className={field} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0b57d0] hover:bg-[#094cb3] disabled:opacity-60 text-white font-bold text-sm transition-colors"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}

interface Profile {
  login: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  branch: { name: string } | null;
  company: { name: string } | null;
}

/** "Мой профиль": name and phone, and the password. Login, role and branch are set by the manager. */
export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage('');
    setError('');
    api.get('/users/me')
      .then((res) => {
        setProfile(res.data);
        setFirstName(res.data.firstName || '');
        setLastName(res.data.lastName || '');
        setPhone(res.data.phone || '');
      })
      .catch(() => setError('Не удалось загрузить профиль.'));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);
    try {
      const res = await api.patch('/users/me', { firstName, lastName, phone });
      setProfile(res.data);
      // The header shows the name from the stored user
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, firstName: res.data.firstName, lastName: res.data.lastName }));
      window.dispatchEvent(new CustomEvent('smartsale:auth-change'));
      setMessage('Профиль сохранён.');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' ') : msg || 'Не удалось сохранить профиль.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111] border border-[#e3e3e8] dark:border-[#1a1a1a] shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e3e3e8] dark:border-[#1a1a1a]">
          <h2 id="profile-title" className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
            <User className="w-4 h-4" /> Мой профиль
          </h2>
          <button onClick={onClose} aria-label="Закрыть" className="p-1 rounded-md text-[#86868b] hover:bg-[#f1f3f4] dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {profile && (
            <div className="rounded-lg bg-[#f5f5f7] dark:bg-white/5 p-3 text-xs text-[#37352f] dark:text-white space-y-1">
              <div><span className="text-[#86868b]">Логин:</span> <span className="font-mono font-semibold">{profile.login}</span></div>
              <div><span className="text-[#86868b]">Роль:</span> {profile.role}{profile.branch ? ` · ${profile.branch.name}` : ''}</div>
              {profile.company && <div><span className="text-[#86868b]">Компания:</span> {profile.company.name}</div>}
            </div>
          )}

          <form onSubmit={saveProfile} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Имя</label>
                <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} />
              </div>
              <div>
                <label className={label}>Фамилия</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={field} />
              </div>
            </div>
            <div>
              <label className={label}>Телефон</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+992 ..." className={field} />
            </div>
            {message && <p className="text-xs text-green-700">{message}</p>}
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saving || !profile}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#d2d2d7] dark:border-[#333] hover:bg-[#f5f5f7] dark:hover:bg-white/10 disabled:opacity-60 text-[#1d1d1f] dark:text-white font-bold text-sm transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Сохранить
            </button>
          </form>

          <div className="border-t border-[#e3e3e8] dark:border-[#1a1a1a] pt-5">
            <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4" /> Смена пароля
            </h3>
            <ChangePasswordForm onDone={() => setMessage('Пароль изменён.')} />
          </div>
        </div>
      </div>
    </div>
  );
}
