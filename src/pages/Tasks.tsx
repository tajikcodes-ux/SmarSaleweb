import { useEffect, useState } from 'react';
import api from '../services/api';
import { CheckSquare, Calendar, User, Plus, Filter, CheckCircle2 } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedRep, setSelectedRep] = useState('all');

  // Modal states
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');

  const loadData = async () => {
    try {
      const [taskRes, userRes] = await Promise.all([
        api.get('/tasks').catch(() => ({ data: [] })),
        api.get('/users').catch(() => ({ data: [] })),
      ]);
      setTasks(taskRes.data);
      setUsers(userRes.data);

      const reps = userRes.data.filter((u: any) => u.role === 'SALES_REP');
      if (reps.length > 0) {
        setAssignedTo(reps[0].id);
      }
    } catch (err) {
      console.error('Failed to load tasks data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const closeForm = () => {
    setShowAddForm(false);
    setTitle('');
    setDescription('');
    setDueDate('');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/tasks', {
        title,
        description,
        assignedTo,
        dueDate: dueDate || null,
      });

      closeForm();
      loadData();
    } catch (err) {
      console.error('Failed to create task', err);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await api.patch(`/tasks/${id}`, { status: newStatus });
      loadData();
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    return selectedRep === 'all' || t.assignedTo === selectedRep;
  });

  const totalTasksCount = filteredTasks.length;
  const completedTasksCount = filteredTasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight">Задачи агентов</h1>
          <p className="text-xs text-[#86868b] mt-0.5">Постановка и аудит поручений торговым представителям</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#37352f] hover:bg-[#4a4944] text-white font-semibold text-xs transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Поручить задачу</span>
        </button>
      </div>

      {/* Filters & KPI Summary bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filter panel */}
        <div className="bg-[#ffffff] border border-[#e9e9e7] rounded-xl p-4 flex gap-4 items-center shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#86868b]">
            <Filter className="w-3.5 h-3.5" />
            <span>Фильтр:</span>
          </div>

          <div className="flex flex-col gap-1 w-full max-w-xs">
            <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Исполнитель</label>
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="bg-[#f5f5f7] border border-[#e9e9e7] rounded-lg px-2.5 py-1 text-xs text-[#37352f] font-medium focus:outline-none"
            >
              <option value="all">Все сотрудники</option>
              {users
                .filter((u) => u.role === 'SALES_REP')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Mini KPI panel */}
        <div className="bg-white border border-[#e9e9e7] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Прогресс выполнения</span>
            <div className="text-lg font-bold text-[#1d1d1f] mt-1">
              {completedTasksCount} из {totalTasksCount} задач
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center border border-green-200 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main checklist */}
      <div className="bg-white border border-[#e9e9e7] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#e9e9e7] bg-[#f5f5f7] flex items-center gap-2 font-bold text-xs text-[#1d1d1f]">
          <CheckSquare className="w-4 h-4 text-[#86868b]" />
          <span>Контрольный лист поручений</span>
        </div>

        <div className="divide-y divide-[#e9e9e7]">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#86868b]">Загрузка задач...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#86868b]">Нет поставленных задач</div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 flex gap-4 items-start hover:bg-[#fafaf9] transition-colors ${
                  task.status === 'completed' ? 'opacity-75' : ''
                }`}
              >
                {/* Status Checkbox */}
                <button
                  onClick={() => handleStatusToggle(task.id, task.status)}
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    task.status === 'completed'
                      ? 'bg-green-600 border-green-700 text-white'
                      : 'border-[#c7c7cc] hover:border-[#86868b] bg-white'
                  }`}
                >
                  {task.status === 'completed' && <span className="text-[10px] font-bold">✓</span>}
                </button>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h4
                      className={`text-xs font-bold text-[#1d1d1f] ${
                        task.status === 'completed' ? 'line-through text-[#86868b]' : ''
                      }`}
                    >
                      {task.title}
                    </h4>
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        task.status === 'completed'
                          ? 'bg-green-50 text-green-700 border border-green-150'
                          : 'bg-amber-50 text-amber-700 border border-amber-150'
                      }`}
                    >
                      {task.status === 'completed' ? 'Выполнено' : 'В работе'}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-[#6a6a65] max-w-2xl">{task.description}</p>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-4 text-[10px] text-[#86868b] pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Исполнитель: {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Не назначен'}</span>
                    </span>

                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Срок: {new Date(task.dueDate).toLocaleDateString('ru-RU')}</span>
                      </span>
                    )}

                    <span className="text-[9px]">Поставил: {task.creator ? `${task.creator.firstName} ${task.creator.lastName}` : 'Система'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#e9e9e7] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#f5f5f7] border-b border-[#e9e9e7] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#37352f]" />
                <h3 className="font-bold text-sm text-[#1d1d1f]">Поставить новую задачу</h3>
              </div>
              <button onClick={closeForm} className="text-[#86868b] hover:text-[#1d1d1f] text-xs font-semibold">
                Закрыть
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Исполнитель (Агент)</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  required
                  className="bg-white border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs text-[#37352f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                >
                  {users
                    .filter((u) => u.role === 'SALES_REP')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.username})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Тема поручения</label>
                <input
                  type="text"
                  placeholder="Забрать дебет, проверить выкладку..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-white border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs text-[#37352f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Описание задачи</label>
                <textarea
                  placeholder="Детали поручения, контактные лица..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-white border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs text-[#37352f] focus:outline-none focus:ring-1 focus:ring-[#0071e3] resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Срок выполнения (Due Date)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-white border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs text-[#37352f] focus:outline-none focus:ring-1 focus:ring-[#0071e3]"
                />
              </div>

              <div className="pt-4 border-t border-[#e9e9e7] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded-lg bg-[#f5f5f7] hover:bg-[#e9e9e7] text-[#515154] font-semibold text-xs transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#37352f] hover:bg-[#4a4944] text-white font-semibold text-xs transition-colors"
                >
                  Поручить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
