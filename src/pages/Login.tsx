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
    <div className="relative flex h-screen w-screen items-center justify-center bg-[#f4f6fa] overflow-hidden font-sans">

      {/* ── Ambient color blobs ── */}
      <div className="absolute top-[-15%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-[#0b57d0]/[0.07] blur-[130px] pointer-events-none animate-blob-1" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[#6366f1]/[0.05] blur-[120px] pointer-events-none animate-blob-2" />
      <div className="absolute top-[30%] right-[5%] w-[25vw] h-[25vw] rounded-full bg-[#8b5cf6]/[0.04] blur-[100px] pointer-events-none animate-blob-1" />
      <div className="absolute bottom-[20%] left-[10%] w-[20vw] h-[20vw] rounded-full bg-[#0ea5e9]/[0.04] blur-[90px] pointer-events-none animate-blob-2" />

      {/* ── Floating geometric shapes ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full border-[2px] border-[#0b57d0]/[0.06] animate-float-slow" />
        <div className="absolute top-[14%] right-[10%] w-14 h-14 rounded-full bg-[#0b57d0]/[0.03] animate-float-medium" />
        <div className="absolute top-[42%] -left-6 w-24 h-24 rounded-3xl border-[1.5px] border-[#1a73e8]/[0.05] rotate-12 animate-float-reverse" />
        <div className="absolute top-[32%] right-[18%] w-4 h-4 rounded-full bg-[#0b57d0]/[0.06] animate-float-fast" />
        <div className="absolute -bottom-12 -right-12 w-52 h-52 rounded-full border-[2px] border-[#8ab4f8]/[0.06] animate-float-slow" />
        <div className="absolute bottom-[22%] left-[14%] w-12 h-12 rounded-xl bg-[#1a73e8]/[0.03] -rotate-6 animate-float-reverse" />
        <div className="absolute top-[20%] left-[42%] w-2.5 h-2.5 rounded-full bg-[#0b57d0]/[0.08] animate-float-fast" />
        <div className="absolute top-[58%] right-[6%] w-32 h-32 rounded-[1.5rem] border-[1.5px] border-[#0b57d0]/[0.04] rotate-45 animate-float-slow" />
        <div className="absolute bottom-[10%] left-[38%] w-16 h-16 rounded-full border-[1.5px] border-[#1a73e8]/[0.05] animate-float-medium" />
        <div className="absolute top-[68%] left-[6%] w-5 h-5 rounded-md bg-[#8ab4f8]/[0.05] rotate-12 animate-float-fast" />
      </div>

      {/* ── Login card ── */}
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/80 border border-white/90 shadow-2xl backdrop-blur-xl relative z-10 mx-4 animate-card-entrance">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0b57d0] to-[#1a73e8] flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-[#0b57d0]/20 mb-4 select-none hover:rotate-6 hover:scale-110 transition-transform duration-300">
            S
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#1d1d1f]">
            SmartSale ERP
          </h2>
          <p className="text-[9px] text-[#86868b] font-bold uppercase tracking-widest mt-1">
            Savdo Tech Distribution
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-2.5 text-rose-700 text-xs font-semibold animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs font-medium">
          <div className="group">
            <label className="block text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5 px-1 group-focus-within:text-[#0b57d0] transition-colors duration-300">
              Имя пользователя
            </label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 w-4 h-4 text-[#86868b] group-focus-within:text-[#0b57d0] group-focus-within:scale-110 transition-all duration-300" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Имя пользователя"
                className="w-full bg-white/60 border border-[#e3e3e8] rounded-2xl py-3.5 pl-11 pr-4 text-xs text-[#1d1d1f] placeholder-slate-400 focus:outline-none focus:border-[#0b57d0] focus:bg-white focus:shadow-[0_0_0_3px_rgba(11,87,208,0.08)] transition-all duration-300"
              />
            </div>
          </div>

          <div className="group">
            <label className="block text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5 px-1 group-focus-within:text-[#0b57d0] transition-colors duration-300">
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-[#86868b] group-focus-within:text-[#0b57d0] group-focus-within:scale-110 transition-all duration-300" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите ваш пароль"
                className="w-full bg-white/60 border border-[#e3e3e8] rounded-2xl py-3.5 pl-11 pr-4 text-xs text-[#1d1d1f] placeholder-slate-400 focus:outline-none focus:border-[#0b57d0] focus:bg-white focus:shadow-[0_0_0_3px_rgba(11,87,208,0.08)] transition-all duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-[#0b57d0] hover:bg-[#094cb3] hover:shadow-lg hover:shadow-[#0b57d0]/25 text-white font-bold text-xs tracking-wider shadow-md shadow-[#0b57d0]/20 transition-all duration-300 flex items-center justify-center gap-1.5 mt-2 active:scale-[0.97]"
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

        <div className="mt-8 text-center text-[9px] text-[#86868b] font-bold tracking-wider">
          <span>РАЗРАБОТКА SAVDO TECH • 2026</span>
        </div>
      </div>

      {/* ── APK Download card ── */}
      <div className="absolute bottom-6 left-0 right-0 mx-auto w-[calc(100%-2rem)] max-w-sm p-4 rounded-2xl bg-white/60 border border-white/80 shadow-lg backdrop-blur-md flex items-center justify-between gap-4 z-10 hover:bg-white/75 hover:shadow-xl transition-all duration-300 animate-card-entrance-delay">
        <div className="text-left">
          <h4 className="text-[10px] font-bold text-[#1d1d1f] uppercase tracking-wider">Мобильное приложение</h4>
          <p className="text-[9px] text-[#5f6368] mt-0.5 leading-relaxed">Для торговых агентов и водителей-экспедиторов</p>
        </div>
        <a
          href={`${window.location.protocol}//${window.location.hostname}/uploads/smartsale.apk`}
          download
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
        >
          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
          </svg>
          <span>Скачать APK</span>
        </a>
      </div>
    </div>
  );
}
