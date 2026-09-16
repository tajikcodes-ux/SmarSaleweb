import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Table as TableIcon, 
  PieChart as PieIcon, 
  Download, 
  Printer, 
  RefreshCw, 
  ChevronRight, 
  ChevronDown, 
  Sliders, 
  Calendar, 
  Check, 
  Plus, 
  X, 
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import api from '../services/api';

interface MetricDef {
  code: string;
  name: string;
  format: 'currency' | 'number' | 'percent';
}

interface DimensionDef {
  code: string;
  name: string;
  category: 'team' | 'clients' | 'products' | 'logistics' | 'time';
}

interface Preset {
  id: string;
  name: string;
  description: string;
  rows: string[];
  columns: string[];
  values: string[];
}

export default function ReportConstructor() {
  const [meta, setMeta] = useState<{ dimensions: DimensionDef[]; metrics: MetricDef[] }>({
    dimensions: [
      { code: 'salesRep', name: 'Торговый представитель', category: 'team' },
      { code: 'client', name: 'Клиент / Торговая точка', category: 'clients' },
      { code: 'category', name: 'Категория товара / Бренд', category: 'products' },
      { code: 'product', name: 'Товар (SKU)', category: 'products' },
      { code: 'warehouse', name: 'Склад отгрузки', category: 'logistics' },
      { code: 'date', name: 'Дата заказа (день)', category: 'time' },
      { code: 'paymentType', name: 'Тип оплаты', category: 'logistics' },
      { code: 'status', name: 'Статус заказа', category: 'logistics' },
    ],
    metrics: [
      { code: 'totalAmount', name: 'Выручка (TJS)', format: 'currency' },
      { code: 'orderCount', name: 'Число заказов', format: 'number' },
      { code: 'totalQuantity', name: 'Количество (шт)', format: 'number' },
      { code: 'avgCheck', name: 'Средний чек (TJS)', format: 'currency' },
      { code: 'acb', name: 'АКБ (Активные точки)', format: 'number' },
      { code: 'okb', name: 'ОКБ (Всего точек)', format: 'number' },
      { code: 'acbIndex', name: 'Индекс АКБ (%)', format: 'percent' },
      { code: 'grossProfit', name: 'Валовая прибыль (TJS)', format: 'currency' },
      { code: 'marginPercent', name: 'Рентабельность (%)', format: 'percent' },
    ],
  });

  const presets: Preset[] = [
    {
      id: 'daily',
      name: '📊 Ежедневный отчет РОПа',
      description: 'Выручка, чеки и средний чек по торговым агентам',
      rows: ['salesRep'],
      columns: [],
      values: ['totalAmount', 'orderCount', 'avgCheck'],
    },
    {
      id: 'acb',
      name: '📍 Анализ АКБ и Покрытия',
      description: 'Оценка активной (АКБ) и общей (ОКБ) базы с процентом покрытия',
      rows: ['salesRep'],
      columns: [],
      values: ['acb', 'okb', 'acbIndex', 'totalAmount'],
    },
    {
      id: 'sku',
      name: '📦 Движение по SKU и Брендам',
      description: 'Продажи товаров по брендам и категориям',
      rows: ['category', 'product'],
      columns: [],
      values: ['totalQuantity', 'totalAmount'],
    },
    {
      id: 'clients',
      name: '👥 Продажи по Клиентам',
      description: 'Отгрузки клиентам с детализацией по агентам',
      rows: ['salesRep', 'client'],
      columns: [],
      values: ['totalAmount', 'orderCount'],
    },
    {
      id: 'warehouse',
      name: '🚚 Сводка по Складам',
      description: 'Отгрузки в разрезе складов и статусов доставки',
      rows: ['warehouse', 'status'],
      columns: [],
      values: ['orderCount', 'totalAmount'],
    },
  ];

  // Active query state
  const [activePreset, setActivePreset] = useState<string>('daily');
  const [selectedRows, setSelectedRows] = useState<string[]>(['salesRep']);
  const [selectedValues, setSelectedValues] = useState<string[]>(['totalAmount', 'orderCount', 'avgCheck']);
  
  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // View Mode: table | bar | pie
  const [viewMode, setViewMode] = useState<'table' | 'bar' | 'pie'>('table');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Data & Loading
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Drilldown Drawer State
  const [drilldown, setDrilldown] = useState<{ open: boolean; title: string; orders: any[]; loading: boolean }>({
    open: false,
    title: '',
    orders: [],
    loading: false,
  });

  const runReport = async (override?: { rows?: string[]; values?: string[] }) => {
    setLoading(true);
    try {
      const payload = {
        rows: override?.rows || selectedRows,
        values: override?.values || selectedValues,
        startDate,
        endDate,
      };
      const res = await api.post('/reports/builder', payload);
      setReportData(res.data);
    } catch (err) {
      console.error('Error running report query', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const res = await api.get('/reports/meta');
      if (res.data) setMeta(res.data);
    } catch (err) {
      console.error('Error loading report metadata', err);
    }
  };

  useEffect(() => {
    fetchMetadata();
    runReport();
  }, []);

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.id);
    setSelectedRows(preset.rows);
    setSelectedValues(preset.values);
    runReport({ rows: preset.rows, values: preset.values });
  };

  const toggleRowExpand = (rowName: string) => {
    setExpandedRows(prev => ({ ...prev, [rowName]: !prev[rowName] }));
  };

  const handleOpenDrilldown = async (dimCode: string, val: string) => {
    setDrilldown({ open: true, title: `${val}`, orders: [], loading: true });
    try {
      const res = await api.get('/reports/drilldown', {
        params: { dimension: dimCode, value: val, startDate, endDate },
      });
      setDrilldown({ open: true, title: `${val}`, orders: res.data || [], loading: false });
    } catch (err) {
      console.error('Error fetching drilldown', err);
      setDrilldown(prev => ({ ...prev, loading: false }));
    }
  };

  const formatMetricValue = (val: number, format: string) => {
    if (val === undefined || val === null) return '—';
    if (format === 'currency') {
      return `${val.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TJS`;
    }
    if (format === 'percent') {
      return `${val}%`;
    }
    return val.toLocaleString('ru-RU');
  };

  const exportToCSV = () => {
    if (!reportData || !reportData.rows) return;
    const header = ['Группировка', ...selectedValues.map(v => meta.metrics.find(m => m.code === v)?.name || v)];
    const lines = [header.join(';')];

    reportData.rows.forEach((r: any) => {
      const rowVals = [
        `"${r.name}"`,
        ...selectedValues.map(v => r.metrics[v] ?? 0),
      ];
      lines.push(rowVals.join(';'));

      if (r.subItems) {
        r.subItems.forEach((sub: any) => {
          const subVals = [
            `"  -> ${sub.name}"`,
            ...selectedValues.map(v => sub.metrics[v] ?? 0),
          ];
          lines.push(subVals.join(';'));
        });
      }
    });

    if (reportData.totals) {
      const totalLine = [
        '"ИТОГО ПО КОМПАНИИ"',
        ...selectedValues.map(v => reportData.totals[v] ?? 0),
      ];
      lines.push(totalLine.join(';'));
    }

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartsale_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const maxTotalAmount = useMemo(() => {
    if (!reportData?.rows?.length) return 1;
    return Math.max(...reportData.rows.map((r: any) => r.metrics?.totalAmount || 0), 1);
  }, [reportData]);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen text-slate-800 dark:text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Интеллектуальная Аналитика MBI</span>
          </div>
          <h1 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white flex items-center gap-2">
            Конструктор отчетов
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              SmartSale Pro
            </span>
          </h1>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsBuilderOpen(!isBuilderOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
              isBuilderOpen 
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border-indigo-300 dark:border-indigo-700' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Настроить поля</span>
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Экспорт CSV / Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Печать</span>
          </button>

          <button
            onClick={() => runReport()}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Preset Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1">
          Шаблоны:
        </span>
        {presets.map(p => {
          const isActive = activePreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`px-3.5 py-2 text-xs font-medium rounded-xl whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm font-semibold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Date Filter & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm mb-6">
        {/* Date Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Период:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-slate-400 text-xs">—</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={() => runReport()}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200"
          >
            Применить
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              viewMode === 'table' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm font-semibold' : 'text-slate-500'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Таблица</span>
          </button>
          <button
            onClick={() => setViewMode('bar')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              viewMode === 'bar' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm font-semibold' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>График</span>
          </button>
          <button
            onClick={() => setViewMode('pie')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              viewMode === 'pie' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm font-semibold' : 'text-slate-500'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Доли (%)</span>
          </button>
        </div>
      </div>

      {/* Builder Drawer / Configuration Panel */}
      {isBuilderOpen && (
        <div className="p-5 bg-gradient-to-b from-indigo-50/50 to-white dark:from-slate-800/80 dark:to-slate-800 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-md mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Настройка структуры отчета (OLAP Builder)</h3>
            </div>
            <button onClick={() => setIsBuilderOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rows Dimension Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-2">
                Группировка строк (Иерархия уровней):
              </label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedRows.map((r, idx) => {
                  const dim = meta.dimensions.find(d => d.code === r);
                  return (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-medium shadow-sm"
                    >
                      <span className="opacity-75 font-mono text-[10px]">#{idx + 1}</span>
                      {dim?.name || r}
                      {selectedRows.length > 1 && (
                        <button
                          onClick={() => setSelectedRows(selectedRows.filter(x => x !== r))}
                          className="hover:text-red-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-1 text-xs text-slate-500">
                <span className="py-1">Добавить уровень:</span>
                {meta.dimensions
                  .filter(d => !selectedRows.includes(d.code))
                  .map(d => (
                    <button
                      key={d.code}
                      onClick={() => setSelectedRows([...selectedRows, d.code])}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3 h-3 text-indigo-600" />
                      {d.name}
                    </button>
                  ))}
              </div>
            </div>

            {/* Metrics Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-2">
                Отображаемые показатели (Метрики):
              </label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {meta.metrics.map(m => {
                  const isSelected = selectedValues.includes(m.code);
                  return (
                    <button
                      key={m.code}
                      onClick={() => {
                        if (isSelected) {
                          if (selectedValues.length > 1) {
                            setSelectedValues(selectedValues.filter(x => x !== m.code));
                          }
                        } else {
                          setSelectedValues([...selectedValues, m.code]);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-slate-700 flex justify-end gap-2">
            <button
              onClick={() => {
                setIsBuilderOpen(false);
                runReport();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
            >
              Применить настройки
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Strip */}
      {reportData?.totals && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Общая Выручка</span>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {formatMetricValue(reportData.totals.totalAmount, 'currency')}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Оформлено заказов</span>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {reportData.totals.orderCount} <span className="text-xs font-normal text-slate-400">чеков</span>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Средний чек</span>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {formatMetricValue(reportData.totals.avgCheck, 'currency')}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Покрытие АКБ</span>
            <div className="text-lg font-bold text-emerald-600 mt-1 flex items-baseline gap-1.5">
              <span>{reportData.totals.acb}</span>
              <span className="text-xs font-normal text-slate-400">из {reportData.totals.okb} ({reportData.totals.acbIndex}%)</span>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Валовая прибыль</span>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {formatMetricValue(reportData.totals.grossProfit, 'currency')}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Построение отчета и расчет подитогов...</p>
        </div>
      ) : viewMode === 'table' ? (
        /* PIVOT CROSS-TABLE */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-6 min-w-[240px]">
                    {meta.dimensions.find(d => d.code === selectedRows[0])?.name || 'Группировка'}
                  </th>
                  {selectedValues.map(v => {
                    const m = meta.metrics.find(x => x.code === v);
                    return (
                      <th key={v} className="p-3.5 text-right whitespace-nowrap min-w-[130px]">
                        {m?.name || v}
                      </th>
                    );
                  })}
                  <th className="p-3.5 text-center w-24">Детали</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {reportData?.rows?.map((row: any, idx: number) => {
                  const isExpanded = !!expandedRows[row.name];
                  const sharePct = ((row.metrics.totalAmount / maxTotalAmount) * 100).toFixed(0);

                  return (
                    <React.Fragment key={row.name + idx}>
                      {/* Primary Row */}
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                        <td className="p-3.5 pl-6 font-medium text-slate-800 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            {row.subItems && row.subItems.length > 0 ? (
                              <button
                                onClick={() => toggleRowExpand(row.name)}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <span className="w-5" />
                            )}
                            <div className="flex-1">
                              <span className="font-bold text-slate-900 dark:text-white">{row.name}</span>
                              {/* Relative Progress bar */}
                              <div className="w-36 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                  style={{ width: `${sharePct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {selectedValues.map(v => {
                          const m = meta.metrics.find(x => x.code === v);
                          const val = row.metrics[v];
                          return (
                            <td key={v} className="p-3.5 text-right font-semibold whitespace-nowrap text-slate-700 dark:text-slate-200">
                              {formatMetricValue(val, m?.format || 'number')}
                            </td>
                          );
                        })}

                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleOpenDrilldown(selectedRows[0], row.name)}
                            title="Посмотреть накладные"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Sub-Rows if expanded */}
                      {isExpanded && row.subItems && row.subItems.map((sub: any, subIdx: number) => (
                        <tr key={sub.name + subIdx} className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400">
                          <td className="p-2.5 pl-14 font-normal text-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span>{sub.name}</span>
                          </td>
                          {selectedValues.map(v => {
                            const m = meta.metrics.find(x => x.code === v);
                            const val = sub.metrics[v];
                            return (
                              <td key={v} className="p-2.5 text-right text-xs font-medium">
                                {formatMetricValue(val, m?.format || 'number')}
                              </td>
                            );
                          })}
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleOpenDrilldown(selectedRows[1] || 'client', sub.name)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}

                {/* Grand Total Row */}
                {reportData?.totals && (
                  <tr className="bg-slate-100/80 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-600 font-bold text-slate-900 dark:text-white text-xs">
                    <td className="p-4 pl-6 uppercase tracking-wider">Итого по компании</td>
                    {selectedValues.map(v => {
                      const m = meta.metrics.find(x => x.code === v);
                      const val = reportData.totals[v];
                      return (
                        <td key={v} className="p-4 text-right whitespace-nowrap text-indigo-600 dark:text-indigo-400">
                          {formatMetricValue(val, m?.format || 'number')}
                        </td>
                      );
                    })}
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'bar' ? (
        /* BAR CHART VIEW */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Сравнение выручки ({meta.dimensions.find(d => d.code === selectedRows[0])?.name})</span>
          </h3>
          <div className="space-y-4">
            {reportData?.rows?.map((r: any) => {
              const pct = ((r.metrics.totalAmount / maxTotalAmount) * 100).toFixed(1);
              return (
                <div key={r.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-200">{r.name}</span>
                    <span className="text-indigo-600 font-bold">
                      {formatMetricValue(r.metrics.totalAmount, 'currency')}
                    </span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 dark:bg-slate-700/60 rounded-lg overflow-hidden flex items-center">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* DONUT / PIE SHARE VIEW */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-indigo-600" />
            <span>Долевое распределение продаж (%)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportData?.rows?.map((r: any) => {
              const totalCompany = reportData.totals?.totalAmount || 1;
              const share = ((r.metrics.totalAmount / totalCompany) * 100).toFixed(1);
              return (
                <div key={r.name} className="p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-white">{r.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatMetricValue(r.metrics.totalAmount, 'currency')}</p>
                  </div>
                  <div className="text-base font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    {share}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DRILLDOWN SIDEBAR DRAWER */}
      {drilldown.open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Drill-Down Детализация
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {drilldown.title}
                </h3>
              </div>
              <button
                onClick={() => setDrilldown({ open: false, title: '', orders: [], loading: false })}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {drilldown.loading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs">Загрузка накладных...</p>
                </div>
              ) : drilldown.orders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Накладные не найдены за выбранный период.
                </div>
              ) : (
                drilldown.orders.map((ord: any) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-indigo-600">№ {ord.id.slice(0, 8)}</span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                          {ord.client?.name || 'Клиент'}
                        </h4>
                        <p className="text-[11px] text-slate-400">{ord.client?.address || 'Без адреса'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {Number(ord.totalAmount).toFixed(2)} TJS
                        </span>
                        <span className="block text-[10px] font-semibold text-emerald-600 mt-0.5">
                          {ord.status}
                        </span>
                      </div>
                    </div>

                    {/* Items preview */}
                    {ord.items && ord.items.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 text-[11px] text-slate-500 space-y-0.5">
                        {ord.items.slice(0, 3).map((it: any) => (
                          <div key={it.id} className="flex justify-between">
                            <span>• {it.product?.name || 'Товар'}</span>
                            <span className="font-mono">x{it.quantity}</span>
                          </div>
                        ))}
                        {ord.items.length > 3 && (
                          <span className="text-[10px] text-indigo-500 font-medium">
                            + еще {ord.items.length - 3} позиций
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
