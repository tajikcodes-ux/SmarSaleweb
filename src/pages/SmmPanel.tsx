import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash, Share2, Instagram, Facebook, Tv, Check, X, ExternalLink, Trophy, Filter, ZoomIn } from 'lucide-react';

// ─── Toast ───────────────────────────────────────────────
type Toast = { id: number; msg: string; type: 'success' | 'error' };
let _toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = ++_toastId;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

// ─── Interfaces ───────────────────────────────────────────
interface SmmTask {
  id: string; title: string; description: string;
  socialNetwork: string; link: string; points: number; status: string; createdAt: string;
}

interface SmmSubmission {
  id: string; taskId: string; userId: string; screenshotUrl: string;
  status: string; pointsEarned: number; feedback?: string; createdAt: string;
  task: { title: string; socialNetwork: string; points: number };
  user: { username: string; firstName: string; lastName: string };
}

interface LeaderboardEntry {
  id: string; username: string; firstName: string; lastName: string;
  smmPoints: number; totalSubmissions: number; approvedSubmissions: number;
}

// ─── Social Icons ─────────────────────────────────────────
const getSocialIcon = (network: string) => {
  switch (network) {
    case 'INSTAGRAM': return <Instagram className="w-5 h-5 text-pink-600" />;
    case 'FACEBOOK':  return <Facebook className="w-5 h-5 text-blue-600" />;
    case 'TELEGRAM':  return <Share2 className="w-5 h-5 text-sky-500" />;
    default:          return <Tv className="w-5 h-5 text-slate-800" />;
  }
};

// ─── Main Component ───────────────────────────────────────
export default function SmmPanel() {
  const { toasts, show } = useToast();
  const [tasks, setTasks] = useState<SmmTask[]>([]);
  const [submissions, setSubmissions] = useState<SmmSubmission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'moderation' | 'leaderboard'>('tasks');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<SmmTask | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskLink, setTaskLink] = useState('');
  const [taskPoints, setTaskPoints] = useState(10);
  const [taskSocial, setTaskSocial] = useState('INSTAGRAM');
  const [taskStatus, setTaskStatus] = useState('active');

  // Reject dialog
  const [rejectSubmissionId, setRejectSubmissionId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, subsRes, lbRes] = await Promise.all([
        api.get('/smm/tasks'),
        api.get('/smm/submissions'),
        api.get('/smm/leaderboard'),
      ]);
      setTasks(tasksRes.data || []);
      setSubmissions(subsRes.data || []);
      setLeaderboard(lbRes.data || []);
    } catch (err) {
      console.error('Failed to load SMM data', err);
      show('Ошибка загрузки SMM-модуля', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ─── Task Handlers ──────────────────────────────────────
  const openCreateModal = () => {
    setEditingTask(null);
    setTaskTitle(''); setTaskDesc(''); setTaskLink('');
    setTaskPoints(10); setTaskSocial('INSTAGRAM'); setTaskStatus('active');
    setShowTaskModal(true);
  };

  const openEditModal = (task: SmmTask) => {
    setEditingTask(task);
    setTaskTitle(task.title); setTaskDesc(task.description); setTaskLink(task.link);
    setTaskPoints(task.points); setTaskSocial(task.socialNetwork); setTaskStatus(task.status);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskLink.trim()) return;
    const payload = { title: taskTitle.trim(), description: taskDesc.trim(), link: taskLink.trim(), points: Number(taskPoints), socialNetwork: taskSocial, status: taskStatus };
    try {
      if (editingTask) {
        await api.put(`/smm/tasks/${editingTask.id}`, payload);
        show('Задача обновлена ✅');
      } else {
        await api.post('/smm/tasks', payload);
        show('Задача создана ✅');
      }
      setShowTaskModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      show('Ошибка при сохранении задачи', 'error');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Удалить эту задачу?')) return;
    try {
      await api.delete(`/smm/tasks/${id}`);
      show('Задача удалена');
      loadData();
    } catch {
      show('Ошибка при удалении', 'error');
    }
  };

  // ─── Moderation Handlers ────────────────────────────────
  const handleModerate = async (subId: string, status: 'approved' | 'rejected', feedback?: string) => {
    try {
      await api.patch(`/smm/submissions/${subId}/moderate`, { status, feedback });
      setRejectSubmissionId(null);
      setRejectFeedback('');
      show(status === 'approved' ? 'Отчёт одобрен ✅' : 'Отчёт отклонён');
      loadData();
    } catch {
      show('Не удалось изменить статус', 'error');
    }
  };

  // Filtered submissions
  const filteredSubmissions = statusFilter === 'all'
    ? submissions
    : submissions.filter(s => s.status === statusFilter);

  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f4f6fa] h-full p-4 lg:p-8">

      {/* Toast notifications */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg border animate-fadeIn pointer-events-auto ${
              t.type === 'error'
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-emerald-600 text-white border-emerald-500'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab: Tasks */}
          <button
            id="smm-tab-tasks"
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'tasks'
                ? 'bg-white text-[#0b57d0] border border-[#e3e3e8] shadow-sm'
                : 'text-[#5f6368] hover:bg-[#f1f3f4]'
            }`}
          >
            📋 Задачи ({tasks.length})
          </button>

          {/* Tab: Moderation */}
          <button
            id="smm-tab-moderation"
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all relative ${
              activeTab === 'moderation'
                ? 'bg-white text-[#0b57d0] border border-[#e3e3e8] shadow-sm'
                : 'text-[#5f6368] hover:bg-[#f1f3f4]'
            }`}
          >
            🛡️ Модерация
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Tab: Leaderboard */}
          <button
            id="smm-tab-leaderboard"
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-white text-[#0b57d0] border border-[#e3e3e8] shadow-sm'
                : 'text-[#5f6368] hover:bg-[#f1f3f4]'
            }`}
          >
            🏆 Лидерборд
          </button>
        </div>

        {activeTab === 'tasks' && (
          <button
            id="smm-create-task-btn"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#0b57d0] hover:bg-[#0b57d0]/90 text-white rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Создать задачу
          </button>
        )}

        {activeTab === 'moderation' && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#86868b]" />
            <select
              id="smm-status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-[#e3e3e8] rounded-xl px-3 py-2 text-xs font-bold text-[#1d1d1f] focus:outline-none focus:border-[#0b57d0] transition-all"
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидают</option>
              <option value="approved">Одобрены</option>
              <option value="rejected">Отклонены</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center bg-white border border-[#e3e3e8] rounded-2xl">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-[#0b57d0] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-[#5f6368]">Загрузка SMM-модуля...</span>
          </div>
        </div>

      ) : activeTab === 'tasks' ? (
        // ─── Tab 1: Tasks ──────────────────────────────────
        <div className="flex-1 overflow-y-auto space-y-4">
          {tasks.length === 0 ? (
            <div className="h-64 bg-white border border-[#e3e3e8] rounded-2xl flex flex-col items-center justify-center gap-3">
              <Share2 className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-bold text-[#86868b]">Задачи продвижения не созданы</p>
              <button onClick={openCreateModal} className="px-3.5 py-2 text-xs font-bold bg-[#0b57d0] text-white rounded-xl hover:bg-[#0b57d0]/90">
                Создать первую задачу
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map(task => (
                <div key={task.id} className="bg-white border border-[#e3e3e8] rounded-2xl p-5 hover:border-slate-300 shadow-sm flex flex-col justify-between transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        {getSocialIcon(task.socialNetwork)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          +{task.points} баллов
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                          task.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : task.status === 'draft' ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {task.status === 'active' ? 'Активна' : task.status === 'draft' ? 'Черновик' : 'Завершена'}
                        </span>
                      </div>
                    </div>
                    <h3 className="font-bold text-sm text-[#1d1d1f] mb-1.5 line-clamp-1">{task.title}</h3>
                    <p className="text-xs text-[#5f6368] mb-4 line-clamp-3 leading-relaxed">{task.description}</p>
                  </div>
                  <div className="border-t border-[#e3e3e8]/75 pt-3.5 flex items-center justify-between">
                    <a href={task.link} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-[#0b57d0] hover:underline font-bold flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" /> Открыть ссылку
                    </a>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEditModal(task)}
                        className="p-1.5 rounded-lg border border-[#e3e3e8] hover:bg-[#f8f9fa] text-[#5f6368]" title="Редактировать">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 rounded-lg border border-[#e3e3e8] hover:bg-rose-50 text-rose-600 hover:border-rose-200" title="Удалить">
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      ) : activeTab === 'moderation' ? (
        // ─── Tab 2: Moderation ─────────────────────────────
        <div className="flex-1 bg-white border border-[#e3e3e8] rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#e3e3e8] text-[#86868b] font-bold tracking-wider uppercase select-none">
                  <th className="p-4 pl-6">Агент</th>
                  <th className="p-4">Задача</th>
                  <th className="p-4">Скриншот</th>
                  <th className="p-4">Дата</th>
                  <th className="p-4">Статус</th>
                  <th className="p-4 pr-6 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e3e8] font-medium text-[#1d1d1f]">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      {statusFilter === 'all' ? 'Нет отправленных отчётов.' : `Нет отчётов со статусом "${statusFilter}".`}
                    </td>
                  </tr>
                ) : filteredSubmissions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-bold">{sub.user.firstName} {sub.user.lastName}</div>
                      <div className="text-[10px] text-[#86868b]">@{sub.user.username}</div>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold line-clamp-1 max-w-[200px]">{sub.task.title}</div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-[#86868b]">
                        {getSocialIcon(sub.task.socialNetwork)}
                        <span className="uppercase tracking-wide">{sub.task.socialNetwork}</span>
                      </div>
                    </td>

                    {/* Real image preview button */}
                    <td className="p-4">
                      <button
                        id={`smm-preview-${sub.id}`}
                        onClick={() => setLightboxUrl(sub.screenshotUrl)}
                        className="flex items-center gap-2 text-[#0b57d0] hover:text-[#0b57d0]/80 text-[11px] font-semibold group"
                        title="Открыть скриншот"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden group-hover:border-[#0b57d0]/30 transition-all flex-shrink-0">
                          <img
                            src={sub.screenshotUrl}
                            alt="screenshot"
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span>Посмотреть</span>
                          <ZoomIn className="w-3 h-3 opacity-60" />
                        </div>
                      </button>
                    </td>

                    <td className="p-4 text-[#86868b]">
                      {new Date(sub.createdAt).toLocaleDateString('ru-RU')}<br />
                      <span className="text-[10px]">{new Date(sub.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>

                    <td className="p-4">
                      {sub.status === 'pending' ? (
                        <span className="px-2 py-1 rounded-md text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          Ожидает
                        </span>
                      ) : sub.status === 'approved' ? (
                        <div>
                          <span className="px-2 py-1 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 block w-max mb-1">Одобрено</span>
                          <span className="text-[9px] font-bold text-emerald-600">+{sub.pointsEarned} KPI</span>
                        </div>
                      ) : (
                        <div>
                          <span className="px-2 py-1 rounded-md text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 block w-max mb-1">Отклонено</span>
                          {sub.feedback && (
                            <span className="text-[10px] text-[#86868b] italic leading-snug max-w-[150px] truncate block" title={sub.feedback}>
                              {sub.feedback}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="p-4 pr-6 text-right">
                      {sub.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            id={`smm-approve-${sub.id}`}
                            onClick={() => handleModerate(sub.id, 'approved')}
                            className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold flex items-center gap-1 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" /> Одобрить
                          </button>
                          <button
                            id={`smm-reject-${sub.id}`}
                            onClick={() => setRejectSubmissionId(sub.id)}
                            className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold flex items-center gap-1 transition-all"
                          >
                            <X className="w-3.5 h-3.5" /> Отклонить
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : (
        // ─── Tab 3: Leaderboard ────────────────────────────
        <div className="flex-1 bg-white border border-[#e3e3e8] rounded-2xl flex flex-col overflow-hidden shadow-sm">
          {leaderboard.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <Trophy className="w-12 h-12 text-slate-200" />
              <p className="text-xs font-bold text-[#86868b]">Нет данных.<br />Агенты ещё не выполнили ни одной задачи.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#e3e3e8] text-[#86868b] font-bold tracking-wider uppercase select-none">
                    <th className="p-4 pl-6 w-10">#</th>
                    <th className="p-4">Агент</th>
                    <th className="p-4 text-center">Выполнено задач</th>
                    <th className="p-4 text-center">Одобрено</th>
                    <th className="p-4 text-right pr-6">KPI-баллы</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e3e8] font-medium text-[#1d1d1f]">
                  {leaderboard.map((entry, idx) => (
                    <tr key={entry.id} className={`hover:bg-slate-50/60 transition-colors ${idx < 3 ? 'bg-amber-50/30' : ''}`}>
                      <td className="p-4 pl-6 font-black text-[#86868b]">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </td>
                      <td className="p-4">
                        <div className="font-bold">{entry.firstName} {entry.lastName}</div>
                        <div className="text-[10px] text-[#86868b]">@{entry.username}</div>
                      </td>
                      <td className="p-4 text-center font-bold">{entry.totalSubmissions}</td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {entry.approvedSubmissions}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <span className="text-[13px] font-black text-amber-600">+{entry.smmPoints}</span>
                        <span className="text-[10px] text-[#86868b] ml-1">KPI</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Lightbox ─────────────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white font-bold text-xs flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Закрыть
            </button>
            <img
              src={lightboxUrl}
              alt="Скриншот отчёта"
              className="w-full h-auto rounded-2xl shadow-2xl border border-white/10"
              onError={e => {
                (e.target as HTMLImageElement).src = '';
                (e.target as HTMLImageElement).alt = 'Изображение недоступно';
              }}
            />
            <div className="mt-3 text-center">
              <a href={lightboxUrl} target="_blank" rel="noopener noreferrer"
                className="text-white/70 hover:text-white text-xs flex items-center justify-center gap-1">
                <ExternalLink className="w-3 h-3" /> Открыть оригинал
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── Task Create/Edit Modal ────────────────────────── */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e3e3e8] rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <h3 className="text-sm font-bold text-[#1d1d1f] mb-4">
              {editingTask ? 'Редактировать задачу' : 'Создать задачу продвижения'}
            </h3>
            <form onSubmit={handleSaveTask} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">Заголовок задачи</label>
                <input id="smm-task-title" type="text" required placeholder="Репост поста в Instagram Stories" value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-[#0b57d0] transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">Инструкция</label>
                <textarea id="smm-task-desc" required placeholder="Опишите что нужно сделать..." value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)} rows={3}
                  className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-[#0b57d0] transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">Соцсеть</label>
                  <select id="smm-task-social" value={taskSocial} onChange={e => setTaskSocial(e.target.value)}
                    className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-[#0b57d0] transition-all">
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="TELEGRAM">Telegram</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="TIKTOK">TikTok</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">Баллы KPI</label>
                  <input id="smm-task-points" type="number" required min={1} value={taskPoints}
                    onChange={e => setTaskPoints(Number(e.target.value))}
                    className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-[#0b57d0] transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">Ссылка на публикацию</label>
                <input id="smm-task-link" type="url" required placeholder="https://instagram.com/p/..." value={taskLink}
                  onChange={e => setTaskLink(e.target.value)}
                  className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-[#0b57d0] transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">Статус</label>
                <select id="smm-task-status" value={taskStatus} onChange={e => setTaskStatus(e.target.value)}
                  className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-[#0b57d0] transition-all">
                  <option value="active">Активна (видна агентам)</option>
                  <option value="draft">Черновик (скрыта)</option>
                  <option value="completed">Завершена (архив)</option>
                </select>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowTaskModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-[#e3e3e8] hover:bg-[#f8f9fa] font-bold text-[#5f6368] transition-all">
                  Отмена
                </button>
                <button type="submit" id="smm-task-submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#0b57d0] hover:bg-[#0b57d0]/90 text-white font-bold shadow-md transition-all">
                  {editingTask ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Reject Modal ─────────────────────────────────── */}
      {rejectSubmissionId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e3e3e8] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-bold text-[#1d1d1f] mb-2">Отклонить отчёт</h3>
            <p className="text-[11px] text-[#5f6368] mb-4 font-semibold">Укажите причину. Агент увидит её в приложении.</p>
            <textarea id="smm-reject-reason" required placeholder="Пример: скриншот нечёткий, не видно времени публикации."
              value={rejectFeedback} onChange={e => setRejectFeedback(e.target.value)} rows={3}
              className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-[#0b57d0] transition-all mb-4" />
            <div className="flex gap-2.5">
              <button type="button" onClick={() => { setRejectSubmissionId(null); setRejectFeedback(''); }}
                className="flex-1 py-2.5 rounded-lg border border-[#e3e3e8] hover:bg-[#f8f9fa] font-bold text-[#5f6368] transition-all">
                Отмена
              </button>
              <button type="button" id="smm-reject-confirm"
                onClick={() => handleModerate(rejectSubmissionId, 'rejected', rejectFeedback.trim())}
                disabled={!rejectFeedback.trim()}
                className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
