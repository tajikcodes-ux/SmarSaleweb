import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import {
  Plus,
  Trash,
  Shield,
  Check,
  Save,
  Search,
  CheckCheck,
  XCircle,
  Sparkles,
  Unlock,
  BarChart3,
  ShoppingBag,
  Layers,
  Users,
  Coins,
  Settings,
  Eye,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Record<string, string[]>;
}

interface PermissionAction {
  action: string;
  label: string;
  hint?: string;
}

interface ModuleDef {
  key: string;
  label: string;
  description: string;
  actions: PermissionAction[];
}

interface CategoryDef {
  category: string;
  icon: any;
  modules: ModuleDef[];
}

// 20 Complete Modules covering 100% of the SmartSale platform
const PERMISSION_STRUCTURE: CategoryDef[] = [
  {
    category: 'Аналитика и Отчеты',
    icon: BarChart3,
    modules: [
      {
        key: 'dashboard',
        label: 'Дашборд и Главная аналитика',
        description: 'Сводные KPI, динамика продаж, графики выручки и активности',
        actions: [
          { action: 'read', label: 'Просмотр дашборда' },
          { action: 'view_revenue', label: 'Выручка и маржа' },
          { action: 'export', label: 'Экспорт графиков' },
        ],
      },
      {
        key: 'reports',
        label: 'Конструктор отчетов',
        description: 'Генератор гибких отчетов по продажам, клиентам, товарам и АКБ',
        actions: [
          { action: 'read', label: 'Просмотр отчетов' },
          { action: 'create', label: 'Создание отчетов' },
          { action: 'export', label: 'Экспорт в Excel/PDF' },
        ],
      },
      {
        key: 'ai',
        label: 'AI Ассистент',
        description: 'Умный аналитический помощник и ответы на бизнес-вопросы',
        actions: [
          { action: 'read', label: 'Доступ к ассистенту' },
          { action: 'query', label: 'Запросы к базе' },
        ],
      },
      {
        key: 'audit_logs',
        label: 'Журнал безопасности и аудита',
        description: 'Фиксация всех действий персонала, входов и изменений в системе',
        actions: [
          { action: 'read', label: 'Просмотр журнала' },
          { action: 'export', label: 'Экспорт логов' },
        ],
      },
    ],
  },
  {
    category: 'Продажи и Клиенты',
    icon: ShoppingBag,
    modules: [
      {
        key: 'orders',
        label: 'Заказы и Продажи',
        description: 'Оформление, статусы, доставка и финансовые условия заказов',
        actions: [
          { action: 'read', label: 'Просмотр заказов' },
          { action: 'create', label: 'Создание' },
          { action: 'update', label: 'Редактирование' },
          { action: 'delete', label: 'Удаление' },
          { action: 'deliver', label: 'Отгрузка/доставка' },
          { action: 'edit_price', label: 'Смена цен в заказе' },
          { action: 'give_discount', label: 'Ручные скидки' },
          { action: 'cancel', label: 'Отмена проведенных' },
          { action: 'export', label: 'Экспорт в Excel' },
        ],
      },
      {
        key: 'returns',
        label: 'Возвраты товаров',
        description: 'Оформление возвратов от торговых точек, сверка причин и склад',
        actions: [
          { action: 'read', label: 'Просмотр возвратов' },
          { action: 'create', label: 'Создание' },
          { action: 'update', label: 'Согласование' },
          { action: 'delete', label: 'Удаление' },
        ],
      },
      {
        key: 'promotions',
        label: 'Акции и Скидочные программы',
        description: 'Маркетинговые механики, бонусы за объем, промо-наборы',
        actions: [
          { action: 'read', label: 'Просмотр акций' },
          { action: 'create', label: 'Создание' },
          { action: 'update', label: 'Редактирование' },
          { action: 'delete', label: 'Удаление' },
        ],
      },
      {
        key: 'clients',
        label: 'Магазины и Клиентская база',
        description: 'Карточки торговых точек, балансы, долги, договоры и реквизиты',
        actions: [
          { action: 'read', label: 'Просмотр точек' },
          { action: 'create', label: 'Добавление новых' },
          { action: 'update', label: 'Редактирование' },
          { action: 'delete', label: 'Удаление' },
          { action: 'view_debts', label: 'Просмотр долгов' },
          { action: 'edit_credit', label: 'Кредитный лимит' },
          { action: 'export', label: 'Экспорт базы' },
        ],
      },
    ],
  },
  {
    category: 'Логистика и Склад',
    icon: Layers,
    modules: [
      {
        key: 'catalog',
        label: 'Товары и Категории цен',
        description: 'Номенклатура, базовые цены, ценовые категории и себестоимость',
        actions: [
          { action: 'read', label: 'Просмотр каталога' },
          { action: 'create', label: 'Создание товаров' },
          { action: 'update', label: 'Редактирование' },
          { action: 'delete', label: 'Удаление' },
          { action: 'view_cost', label: 'Себестоимость' },
          { action: 'edit_prices', label: 'Изменение цен' },
        ],
      },
      {
        key: 'warehouse',
        label: 'Склад, Сборка и Закупки',
        description: 'Сборка заказов, неснижаемый буфер (Safety Stock), автозаказ',
        actions: [
          { action: 'read', label: 'Остатки склада' },
          { action: 'assemble', label: 'Сборка заказов' },
          { action: 'auto_order', label: 'Умный автозаказ' },
          { action: 'adjust_stock', label: 'Инвентаризация/списание' },
          { action: 'dispatch', label: 'Передача в доставку' },
        ],
      },
    ],
  },
  {
    category: 'Команда и Полевой контроль',
    icon: Users,
    modules: [
      {
        key: 'agents',
        label: 'Сотрудники и Агенты',
        description: 'Учет штата, привязка к филиалам, назначение ролей и доступов',
        actions: [
          { action: 'read', label: 'Список сотрудников' },
          { action: 'create', label: 'Создание' },
          { action: 'update', label: 'Редактирование' },
          { action: 'delete', label: 'Блокировка/удаление' },
        ],
      },
      {
        key: 'map',
        label: 'Карта и GPS-мониторинг',
        description: '3D/2D карта, трекинг перемещений, контроль чекинов и маршруты',
        actions: [
          { action: 'read', label: 'Мониторинг на карте' },
          { action: 'assign_routes', label: 'Назначение маршрутов' },
          { action: 'view_tracks', label: 'История треков' },
        ],
      },
      {
        key: 'photo_reports',
        label: 'Фотоконтроль полок и визитов',
        description: 'Фотоотчеты планограмм, выкладки и чекинов в торговых точках',
        actions: [
          { action: 'read', label: 'Просмотр фото' },
          { action: 'verify', label: 'Модерация/одобрение' },
          { action: 'delete', label: 'Удаление фото' },
        ],
      },
      {
        key: 'tasks',
        label: 'Задачи и Чек-листы',
        description: 'Поручения супервайзеров, контроль дедлайнов и отчеты агентов',
        actions: [
          { action: 'read', label: 'Просмотр задач' },
          { action: 'create', label: 'Постановка задач' },
          { action: 'update', label: 'Отметка о выполнении' },
          { action: 'delete', label: 'Удаление' },
        ],
      },
    ],
  },
  {
    category: 'Финансы и Зарплаты',
    icon: Coins,
    modules: [
      {
        key: 'payments',
        label: 'Оплаты и Касса',
        description: 'Прием платежей, инкассация торговых представителей, акты сверки',
        actions: [
          { action: 'read', label: 'Реестр оплат' },
          { action: 'create', label: 'Прием платежа' },
          { action: 'update', label: 'Редактирование' },
          { action: 'delete', label: 'Удаление' },
          { action: 'collect', label: 'Инкассация в полях' },
          { action: 'reconcile', label: 'Акты сверки' },
          { action: 'export', label: 'Экспорт кассы' },
        ],
      },
      {
        key: 'salary',
        label: 'Зарплаты и Мотивация',
        description: 'Авторасчет окладов, бонусов за планы, штрафов и печать листков А4',
        actions: [
          { action: 'read', label: 'Просмотр ведомости' },
          { action: 'recalculate', label: 'Пересчет премий' },
          { action: 'pay', label: 'Выплата зарплаты' },
          { action: 'manage_kpi', label: 'Настройка окладов/планов' },
          { action: 'view_all', label: 'Все сотрудники (vs только себя)' },
          { action: 'export', label: 'Экспорт ведомости' },
        ],
      },
    ],
  },
  {
    category: 'Управление и Маркетинг',
    icon: Settings,
    modules: [
      {
        key: 'branches',
        label: 'Филиалы компании',
        description: 'Региональные подразделения, склады привязки и локации',
        actions: [
          { action: 'read', label: 'Просмотр филиалов' },
          { action: 'create', label: 'Создание' },
          { action: 'update', label: 'Редактирование' },
          { action: 'delete', label: 'Удаление' },
        ],
      },
      {
        key: 'roles',
        label: 'Управление ролями и доступом',
        description: 'Настройка матрицы разрешений, системные и кастомные роли',
        actions: [
          { action: 'read', label: 'Просмотр матрицы' },
          { action: 'create', label: 'Создание ролей' },
          { action: 'update', label: 'Изменение прав' },
          { action: 'delete', label: 'Удаление ролей' },
        ],
      },
      {
        key: 'smm',
        label: 'Маркетинг и SMM-панель',
        description: 'Продвижение в соцсетях, баллы активности, репосты и отзывы',
        actions: [
          { action: 'read', label: 'Просмотр заданий' },
          { action: 'create', label: 'Создание' },
          { action: 'update', label: 'Редактирование' },
          { action: 'delete', label: 'Удаление' },
          { action: 'submit', label: 'Сдача отчетов' },
          { action: 'moderate', label: 'Модерация баллов' },
        ],
      },
      {
        key: 'feedbacks',
        label: 'Обратная связь и Баг-репорты',
        description: 'Обращения сотрудников, запросы на доработку и сообщения об ошибках',
        actions: [
          { action: 'read', label: 'Просмотр тикетов' },
          { action: 'respond', label: 'Ответ на тикеты' },
          { action: 'delete', label: 'Удаление' },
        ],
      },
    ],
  },
];

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Role State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const loadRoles = async () => {
    try {
      const response = await api.get('/roles');
      setRoles(response.data || []);
      if (response.data && response.data.length > 0) {
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
      const defaultPerms: Record<string, string[]> = {};
      PERMISSION_STRUCTURE.forEach((cat) => {
        cat.modules.forEach((m) => {
          defaultPerms[m.key] = ['read'];
        });
      });

      const response = await api.post('/roles', {
        name: newRoleName.trim().toUpperCase(),
        description: newRoleDesc.trim(),
        permissions: defaultPerms,
      });

      setNewRoleName('');
      setNewRoleDesc('');
      setShowAddModal(false);
      await loadRoles();
      if (response.data) {
        setSelectedRole(response.data);
      }
    } catch (err) {
      console.error('Failed to create custom role', err);
      alert('Ошибка при создании роли. Убедитесь, что системное имя уникально.');
    }
  };

  const handleTogglePermission = (moduleKey: string, action: string) => {
    if (!selectedRole) return;

    const currentPerms = { ...selectedRole.permissions };
    const modulePerms = currentPerms[moduleKey] ? [...currentPerms[moduleKey]] : [];

    if (modulePerms.includes(action)) {
      currentPerms[moduleKey] = modulePerms.filter((a) => a !== action);
    } else {
      currentPerms[moduleKey] = [...modulePerms, action];
    }

    setSelectedRole({
      ...selectedRole,
      permissions: currentPerms,
    });
  };

  const handleSelectAllForModule = (moduleKey: string, actions: PermissionAction[]) => {
    if (!selectedRole) return;
    const currentPerms = { ...selectedRole.permissions };
    currentPerms[moduleKey] = actions.map((a) => a.action);
    setSelectedRole({
      ...selectedRole,
      permissions: currentPerms,
    });
  };

  const handleClearAllForModule = (moduleKey: string) => {
    if (!selectedRole) return;
    const currentPerms = { ...selectedRole.permissions };
    currentPerms[moduleKey] = [];
    setSelectedRole({
      ...selectedRole,
      permissions: currentPerms,
    });
  };

  const handlePresetFullAccess = () => {
    if (!selectedRole) return;
    const allPerms: Record<string, string[]> = {};
    PERMISSION_STRUCTURE.forEach((cat) => {
      cat.modules.forEach((m) => {
        allPerms[m.key] = m.actions.map((a) => a.action);
      });
    });
    setSelectedRole({
      ...selectedRole,
      permissions: allPerms,
    });
  };

  const handlePresetReadOnly = () => {
    if (!selectedRole) return;
    const readOnlyPerms: Record<string, string[]> = {};
    PERMISSION_STRUCTURE.forEach((cat) => {
      cat.modules.forEach((m) => {
        readOnlyPerms[m.key] = ['read'];
      });
    });
    setSelectedRole({
      ...selectedRole,
      permissions: readOnlyPerms,
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await api.put(`/roles/${selectedRole.id}`, {
        description: selectedRole.description,
        permissions: selectedRole.permissions,
      });
      await loadRoles();
      alert('Права доступа успешно сохранены и применены в системе!');
    } catch (err) {
      console.error('Failed to save permissions matrix', err);
      alert('Не удалось сохранить изменения прав доступа.');
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
      alert('Не удалось удалить роль. Убедитесь, что к ней не привязаны активные сотрудники.');
    }
  };

  // Filtered permission structure based on search
  const filteredStructure = useMemo(() => {
    if (!searchQuery.trim()) return PERMISSION_STRUCTURE;
    const q = searchQuery.toLowerCase();

    return PERMISSION_STRUCTURE.map((cat) => {
      const filteredModules = cat.modules.filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          m.key.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.actions.some((a) => a.label.toLowerCase().includes(q) || a.action.toLowerCase().includes(q))
      );
      return {
        ...cat,
        modules: filteredModules,
      };
    }).filter((cat) => cat.modules.length > 0);
  }, [searchQuery]);

  // Statistics for selected role
  const totalStats = useMemo(() => {
    let totalActions = 0;
    let activeActions = 0;
    PERMISSION_STRUCTURE.forEach((cat) => {
      cat.modules.forEach((m) => {
        totalActions += m.actions.length;
        const currentActive = selectedRole?.permissions[m.key] || [];
        activeActions += currentActive.filter((act) => m.actions.some((a) => a.action === act)).length;
      });
    });
    return { total: totalActions, active: activeActions };
  }, [selectedRole]);

  const isOwner = selectedRole?.name === 'OWNER';

  if (loading) {
    return (
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#f4f6fa] h-full p-4 lg:p-8 gap-6 animate-pulse">
        <div className="w-full lg:w-80 flex flex-col bg-white border border-[#e3e3e8] rounded-2xl p-4 flex-shrink-0 shadow-sm space-y-3">
          <div className="flex justify-between items-center mb-2">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="w-7 h-7 rounded-lg bg-slate-200"></div>
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-3 rounded-xl border border-slate-100 bg-white space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-28 bg-slate-200 rounded"></div>
                <div className="h-4 w-16 bg-slate-100 rounded"></div>
              </div>
              <div className="h-2.5 w-36 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col bg-white border border-[#e3e3e8] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#e3e3e8] bg-slate-50/50 flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-5 w-40 bg-slate-200 rounded"></div>
              <div className="h-3 w-64 bg-slate-100 rounded"></div>
            </div>
            <div className="h-8 w-28 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#f4f6fa] dark:bg-[#1a1a1a] h-full p-3 sm:p-5 lg:p-8 gap-5 relative">
      {/* Left Pane - Roles List */}
      <div
        className={`w-full lg:w-80 flex flex-col bg-white dark:bg-[#222] border border-[#e3e3e8] dark:border-[#333] rounded-2xl p-4 flex-shrink-0 shadow-sm overflow-hidden ${
          selectedRole ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="flex justify-between items-center mb-3 flex-shrink-0">
          <div>
            <h3 className="text-xs font-bold text-[#86868b] dark:text-[#999] uppercase tracking-wider">Роли в системе</h3>
            <span className="text-[10px] text-slate-400 font-medium">Всего: {roles.length} ролей</span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-sm flex items-center justify-center transition-all"
            title="Создать кастомную роль"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {roles.map((role) => {
            const isSelected = selectedRole?.id === role.id;
            const displayTitle = role.description || role.name;
            return (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#0071e3]/10 border-[#0071e3] text-[#0071e3] dark:bg-[#0071e3]/20 shadow-xs'
                    : 'bg-white dark:bg-[#262626] border-[#e3e3e8] dark:border-[#333] text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-slate-50 dark:hover:bg-[#2e2e2e]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-xs truncate tracking-wide">{displayTitle}</span>
                  {role.isSystem ? (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase bg-slate-100 dark:bg-[#333] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" /> Системная
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex-shrink-0">
                      Кастомная
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#86868b] font-mono">
                  <span>{role.name}</span>
                  {role.name === 'OWNER' && <span className="text-amber-500 font-bold">★ Bypass</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Pane - Permissions Grid */}
      {selectedRole ? (
        <div className="flex-1 flex flex-col bg-white dark:bg-[#222] border border-[#e3e3e8] dark:border-[#333] rounded-2xl shadow-sm overflow-hidden w-full">
          {/* Header */}
          <div className="p-5 border-b border-[#e3e3e8] dark:border-[#333] flex flex-col gap-4 bg-slate-50/60 dark:bg-[#262626] flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedRole(null)}
                  className="lg:hidden px-3 py-1.5 rounded-lg border border-[#e3e3e8] dark:border-[#444] text-xs font-bold text-[#5f6368] dark:text-[#aaa] bg-white dark:bg-[#333] hover:bg-slate-50 self-start mb-2"
                >
                  ← К списку ролей
                </button>

                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wide">
                    {selectedRole.name}
                  </h2>
                  <span
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase ${
                      selectedRole.isSystem
                        ? 'bg-slate-100 dark:bg-[#333] text-slate-700 dark:text-slate-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {selectedRole.isSystem ? 'Системная' : 'Кастомная'}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-[#0071e3] border border-blue-200 dark:border-blue-800 rounded-md">
                    {totalStats.active} из {totalStats.total} прав
                  </span>
                </div>

                <input
                  type="text"
                  disabled={selectedRole.isSystem}
                  value={selectedRole.description || ''}
                  onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                  placeholder="Описание обязанностей роли..."
                  className="text-xs text-[#5f6368] dark:text-[#aaa] bg-transparent border-b border-transparent hover:border-[#e3e3e8] focus:border-[#0071e3] focus:outline-none transition-all py-0.5 w-80 max-w-full font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {!selectedRole.isSystem && (
                  <button
                    onClick={handleDeleteRole}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl transition-all"
                  >
                    <Trash className="w-3.5 h-3.5" /> Удалить
                  </button>
                )}

                <button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl shadow-sm transition-all"
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

            {/* Quick Presets & Search */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-[#e3e3e8] dark:border-[#333]">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по правам и модулям..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border border-[#e3e3e8] dark:border-[#444] rounded-lg focus:outline-none focus:border-[#0071e3] text-[#1d1d1f] dark:text-[#f5f5f7]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Пресеты:</span>
                <button
                  type="button"
                  onClick={handlePresetFullAccess}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#e3e3e8] dark:border-[#444] bg-white dark:bg-[#333] hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1"
                >
                  <Unlock className="w-3 h-3 text-emerald-500" /> Полный доступ
                </button>
                <button
                  type="button"
                  onClick={handlePresetReadOnly}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#e3e3e8] dark:border-[#444] bg-white dark:bg-[#333] hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1"
                >
                  <Eye className="w-3 h-3 text-blue-500" /> Только чтение
                </button>
              </div>
            </div>
          </div>

          {/* Special Banner for OWNER role */}
          {isOwner && (
            <div className="m-5 mb-0 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-amber-900 dark:text-amber-200 text-xs font-medium">
              <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <strong>Системная роль Владельца (OWNER Bypass Access):</strong> Обладает полным доступом ко всем модулям, финансовым показателям и операциям платформы по умолчанию для обеспечения непрерывности бизнес-процессов.
              </div>
            </div>
          )}

          {/* Matrix Checklist */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs font-medium">
            {filteredStructure.map((cat, catIdx) => {
              const CategoryIcon = cat.icon;
              return (
                <div key={catIdx} className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-[#f1f1f4] dark:border-[#333]">
                    <CategoryIcon className="w-4 h-4 text-[#0071e3]" />
                    <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                      {cat.category}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-normal">({cat.modules.length} модулей)</span>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                    {cat.modules.map((mod) => {
                      const activeActions = selectedRole.permissions[mod.key] || [];
                      const isAllSelected = mod.actions.every((a) => activeActions.includes(a.action));
                      const isNoneSelected = activeActions.length === 0;

                      return (
                        <div
                          key={mod.key}
                          className="p-4 rounded-xl border border-[#e3e3e8] dark:border-[#333] hover:border-slate-300 bg-white dark:bg-[#282828] shadow-xs flex flex-col justify-between gap-3 transition-all"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <div>
                                <span className="font-bold text-xs text-[#1d1d1f] dark:text-[#f5f5f7] block">
                                  {mod.label}
                                </span>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                  {mod.description}
                                </p>
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono px-1.5 py-0.5 bg-slate-50 dark:bg-[#333] rounded">
                                {mod.key}
                              </span>
                            </div>

                            {/* Module Quick Actions: Select All / Clear */}
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-[#333]">
                              <button
                                type="button"
                                onClick={() => handleSelectAllForModule(mod.key, mod.actions)}
                                disabled={isAllSelected}
                                className={`text-[10px] font-semibold flex items-center gap-0.5 transition-all ${
                                  isAllSelected ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-[#0071e3] hover:underline'
                                }`}
                              >
                                <CheckCheck className="w-3 h-3" /> Выбрать всё
                              </button>
                              <span className="text-slate-300 dark:text-slate-600 text-[10px]">•</span>
                              <button
                                type="button"
                                onClick={() => handleClearAllForModule(mod.key)}
                                disabled={isNoneSelected}
                                className={`text-[10px] font-semibold flex items-center gap-0.5 transition-all ${
                                  isNoneSelected ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-rose-500 hover:underline'
                                }`}
                              >
                                <XCircle className="w-3 h-3" /> Снять
                              </button>
                            </div>
                          </div>

                          {/* Action Badges */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {mod.actions.map((act) => {
                              const isChecked = activeActions.includes(act.action);
                              return (
                                <button
                                  key={act.action}
                                  onClick={() => handleTogglePermission(mod.key, act.action)}
                                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                                    isChecked
                                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-[#0071e3] dark:text-blue-300 shadow-xs'
                                      : 'bg-slate-50 dark:bg-[#333] border-[#e3e3e8] dark:border-[#444] text-[#5f6368] dark:text-[#aaa] hover:bg-slate-100'
                                  }`}
                                  title={`Код действия: ${act.action}`}
                                >
                                  {isChecked && <Check className="w-3 h-3 text-[#0071e3] dark:text-blue-300" />}
                                  <span>{act.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#222] border border-[#e3e3e8] dark:border-[#333] rounded-2xl">
          <p className="text-xs text-[#86868b] font-bold">Выберите роль из списка слева для управления правами</p>
        </div>
      )}

      {/* Add Custom Role Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#222] border border-[#e3e3e8] dark:border-[#333] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn relative text-[#1d1d1f] dark:text-[#f5f5f7]">
            <h3 className="text-sm font-bold mb-4">Создать кастомную роль</h3>

            <form onSubmit={handleCreateRole} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold text-[#86868b] dark:text-[#999] uppercase tracking-wider mb-1.5">
                  Системный код роли (латиница капсом)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: REGIONAL_LEAD"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value.replace(/[^A-Za-z_]/g, ''))}
                  className="w-full bg-[#fbfbfa] dark:bg-[#1a1a1a] border border-[#e9e9e7] dark:border-[#444] rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-[#0071e3] transition-all text-[#37352f] dark:text-[#f5f5f7]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#86868b] dark:text-[#999] uppercase tracking-wider mb-1.5">
                  Понятное описание обязанностей
                </label>
                <textarea
                  placeholder="Опишите, за что отвечает данная должность..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#fbfbfa] dark:bg-[#1a1a1a] border border-[#e9e9e7] dark:border-[#444] rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-[#0071e3] transition-all text-[#37352f] dark:text-[#f5f5f7]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-[#e3e3e8] dark:border-[#444] hover:bg-[#f8f9fa] dark:hover:bg-[#333] font-bold text-[#5f6368] dark:text-[#aaa] transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold shadow-md shadow-[#0071e3]/20 transition-all"
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
