import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Trash, Shield, Info, Check, Save } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Record<string, string[]>;
}

// Define the modules, their human-readable names, and the actions available for each
const PERMISSION_STRUCTURE = [
  {
    category: 'Продажи и Клиенты',
    modules: [
      { key: 'orders', label: 'Заказы', actions: ['read', 'create', 'update', 'delete', 'deliver'] },
      { key: 'clients', label: 'Клиенты', actions: ['read', 'create', 'update', 'delete'] },
      { key: 'promotions', label: 'Акции и Скидки', actions: ['read', 'create', 'update', 'delete'] },
      { key: 'returns', label: 'Возвраты', actions: ['read', 'create', 'update', 'delete'] },
    ]
  },
  {
    category: 'Команда и Отслеживание',
    modules: [
      { key: 'agents', label: 'Агенты', actions: ['read', 'create', 'update', 'delete'] },
      { key: 'map', label: 'Карта и GPS', actions: ['read'] },
      { key: 'tasks', label: 'Задачи', actions: ['read', 'create', 'update', 'delete'] },
    ]
  },
  {
    category: 'Финансы и Зарплаты',
    modules: [
      { key: 'payments', label: 'Оплаты', actions: ['read', 'create', 'update', 'delete', 'collect', 'reconcile'] },
      { key: 'salary', label: 'Расчет зарплат', actions: ['read', 'create', 'update', 'delete', 'recalculate'] },
    ]
  },
  {
    category: 'Логистика и Склад',
    modules: [
      { key: 'warehouse', label: 'Сборка на складе', actions: ['read', 'assemble'] },
      { key: 'catalog', label: 'Товарный каталог', actions: ['read', 'create', 'update', 'delete'] },
      { key: 'branches', label: 'Филиалы', actions: ['read', 'create', 'update', 'delete'] },
    ]
  },
  {
    category: 'Администрирование и Рост',
    modules: [
      { key: 'roles', label: 'Управление ролями', actions: ['read', 'create', 'update', 'delete'] },
      { key: 'smm', label: 'Маркетинг и SMM', actions: ['read', 'create', 'update', 'delete', 'submit'] },
    ]
  }
];

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create Role State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const loadRoles = async () => {
    try {
      const response = await api.get('/roles');
      setRoles(response.data || []);
      if (response.data && response.data.length > 0) {
        // Keep the selection if possible, otherwise select first
        const currentSelection = selectedRole
          ? response.data.find((r: Role) => r.id === selectedRole.id)
          : null;
        setSelectedRole(currentSelection || response.data[0]);
      }
    } catch (err) {
      console.error('Failed to load roles list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      // Default empty permissions for new roles
      const defaultPerms: Record<string, string[]> = {};
      PERMISSION_STRUCTURE.forEach(cat => {
        cat.modules.forEach(m => {
          defaultPerms[m.key] = [];
        });
      });

      const response = await api.post('/roles', {
        name: newRoleName.trim().toUpperCase(),
        description: newRoleDesc.trim(),
        permissions: defaultPerms
      });

      setNewRoleName('');
      setNewRoleDesc('');
      setShowAddModal(false);
      await loadRoles();
      // Select the newly created role
      const newRole = response.data;
      if (newRole) {
        setSelectedRole(newRole);
      }
    } catch (err) {
      console.error('Failed to create custom role', err);
      alert('Ошибка при создании роли. Убедитесь, что имя уникально.');
    }
  };

  const handleTogglePermission = (moduleKey: string, action: string) => {
    if (!selectedRole) return;

    const currentPerms = { ...selectedRole.permissions };
    const modulePerms = currentPerms[moduleKey] ? [...currentPerms[moduleKey]] : [];

    if (modulePerms.includes(action)) {
      currentPerms[moduleKey] = modulePerms.filter(a => a !== action);
    } else {
      currentPerms[moduleKey] = [...modulePerms, action];
    }

    setSelectedRole({
      ...selectedRole,
      permissions: currentPerms
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await api.put(`/roles/${selectedRole.id}`, {
        description: selectedRole.description,
        permissions: selectedRole.permissions
      });
      await loadRoles();
      alert('Права доступа успешно сохранены!');
    } catch (err) {
      console.error('Failed to save permissions matrix', err);
      alert('Не удалось сохранить изменения.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole || selectedRole.isSystem) return;
    if (!confirm(`Вы действительно хотите удалить кастомную роль "${selectedRole.name}"? Это действие необратимо.`)) return;

    try {
      await api.delete(`/roles/${selectedRole.id}`);
      setSelectedRole(null);
      await loadRoles();
    } catch (err) {
      console.error('Failed to delete custom role', err);
      alert('Не удалось удалить роль. Проверьте, нет ли привязанных к ней сотрудников.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fa] h-full">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-[#0b57d0] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-[#5f6368]">Загрузка матрицы прав...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#f4f6fa] h-full p-4 lg:p-8 gap-6 relative">
      
      {/* Left Pane - Roles List (Hidden on mobile when a role is selected) */}
      <div className={`w-full lg:w-80 flex flex-col bg-white border border-[#e3e3e8] rounded-2xl p-4 flex-shrink-0 shadow-sm overflow-hidden ${
        selectedRole ? 'hidden lg:flex' : 'flex'
      }`}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="text-xs font-bold text-[#86868b] uppercase tracking-wider">Роли сотрудников</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1.5 rounded-lg bg-[#0b57d0] hover:bg-[#0b57d0]/90 text-white shadow-sm flex items-center justify-center transition-all"
            title="Создать кастомную роль"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {roles.map((role) => {
            const isSelected = selectedRole?.id === role.id;
            return (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#0b57d0]/5 border-[#0b57d0] text-[#0b57d0]'
                    : 'bg-white border-[#e3e3e8] text-[#1d1d1f] hover:bg-[#f8f9fa]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-xs truncate uppercase tracking-wide">{role.name}</span>
                  {role.isSystem ? (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0 flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" /> Системная
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-600 border border-emerald-200 flex-shrink-0">
                      Кастомная
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#86868b] line-clamp-2">
                  {role.description || 'Нет описания'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Pane - Permissions Grid (Takes full width on mobile when a role is selected) */}
      {selectedRole ? (
        <div className="flex-1 flex flex-col bg-white border border-[#e3e3e8] rounded-2xl shadow-sm overflow-hidden w-full">
          
          {/* Header */}
          <div className="p-6 border-b border-[#e3e3e8] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 flex-shrink-0">
            <div className="flex flex-col gap-2 w-full md:w-auto">
              {/* Back button for mobile view */}
              <button
                onClick={() => setSelectedRole(null)}
                className="lg:hidden px-3 py-1.5 rounded-lg border border-[#e3e3e8] text-xs font-bold text-[#5f6368] bg-white hover:bg-slate-50 self-start mb-2"
              >
                ← К списку ролей
              </button>
              
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-[#1d1d1f] uppercase tracking-wide">{selectedRole.name}</h2>
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase ${
                  selectedRole.isSystem ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {selectedRole.isSystem ? 'Системная' : 'Кастомная'}
                </span>
              </div>
              <input
                type="text"
                disabled={selectedRole.isSystem}
                value={selectedRole.description || ''}
                onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                placeholder="Описание роли"
                className="text-xs text-[#5f6368] bg-transparent border-b border-transparent hover:border-[#e3e3e8] focus:border-[#0b57d0] focus:outline-none transition-all py-0.5 w-80 max-w-full font-medium"
              />
            </div>

            <div className="flex gap-2.5 w-full md:w-auto">
              {!selectedRole.isSystem && (
                <button
                  onClick={handleDeleteRole}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-xl transition-all"
                >
                  <Trash className="w-3.5 h-3.5" /> Удалить
                </button>
              )}
              
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#0b57d0] hover:bg-[#0b57d0]/90 text-white rounded-xl shadow-sm transition-all"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Сохранить права
              </button>
            </div>
          </div>

          {/* Matrix Checklist */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-medium">
            <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-relaxed font-semibold">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Проставьте галочки в соответствующих модулях. После завершения обязательно нажмите кнопку «Сохранить права».</span>
            </div>

            {PERMISSION_STRUCTURE.map((cat, catIdx) => (
              <div key={catIdx} className="space-y-3">
                <h4 className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider pl-1 border-l-2 border-[#0b57d0]">{cat.category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cat.modules.map((mod) => {
                    const activeActions = selectedRole.permissions[mod.key] || [];
                    return (
                      <div key={mod.key} className="p-4 rounded-xl border border-[#e3e3e8] hover:border-slate-300 bg-white shadow-sm flex flex-col gap-3.5 transition-all">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-[#1d1d1f]">{mod.label}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">{mod.key}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2.5">
                          {mod.actions.map((action) => {
                            const isChecked = activeActions.includes(action);
                            return (
                              <button
                                key={action}
                                onClick={() => handleTogglePermission(mod.key, action)}
                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                                  isChecked
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                                    : 'bg-slate-50 border-[#e3e3e8] text-[#5f6368] hover:bg-[#f1f3f4]'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 text-blue-600" />}
                                <span className="uppercase">{action === 'read' ? 'просмотр' : action === 'create' ? 'создание' : action === 'update' ? 'изменение' : action === 'delete' ? 'удаление' : action === 'deliver' ? 'доставка' : action === 'collect' ? 'прием оплат' : action === 'reconcile' ? 'сверка' : action === 'assemble' ? 'сборка' : action === 'recalculate' ? 'расчет' : action}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white border border-[#e3e3e8] rounded-2xl">
          <p className="text-xs text-[#86868b] font-bold">Выберите роль из списка слева для управления правами</p>
        </div>
      )}

      {/* Add Custom Role Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e3e3e8] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn relative">
            <h3 className="text-sm font-bold text-[#1d1d1f] mb-4">Создать кастомную роль</h3>
            
            <form onSubmit={handleCreateRole} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">
                  Название роли (латиница, капсом)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: SMM_MANAGER"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value.replace(/[^A-Za-z_]/g, ''))}
                  className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-[#0b57d0] transition-all text-[#37352f]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">
                  Описание роли
                </label>
                <textarea
                  placeholder="Краткое описание обязанностей этой роли..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-[#0b57d0] transition-all text-[#37352f]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-[#e3e3e8] hover:bg-[#f8f9fa] font-bold text-[#5f6368] transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#0b57d0] hover:bg-[#0b57d0]/90 text-white font-bold shadow-md shadow-[#0b57d0]/10 transition-all"
                >
                  Создать роль
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
