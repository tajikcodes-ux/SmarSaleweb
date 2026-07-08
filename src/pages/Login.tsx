import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Lock, User, AlertCircle, Sparkles } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Неверное имя пользователя или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-screen flex h-screen w-screen items-center justify-center bg-[#f8f9fa] text-[#37352f] relative overflow-hidden font-sans">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0071e3]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md p-8 rounded-2xl bg-white border border-[#e9e9e7] shadow-xl relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#37352f] flex items-center justify-center font-bold text-white text-2xl shadow-sm mb-4">
            S
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#1d1d1f]">
            SmartSale ERP
          </h2>
          <p className="text-[10px] text-[#86868b] font-bold uppercase tracking-widest mt-1">Savdo Tech Distribution</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-100 flex items-center gap-2.5 text-rose-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs font-medium">
          <div>
            <label className="block text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">
              Имя пользователя
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-[#86868b]" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Имя пользователя"
                className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-[#0071e3] transition-all text-[#37352f] placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[#86868b]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите ваш пароль"
                className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-[#0071e3] transition-all text-[#37352f] placeholder-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-xs tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 mt-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Войти в систему</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] text-[#86868b] font-semibold">
          <span>Разработка Savdo Tech • 2026</span>
        </div>
      </div>
    </div>
  );
}
