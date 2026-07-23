import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  MessageSquare, Bug, Lightbulb, Star, ChevronDown, ChevronUp,
  RefreshCw, CheckCircle2, Clock, Archive, Send, Filter, Plus, X
} from 'lucide-react';

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  SUGGESTION: { label: 'Предложение', icon: Lightbulb, color: '#f59e0b', bg: '#fef3c7' },
  BUG:        { label: 'Ошибка',      icon: Bug,       color: '#ef4444', bg: '#fee2e2' },
  REVIEW:     { label: 'Отзыв',       icon: Star,      color: '#8b5cf6', bg: '#ede9fe' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  new:          { label: 'Новое',          icon: Clock,         color: '#3b82f6', bg: '#dbeafe' },
  under_review: { label: 'На рассмотрении', icon: RefreshCw,    color: '#f59e0b', bg: '#fef3c7' },
  closed:       { label: 'Закрыто',        icon: CheckCircle2, color: '#10b981', bg: '#d1fae5' },
};

export default function FeedbackPanel() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  // User and Role state
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isModerator = currentUser && ['OWNER', 'SUPER_ADMIN', 'SALES_MANAGER', 'DEVELOPER'].includes(currentUser.role);

  // New feedback form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newType, setNewType] = useState('SUGGESTION');
  const [newSubject, setNewSubject] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      
      const endpoint = isModerator ? '/feedbacks' : '/feedbacks/my';
      const res = await api.get(endpoint, { params });
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error('Failed to load feedbacks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [filterStatus, filterType]);

  const handleModerate = async (id: string, status: string) => {
    setSubmitting(id);
    try {
      await api.patch(`/feedbacks/${id}/moderate`, {
        status,
        response: responseText[id] || undefined,
      });
      await fetchFeedbacks();
      setExpandedId(null);
    } catch (err) {
      console.error('Failed to moderate feedback', err);
      alert('Ошибка при обновлении статуса');
    } finally {
      setSubmitting(null);
    }
  };

  const handleCreateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newContent.trim()) return;
    setCreating(true);
    try {
      await api.post('/feedbacks', {
        type: newType,
        subject: newSubject,
        content: newContent,
      });
      setShowCreateModal(false);
      setNewSubject('');
      setNewContent('');
      await fetchFeedbacks();
    } catch (err) {
      console.error('Failed to create feedback', err);
      alert('Не удалось отправить обращение');
    } finally {
      setCreating(false);
    }
  };

  const totalNew = feedbacks.filter(f => f.status === 'new').length;
  const totalUnderReview = feedbacks.filter(f => f.status === 'under_review').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#0071e3]" />
            Обратная связь
          </h1>
          <p className="text-sm text-[#86868b] dark:text-slate-400 mt-0.5">Отзывы и предложения сотрудников</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0071e3] text-white text-sm hover:bg-[#005bb5] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Написать</span>
          </button>
          <button
            onClick={fetchFeedbacks}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f5f5f7] dark:bg-white/5 text-[#1d1d1f] dark:text-white text-sm hover:bg-[#e5e5ea] dark:hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Всего обращений', value: feedbacks.length, colorClass: 'text-[#0071e3] dark:text-blue-400', bgClass: 'bg-[#eff6ff] dark:bg-white/5' },
          { label: 'Новые',           value: totalNew,          colorClass: 'text-[#3b82f6] dark:text-blue-400', bgClass: 'bg-[#dbeafe] dark:bg-white/5' },
          { label: 'На рассмотрении', value: totalUnderReview,  colorClass: 'text-[#f59e0b] dark:text-amber-400', bgClass: 'bg-[#fef3c7] dark:bg-white/5' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl p-4 border border-[#e9e9e7] dark:border-[#1a1a1a] ${stat.bgClass}`}>
            <p className="text-xs text-[#86868b] dark:text-slate-400 font-medium mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.colorClass}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-[#86868b] dark:text-slate-400">
          <Filter className="w-4 h-4" /> Фильтры:
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#1a1a1a] bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
        >
          <option value="">Все статусы</option>
          <option value="new">Новые</option>
          <option value="under_review">На рассмотрении</option>
          <option value="closed">Закрытые</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#1a1a1a] bg-white dark:bg-[#0a0a0a] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
        >
          <option value="">Все типы</option>
          <option value="SUGGESTION">Предложения</option>
          <option value="BUG">Ошибки</option>
          <option value="REVIEW">Отзывы</option>
        </select>
      </div>

      {/* Feedback list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-[#86868b]" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-16 text-[#86868b]">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Нет обращений</p>
          <p className="text-sm">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => {
            const typeConf = TYPE_CONFIG[fb.type] || TYPE_CONFIG.REVIEW;
            const statusConf = STATUS_CONFIG[fb.status] || STATUS_CONFIG.new;
            const TypeIcon = typeConf.icon;
            const StatusIcon = statusConf.icon;
            const isExpanded = expandedId === fb.id;
            const dateStr = new Date(fb.createdAt).toLocaleDateString('ru-RU', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return (
              <div
                key={fb.id}
                className="border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-2xl overflow-hidden bg-white dark:bg-[#0a0a0a] transition-shadow hover:shadow-sm"
              >
                {/* Row header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                >
                  {/* Type badge */}
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                    style={{ color: typeConf.color, background: typeConf.bg }}
                  >
                    <TypeIcon className="w-3.5 h-3.5" />
                    {typeConf.label}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#1d1d1f] dark:text-white truncate">{fb.subject}</p>
                    <p className="text-xs text-[#86868b] dark:text-slate-400 mt-0.5">
                      {fb.user?.firstName} {fb.user?.lastName} · @{fb.user?.username} · {dateStr}
                    </p>
                  </div>

                  {/* Status badge */}
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                    style={{ color: statusConf.color, background: statusConf.bg }}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusConf.label}
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#86868b]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#86868b]" />
                  )}
                </div>

                {/* Expanded section */}
                {isExpanded && (
                  <div className="border-t border-[#f5f5f7] dark:border-[#1a1a1a] px-4 pb-4 pt-3 bg-[#fafafa] dark:bg-[#111]">
                    {/* Content */}
                    <div className="bg-white dark:bg-[#050505] border border-[#e9e9e7] dark:border-[#1a1a1a] rounded-xl p-3 mb-4 text-sm text-[#37352f] dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {fb.content}
                    </div>

                    {/* Existing response */}
                    {fb.response && (
                      <div className="bg-[#eff6ff] dark:bg-blue-950/40 border border-[#bfdbfe] dark:border-blue-900/30 rounded-xl p-3 mb-4">
                        <p className="text-xs font-semibold text-[#1d4ed8] dark:text-blue-400 mb-1">✉️ Ответ администрации:</p>
                        <p className="text-sm text-[#1e3a8a] dark:text-blue-200 whitespace-pre-wrap">{fb.response}</p>
                      </div>
                    )}

                    {/* Moderate form (only for non-closed AND only for moderators/admins) */}
                    {isModerator && fb.status !== 'closed' && (
                      <div className="space-y-3">
                        <textarea
                          placeholder="Напишите ответ сотруднику (необязательно)..."
                          value={responseText[fb.id] || ''}
                          onChange={e => setResponseText(prev => ({ ...prev, [fb.id]: e.target.value }))}
                          className="w-full text-sm px-3 py-2.5 rounded-xl border border-[#e9e9e7] dark:border-[#1a1a1a] bg-white dark:bg-[#050505] text-[#1d1d1f] dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          {fb.status === 'new' && (
                            <button
                              onClick={() => handleModerate(fb.id, 'under_review')}
                              disabled={submitting === fb.id}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Взять в работу
                            </button>
                          )}
                          <button
                            onClick={() => handleModerate(fb.id, 'closed')}
                            disabled={submitting === fb.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {responseText[fb.id] ? 'Ответить и закрыть' : 'Закрыть'}
                          </button>
                          <button
                            onClick={() => handleModerate(fb.id, 'closed')}
                            disabled={!responseText[fb.id] || submitting === fb.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0071e3] text-white hover:bg-[#005bb5] transition-colors disabled:opacity-40"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Отправить ответ
                          </button>
                        </div>
                      </div>
                    )}
                    {fb.status === 'closed' && (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                        <Archive className="w-3.5 h-3.5" />
                        Обращение закрыто
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Feedback Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateFeedback}
            className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#0a0a0a] border border-[#e9e9e7] dark:border-[#1a1a1a] shadow-2xl relative animate-card-entrance text-slate-800 dark:text-slate-100"
          >
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Новое обращение
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#86868b] mb-1.5">
                  Тип обращения
                </label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-[#e9e9e7] dark:border-[#1a1a1a] bg-white dark:bg-[#050505] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
                >
                  <option value="SUGGESTION">Предложение</option>
                  <option value="REVIEW">Отзыв / Жалоба</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#86868b] mb-1.5">
                  Тема обращения
                </label>
                <input
                  type="text"
                  placeholder="Например: Ошибка при открытии смены"
                  required
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-[#e9e9e7] dark:border-[#1a1a1a] bg-white dark:bg-[#050505] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#86868b] mb-1.5">
                  Содержание
                </label>
                <textarea
                  placeholder="Опишите ваше предложение или проблему подробно..."
                  required
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-[#e9e9e7] dark:border-[#1a1a1a] bg-white dark:bg-[#050505] text-[#1d1d1f] dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-[#e9e9e7] dark:border-[#1a1a1a] bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-xs font-bold rounded-xl transition-all"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] hover:bg-[#005bb5] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#0071e3]/20 transition-all disabled:opacity-50"
              >
                {creating ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
