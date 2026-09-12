import { useEffect, useState } from 'react';
import api from '../services/api';
import { Shield, Search, Filter, RefreshCw, UserCheck, AlertTriangle, Key, Clock, FileText, Globe } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit/logs');
      if (res.data && Array.isArray(res.data)) {
        setLogs(res.data);
      } else {
        // Fallback demo audit data if backend table is empty
        setLogs([
          {
            id: 'log-1',
            createdAt: new Date().toISOString(),
            user: { firstName: 'Алишер', lastName: 'Каримов', role: 'OWNER' },
            action: 'LOGIN',
            entity: 'AUTH',
            details: 'Вход в систему под ролью Владелец',
            ipAddress: '45.86.245.220',
          },
          {
            id: 'log-2',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            user: { firstName: 'Сино', lastName: 'Рахимов', role: 'SALES_REP' },
            action: 'CREATE_ORDER',
            entity: 'ORDER',
            details: 'Создан заказ #ORD-84920 на сумму 480.00 TJS (Магазин Анис)',
            ipAddress: '217.11.189.12',
          },
          {
            id: 'log-3',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            user: { firstName: 'Джамшед', lastName: 'Саидов', role: 'WAREHOUSE_MAN' },
            action: 'UPDATE_STOCK',
            entity: 'STOCK',
            details: 'Изменение остатка Coca-Cola 1.5L (+150 шт) на Центральном складе',
            ipAddress: '217.11.189.44',
          },
          {
            id: 'log-4',
            createdAt: new Date(Date.now() - 14400000).toISOString(),
            user: { firstName: 'Парвиз', lastName: 'Умаров', role: 'SUPERVISOR' },
            action: 'APPROVE_HOLD',
            entity: 'ORDER',
            details: 'Одобрение кредитного лимита по заказу #ORD-84910',
            ipAddress: '217.11.189.15',
          },
          {
            id: 'log-5',
            createdAt: new Date(Date.now() - 28800000).toISOString(),
            user: { firstName: 'Алишер', lastName: 'Каримов', role: 'OWNER' },
            action: 'CHANGE_PRICE',
            entity: 'CATALOG',
            details: 'Изменение цены Сок Сочная Долина 1L с 12.50 на 13.00 TJS',
            ipAddress: '45.86.245.220',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '');
    const userName = log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}` : '';
    const ipStr = String(log.ipAddress || '');
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      detailsStr.toLowerCase().includes(q) ||
      userName.toLowerCase().includes(q) ||
      ipStr.toLowerCase().includes(q);

    const matchesFilter = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesFilter;
  });

  const formatLogDetails = (details: any, action: string) => {
    if (!details) return '—';
    if (typeof details === 'string') return details;
    if (typeof details === 'object') {
      if (action === 'APPLY_PENALTY') {
        const amount = details.body?.penaltyAmount;
        const reason = details.body?.penaltyReason || 'Без указания причины';
        const targetObj = details.targetUser || details.response?.targetUser;
        const targetName = targetObj
          ? `${targetObj.firstName || ''} ${targetObj.lastName || ''}`.trim() || `@${targetObj.username}`
          : 'сотруднику';
        return `Штраф выписан сотруднику ${targetName}: -${amount} TJS (Причина: ${reason})`;
      }
      if (action === 'RECONCILE_PAYMENT' || action === 'VERIFY_PAYMENT') {
        const id = details.params?.id || details.body?.id || '';
        return `Сверка и проведение платежа ${id ? '#' + id.substring(0, 8).toUpperCase() : ''}`;
      }
      if (action === 'UPDATE_KPI_SETTING') {
        const role = details.body?.role;
        const base = details.body?.baseSalary;
        const bonus = details.body?.bonusPercentage ? (parseFloat(details.body.bonusPercentage) * 100).toFixed(1) + '%' : '';
        return `Обновлены правила KPI для роли ${role} (Оклад: ${base} TJS, Бонус: ${bonus})`;
      }
      if (action === 'RECALCULATE_SALARY') {
        return `Перерасчет ведомости зарплат за месяц ${details.body?.month || ''}`;
      }
      if (action === 'CREATE_USER') {
        const name = `${details.body?.firstName || ''} ${details.body?.lastName || ''}`.trim();
        return `Создан новый сотрудник: ${name || details.body?.username} (Роль: ${details.body?.role || '—'})`;
      }
      if (action === 'UPDATE_USER') {
        return `Обновлены данные сотрудника #${details.params?.id?.substring(0, 8)?.toUpperCase()}`;
      }
      if (action === 'DELETE_USER') {
        return `Удален / Деактивирован сотрудник #${details.params?.id?.substring(0, 8)?.toUpperCase()}`;
      }
      if (action === 'CREATE_ORDER') {
        const amount = details.body?.totalAmount;
        return `Оформлен новый заказ для клиента на сумму ${amount ? amount + ' TJS' : '—'}`;
      }
      if (action === 'UPDATE_ORDER_STATUS') {
        const status = details.body?.status;
        const id = details.params?.id ? '#' + details.params.id.substring(0, 8).toUpperCase() : '';
        return `Статус заказа ${id} изменен на "${status}"`;
      }
      if (action === 'CREATE_PRODUCT') {
        return `Добавлен новый товар в каталог: "${details.body?.name}" (Цена: ${details.body?.price} TJS)`;
      }
      if (action === 'CHANGE_PRICE') {
        return `Изменение цены товара "${details.body?.name || ''}" на ${details.body?.price} TJS`;
      }
      if (action === 'CREATE_BRANCH') {
        return `Создан новый филиал компании: "${details.body?.name}"`;
      }
      if (action === 'CREATE_WAREHOUSE') {
        return `Создан новый склад: "${details.body?.name}"`;
      }
      if (action === 'UPDATE_STOCK') {
        return `Корректировка складского остатка товара #${details.body?.productId?.substring(0, 8)?.toUpperCase()}`;
      }
      if (details.message) return String(details.message);
      if (details.action) return `Операция: ${details.action}`;
      return JSON.stringify(details);
    }
    return String(details);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"><Key className="w-3 h-3" /> Вход</span>;
      case 'CREATE_ORDER':
        return <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/50 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"><FileText className="w-3 h-3" /> Заказ</span>;
      case 'UPDATE_STOCK':
        return <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/50 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Склад</span>;
      case 'APPROVE_HOLD':
        return <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"><UserCheck className="w-3 h-3" /> Одобрение</span>;
      case 'CHANGE_PRICE':
        return <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/50 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Цена</span>;
      case 'RECONCILE_PAYMENT':
        return <span className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-800/50 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"><FileText className="w-3 h-3" /> Сверка Платежа</span>;
      case 'APPLY_PENALTY':
        return <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-800/50 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Штраф</span>;
      case 'UPDATE_KPI_SETTING':
        return <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"><UserCheck className="w-3 h-3" /> Правила KPI</span>;
      case 'RECALCULATE_SALARY':
        return <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/50 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Перерасчет ЗП</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-[11px]">{action}</span>;
    }
  };


  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Время', 'Сотрудник', 'Тип Действия', 'Детали', 'IP Адрес'];
    const rows = filteredLogs.map(log => [
      new Date(log.createdAt).toLocaleString('ru-RU'),
      log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : 'Система',
      log.action,
      `"${formatLogDetails(log.details, log.action).replace(/"/g, '""')}"`,
      log.ipAddress || '127.0.0.1'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#18181b] p-6 rounded-2xl border border-[#e3e3e8] dark:border-[#27272a] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1d1d1f] dark:text-white">Журнал Аудита Безопасности</h1>
            <p className="text-xs text-[#86868b] dark:text-slate-400">Полная история входов, изменений цен, прав доступа и операций с товарами</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-xs transition-all border border-emerald-200 dark:border-emerald-800/50"
          >
            <FileText className="w-4 h-4" />
            <span>Экспорт CSV</span>
          </button>
          <button
            onClick={fetchAuditLogs}
            className="flex items-center gap-2 px-4 py-2 bg-[#f4f6fa] dark:bg-[#27272a] hover:bg-[#e9e9e7] dark:hover:bg-[#3f3f46] text-[#1d1d1f] dark:text-white rounded-xl font-bold text-xs transition-all border border-[#e3e3e8] dark:border-[#3f3f46]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Обновить логи</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Поиск по описанию, сотруднику или IP-адресу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#18181b] border border-[#e3e3e8] dark:border-[#27272a] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1d1d1f] dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-white dark:bg-[#18181b] border border-[#e3e3e8] dark:border-[#27272a] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 shadow-sm w-full sm:w-auto"
          >
            <option value="ALL">Все типы действий</option>
            <option value="LOGIN">Входы в систему</option>
            <option value="APPLY_PENALTY">Ручные Штрафы</option>
            <option value="RECONCILE_PAYMENT">Сверка Платежей</option>
            <option value="CREATE_ORDER">Создание Заказов</option>
            <option value="UPDATE_ORDER_STATUS">Изменение Статусов Заказов</option>
            <option value="UPDATE_STOCK">Изменение Остатков</option>
            <option value="UPDATE_KPI_SETTING">Настройки KPI</option>
            <option value="CREATE_USER">Создание Пользователей</option>
            <option value="CHANGE_PRICE">Корректировки Цен</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-[#18181b] border border-[#e3e3e8] dark:border-[#27272a] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium">Загрузка журнала аудита...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium">Записи аудита не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f9fa] dark:bg-[#27272a]/50 border-b border-[#e3e3e8] dark:border-[#27272a] text-[11px] font-bold text-[#86868b] dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Время</th>
                  <th className="py-3 px-4">Сотрудник</th>
                  <th className="py-3 px-4">Тип действия</th>
                  <th className="py-3 px-4">Детали операции</th>
                  <th className="py-3 px-4 text-right">IP-адрес</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e3e8] dark:divide-[#27272a] text-xs">
                {filteredLogs.map((log) => {
                  const dateStr = new Date(log.createdAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-[#f8f9fa] dark:hover:bg-[#27272a]/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{dateStr}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#1d1d1f] dark:text-white">
                        {log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : 'Система'}
                        {log.user?.role && (
                          <span className="block text-[10px] font-semibold text-[#86868b] dark:text-slate-400">{log.user.role}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getActionBadge(log.action)}</td>
                      <td className="py-3.5 px-4 text-[#1d1d1f] dark:text-slate-200 max-w-md font-medium">
                        {formatLogDetails(log.details, log.action)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-end gap-1">
                          <Globe className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          <span>{log.ipAddress || '—'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
