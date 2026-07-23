import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, Plus, Key, Sparkles, Building, Check, Loader2, Trash2, Edit2, AlertTriangle, X } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  slug: string;
  licenseKey: string;
  status: string;
  createdAt: string;
}

export default function SuperAdmin() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState('active');

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tempResetPass, setTempResetPass] = useState<{ username: string; pass: string } | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await api.get('/companies');
      setCompanies(res.data);
    } catch (err: any) {
      setError('Не удалось загрузить список компаний');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Auto-generate slug from name (only in creation mode)
  useEffect(() => {
    if (name && !isEditMode) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();
      setSlug(generatedSlug);
    }
  }, [name, isEditMode]);

  const generateLicenseKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'SALE-';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) key += '-';
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setLicenseKey(key);
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingId(null);
    setName('');
    setSlug('');
    generateLicenseKey();
    setStatus('active');
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (company: Company) => {
    setIsEditMode(true);
    setEditingId(company.id);
    setName(company.name);
    setSlug(company.slug);
    setLicenseKey(company.licenseKey);
    setStatus(company.status);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!slug) {
      setError('Слаг (slug) не может быть пустым');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        name,
        slug,
        licenseKey,
        status,
      };

      if (isEditMode && editingId) {
        await api.put(`/companies/${editingId}`, payload);
      } else {
        await api.post('/companies', payload);
      }

      setShowModal(false);
      fetchCompanies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка сохранения. Возможно, slug или ключ уже заняты.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setError('');

    try {
      await api.delete(`/companies/${deletingId}`);
      setDeletingId(null);
      fetchCompanies();
    } catch (err: any) {
      setError('Не удалось удалить компанию. Некоторые данные могут быть связаны.');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCompanyStatus = async (company: Company) => {
    try {
      const newStatus = company.status === 'active' ? 'inactive' : 'active';
      await api.put(`/companies/${company.id}`, {
        status: newStatus,
      });
      fetchCompanies();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetAdminPassword = async (companyId: string) => {
    setError('');
    try {
      const res = await api.post(`/companies/${companyId}/reset-admin-password`);
      setTempResetPass({
        username: res.data.username,
        pass: res.data.tempPassword,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось сбросить пароль.');
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen text-slate-800 dark:text-slate-100 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-2 text-[#0b57d0]">
            <Shield className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Панель управления платформой</span>
          </div>
          <h1 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">Компании и Лицензии</h1>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0b57d0] hover:bg-[#094cb3] text-white text-xs font-bold rounded-2xl shadow-lg shadow-[#0b57d0]/25 transition-all duration-300 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить компанию</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-[#0b57d0] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-3xl bg-white dark:bg-[#0a0a0a]/80 border border-[#e3e3e8] dark:border-[#1a1a1a] shadow-xl backdrop-blur-md relative overflow-hidden group hover:border-[#3b82f6]/30 transition-all duration-300"
            >
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#0b57d0]/[0.02] rounded-full blur-2xl group-hover:bg-[#0b57d0]/[0.05] transition-all duration-500" />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0b57d0]/10 flex items-center justify-center text-[#3b82f6]">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950 dark:text-white text-sm group-hover:text-[#3b82f6] transition-colors">{c.name}</h3>
                    <p className="text-[10px] text-[#86868b] mt-0.5">slug: <span className="font-mono text-slate-700 dark:text-slate-300">{c.slug}</span></p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => toggleCompanyStatus(c)}
                  className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    c.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                  }`}
                >
                  {c.status === 'active' ? 'Активна' : 'Блок'}
                </button>
              </div>

              {/* Details */}
              <div className="mt-5 space-y-2.5 pt-4 border-t border-[#e3e3e8] dark:border-[#1a1a1a] text-xs">
                <div className="flex items-center justify-between text-[#86868b]">
                  <span>Логин администратора</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">admin@{c.slug}</span>
                </div>
                <div className="flex items-center justify-between text-[#86868b]">
                  <span>Лицензионный ключ</span>
                  <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg border border-[#e3e3e8] dark:border-white/5">
                    <Key className="w-3 h-3 text-[#3b82f6]" />
                    <span>{c.licenseKey}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[#86868b]">
                  <span>Дата создания</span>
                  <span className="text-slate-700 dark:text-slate-300">{new Date(c.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#e3e3e8]/50 dark:border-[#1a1a1a]/50">
                <button
                  onClick={() => handleResetAdminPassword(c.id)}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-[#e3e3e8] dark:border-white/5 hover:bg-amber-500/10 hover:text-amber-500 text-[#86868b] transition-all"
                  title="Сбросить пароль админа"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-[#e3e3e8] dark:border-white/5 hover:bg-[#3b82f6]/10 hover:text-[#3b82f6] text-[#86868b] transition-all"
                  title="Редактировать"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {c.slug !== 'savdotech' && (
                  <button
                    onClick={() => setDeletingId(c.id)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-[#e3e3e8] dark:border-white/5 hover:bg-rose-500/10 hover:text-rose-500 text-[#86868b] transition-all"
                    title="Удалить компанию"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#0a0a0a] border border-[#e3e3e8] dark:border-[#1a1a1a] shadow-2xl relative animate-card-entrance">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Building className="w-5 h-5 text-[#0b57d0]" />
              <span>{isEditMode ? 'Редактирование компании' : 'Новая компания'}</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div>
                <label className="block text-[10px] text-[#86868b] uppercase tracking-wider mb-1.5">Название компании</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Baraka Trade"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-[#e3e3e8] dark:border-[#1a1a1a] rounded-2xl py-3 px-4 text-slate-900 dark:text-white focus:outline-none focus:border-[#0b57d0] focus:bg-white dark:focus:bg-[#0a0a0a] transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#86868b] uppercase tracking-wider mb-1.5">Адрес входа (slug)</label>
                <input
                  type="text"
                  required
                  value={slug}
                  disabled={isEditMode}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  placeholder="barakatrade"
                  className={`w-full bg-slate-50 dark:bg-white/5 border border-[#e3e3e8] dark:border-[#1a1a1a] rounded-2xl py-3 px-4 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#0b57d0] focus:bg-white dark:focus:bg-[#0a0a0a] transition-all ${
                    isEditMode ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                {!isEditMode && (
                  <p className="text-[9px] text-[#86868b] mt-1 px-1">Логин администратора будет: admin@{slug || 'slug'}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-[#86868b] uppercase tracking-wider mb-1.5">Ключ лицензии</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                    placeholder="SALE-XXXX-XXXX"
                    className="flex-1 bg-slate-50 dark:bg-white/5 border border-[#e3e3e8] dark:border-[#1a1a1a] rounded-2xl py-3 px-4 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#0b57d0] focus:bg-white dark:focus:bg-[#0a0a0a] transition-all"
                  />
                  <button
                    type="button"
                    onClick={generateLicenseKey}
                    className="px-3 bg-slate-50 dark:bg-white/5 border border-[#e3e3e8] dark:border-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-white/10 rounded-2xl flex items-center justify-center text-[#3b82f6] transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#86868b] uppercase tracking-wider mb-1.5">Статус лицензии</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-[#e3e3e8] dark:border-[#1a1a1a] rounded-2xl py-3 px-4 text-slate-900 dark:text-white focus:outline-none focus:border-[#0b57d0] focus:bg-white dark:focus:bg-[#0a0a0a] transition-all"
                >
                  <option value="active" className="bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">Активна</option>
                  <option value="inactive" className="bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">Заблокирована</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#e3e3e8] dark:border-[#1a1a1a]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-[#e3e3e8] dark:border-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white font-bold transition-all text-xs"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#0b57d0] hover:bg-[#094cb3] text-white font-bold transition-all text-xs"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isEditMode ? 'Сохранить' : 'Создать'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-[#0a0a0a] border border-rose-500/20 shadow-2xl relative animate-card-entrance">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Удаление компании</span>
            </h3>
            <p className="text-[11px] text-[#86868b] leading-relaxed mb-6">
              Вы уверены, что хотите удалить эту компанию? Все связанные данные (сотрудники, клиенты, товары, заказы и т.д.) будут навсегда удалены без возможности восстановления.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 bg-slate-50 dark:bg-white/5 border border-[#e3e3e8] dark:border-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white text-xs font-bold rounded-xl transition-all"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/25 transition-all"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Удалить</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temp Password Reset Modal */}
      {tempResetPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-[#0a0a0a] border border-[#e3e3e8] dark:border-[#1a1a1a] shadow-2xl relative animate-card-entrance text-slate-800 dark:text-slate-100">
            <h3 className="text-sm font-bold text-[#0b57d0] mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Пароль успешно сброшен</span>
            </h3>
            <p className="text-[11px] text-[#86868b] leading-relaxed mb-4">
              Новые учетные данные для входа администратора компании:
            </p>
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-[#e3e3e8] dark:border-white/5 text-xs font-mono select-all mb-6">
              <div className="flex justify-between">
                <span className="text-[#86868b]">Логин:</span>
                <span className="font-bold text-slate-900 dark:text-white">{tempResetPass.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868b]">Пароль:</span>
                <span className="font-bold text-amber-500">{tempResetPass.pass}</span>
              </div>
            </div>
            <p className="text-[9px] text-[#86868b] mb-6">
              Скопируйте эти данные и передайте их клиенту. Пароль показывается только один раз.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setTempResetPass(null)}
                className="px-5 py-2.5 bg-[#0b57d0] hover:bg-[#094cb3] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-[#0b57d0]/20"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
