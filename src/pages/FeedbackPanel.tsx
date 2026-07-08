import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  MessageSquare, Bug, Lightbulb, Star, ChevronDown, ChevronUp,
  RefreshCw, CheckCircle2, Clock, Archive, Send, Filter
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

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      const res = await api.get('/feedbacks', { params });
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

  const totalNew = feedbacks.filter(f => f.status === 'new').length;
  const totalUnderReview = feedbacks.filter(f => f.status === 'under_review').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#0071e3]" />
            Обратная связь
          </h1>
          <p className="text-sm text-[#86868b] mt-0.5">Отзывы и предложения сотрудников</p>
        </div>
        <button
          onClick={fetchFeedbacks}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f5f5f7] text-[#1d1d1f] text-sm hover:bg-[#e5e5ea] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Всего обращений', value: feedbacks.length, color: '#0071e3', bg: '#eff6ff' },
          { label: 'Новые',           value: totalNew,          color: '#3b82f6', bg: '#dbeafe' },
          { label: 'На рассмотрении', value: totalUnderReview,  color: '#f59e0b', bg: '#fef3c7' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-4 border border-[#e9e9e7]" style={{ background: stat.bg }}>
            <p className="text-xs text-[#86868b] font-medium mb-1">{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-[#86868b]">
          <Filter className="w-4 h-4" /> Фильтры:
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-[#e9e9e7] bg-white text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
        >
          <option value="">Все статусы</option>
          <option value="new">Новые</option>
          <option value="under_review">На рассмотрении</option>
          <option value="closed">Закрытые</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-[#e9e9e7] bg-white text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
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
                className="border border-[#e9e9e7] rounded-2xl overflow-hidden bg-white transition-shadow hover:shadow-sm"
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
                    <p className="font-semibold text-sm text-[#1d1d1f] truncate">{fb.subject}</p>
                    <p className="text-xs text-[#86868b] mt-0.5">
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
                  <div className="border-t border-[#f5f5f7] px-4 pb-4 pt-3 bg-[#fafafa]">
                    {/* Content */}
                    <div className="bg-white border border-[#e9e9e7] rounded-xl p-3 mb-4 text-sm text-[#37352f] whitespace-pre-wrap leading-relaxed">
                      {fb.content}
                    </div>

                    {/* Existing response */}
                    {fb.response && (
                      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-3 mb-4">
                        <p className="text-xs font-semibold text-[#1d4ed8] mb-1">✉️ Ответ администрации:</p>
                        <p className="text-sm text-[#1e3a8a] whitespace-pre-wrap">{fb.response}</p>
                      </div>
                    )}

                    {/* Moderate form (only for non-closed) */}
                    {fb.status !== 'closed' && (
                      <div className="space-y-3">
                        <textarea
                          placeholder="Напишите ответ сотруднику (необязательно)..."
                          value={responseText[fb.id] || ''}
                          onChange={e => setResponseText(prev => ({ ...prev, [fb.id]: e.target.value }))}
                          className="w-full text-sm px-3 py-2.5 rounded-xl border border-[#e9e9e7] bg-white text-[#1d1d1f] resize-none focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
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
    </div>
  );
}
