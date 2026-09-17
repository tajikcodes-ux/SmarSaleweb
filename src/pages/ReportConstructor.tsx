import React, { useState, useEffect, useMemo } from 'react';
import { 
  Table as TableIcon, 
  Printer, 
  RefreshCw, 
  ChevronRight, 
  ChevronDown, 
  Sliders, 
  Calendar, 
  Search,
  Layers,
  GripVertical,
  X, 
  Sparkles,
  ArrowUpDown,
  MoveRight,
  Coins,
  FileSpreadsheet,
  AlertCircle,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
  // Metadata definition with icons and categories
  const [meta] = useState<{ dimensions: DimensionDef[]; metrics: MetricDef[] }>({
    dimensions: [
      { code: 'salesRep', name: 'Торговый представитель', category: 'team' },
      { code: 'client', name: 'Клиент / Торговая точка', category: 'clients' },
      { code: 'category', name: 'Категория товара / Бренд', category: 'products' },
      { code: 'product', name: 'Товар (SKU)', category: 'products' },
      { code: 'warehouse', name: 'Склад отгрузки', category: 'logistics' },
      { code: 'date', name: 'Дата заказа (день)', category: 'time' },
      { code: 'paymentType', name: 'Тип оплаты (нал/безнал/долг)', category: 'logistics' },
      { code: 'status', name: 'Статус накладной', category: 'logistics' },
    ],
    metrics: [
      { code: 'totalAmount', name: 'Выручка (TJS)', format: 'currency' },
      { code: 'orderCount', name: 'Число заказов (чеков)', format: 'number' },
      { code: 'totalQuantity', name: 'Количество товаров (шт)', format: 'number' },
      { code: 'avgCheck', name: 'Средний чек (TJS)', format: 'currency' },
      { code: 'acb', name: 'АКБ (Активные точки)', format: 'number' },
      { code: 'okb', name: 'ОКБ (Всего точек)', format: 'number' },
      { code: 'acbIndex', name: 'Индекс АКБ (%)', format: 'percent' },
      { code: 'grossProfit', name: 'Оценочная маржа (TJS)', format: 'currency' },
      { code: 'marginPercent', name: 'Рентабельность (%)', format: 'percent' },
    ],
  });

  // Presets matching Smartup & Best Practices
  const presets: Preset[] = [
    {
      id: 'daily-rop',
      name: '📊 Ежедневный отчет РОПа',
      description: 'Сводка выручки, чеков и среднего чека в разрезе торговых агентов',
      rows: ['salesRep'],
      columns: [],
      values: ['totalAmount', 'orderCount', 'avgCheck'],
    },
    {
      id: 'matrix-daily',
      name: '📅 Матрица продаж по дням (2D)',
      description: 'Агенты по строкам, даты по столбцам (кросс-таблица выручки)',
      rows: ['salesRep'],
      columns: ['date'],
      values: ['totalAmount'],
    },
    {
      id: 'acb-coverage',
      name: '📍 Анализ АКБ и Покрытия',
      description: 'Оценка активной (АКБ) и общей (ОКБ) базы с процентом покрытия',
      rows: ['salesRep'],
      columns: [],
      values: ['acb', 'okb', 'acbIndex', 'totalAmount'],
    },
    {
      id: 'sku-brands',
      name: '📦 Движение по SKU и Брендам',
      description: 'Продажи товаров по брендам и категориям в штуках и суммах',
      rows: ['category', 'product'],
      columns: [],
      values: ['totalQuantity', 'totalAmount'],
    },
    {
      id: 'clients-matrix',
      name: '👥 Продажи по Клиентам и Оплате',
      description: 'Клиенты по строкам, тип оплаты (нал/безнал/долг) по колонкам',
      rows: ['salesRep', 'client'],
      columns: ['paymentType'],
      values: ['totalAmount'],
    },
  ];

  // Active constructor state
  const [activePreset, setActivePreset] = useState<string>('daily-rop');
  const [selectedRows, setSelectedRows] = useState<string[]>(['salesRep']);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>(['totalAmount', 'orderCount', 'avgCheck']);

  // Filters
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [searchField, setSearchField] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Drag and Drop state
  const [draggedItem, setDraggedItem] = useState<{ code: string; type: 'dim' | 'metric' } | null>(null);
  const [dragOverZone, setDragOverZone] = useState<'rows' | 'columns' | 'values' | null>(null);

  // Data & loading
  const [loading, setLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // View Mode: 'data' (Live Data) vs 'structure' (Smartup Layout Skeleton Preview)
  const [viewMode, setViewMode] = useState<'data' | 'structure'>('data');

  // Modal: A4 Print Preview
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  // Drilldown modal
  const [drilldown, setDrilldown] = useState<{
    open: boolean;
    title: string;
    orders: any[];
    loading: boolean;
  }>({ open: false, title: '', orders: [], loading: false });

  // Run report query
  const runReport = async (overrideParams?: { rows?: string[]; columns?: string[]; values?: string[] }) => {
    setLoading(true);
    try {
      const rows = overrideParams?.rows ?? selectedRows;
      const columns = overrideParams?.columns ?? selectedColumns;
      const values = overrideParams?.values ?? selectedValues;

      const res = await api.post('/reports/run', {
        rows,
        columns,
        values,
        startDate,
        endDate,
      });
      setReportData(res.data);
    } catch (err) {
      console.error('Error running report query', err);
    } finally {
      setLoading(false);
    }
  };

  // Live recalculation whenever rows, columns, values or dates change
  useEffect(() => {
    const timer = setTimeout(() => {
      runReport();
    }, 250);
    return () => clearTimeout(timer);
  }, [startDate, endDate, selectedRows, selectedColumns, selectedValues]);

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.id);
    setSelectedRows(preset.rows);
    setSelectedColumns(preset.columns);
    setSelectedValues(preset.values);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, code: string, type: 'dim' | 'metric') => {
    setDraggedItem({ code, type });
    e.dataTransfer.setData('text/plain', JSON.stringify({ code, type }));
  };

  const handleDragOver = (e: React.DragEvent, zone: 'rows' | 'columns' | 'values') => {
    e.preventDefault();
    if (dragOverZone !== zone) {
      setDragOverZone(zone);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(null);
  };

  const handleDrop = (e: React.DragEvent, targetZone: 'rows' | 'columns' | 'values') => {
    e.preventDefault();
    setDragOverZone(null);
    let item = draggedItem;
    if (!item) {
      try {
        item = JSON.parse(e.dataTransfer.getData('text/plain'));
      } catch (err) {
        return;
      }
    }
    if (!item) return;

    if (targetZone === 'rows') {
      if (item.type !== 'dim') return;
      if (!selectedRows.includes(item.code)) {
        setSelectedColumns(prev => prev.filter(c => c !== item.code));
        setSelectedRows(prev => [...prev, item.code]);
      }
    } else if (targetZone === 'columns') {
      if (item.type !== 'dim') return;
      if (!selectedColumns.includes(item.code)) {
        setSelectedRows(prev => prev.filter(r => r !== item.code));
        setSelectedColumns(prev => [...prev, item.code]);
      }
    } else if (targetZone === 'values') {
      if (item.type !== 'metric') return;
      if (!selectedValues.includes(item.code)) {
        setSelectedValues(prev => [...prev, item.code]);
      }
    }
    setDraggedItem(null);
  };

  // Click-to-add fallback
  const addDimensionTo = (code: string, target: 'rows' | 'columns') => {
    if (target === 'rows') {
      setSelectedColumns(prev => prev.filter(c => c !== code));
      if (!selectedRows.includes(code)) setSelectedRows(prev => [...prev, code]);
    } else {
      setSelectedRows(prev => prev.filter(r => r !== code));
      if (!selectedColumns.includes(code)) setSelectedColumns(prev => [...prev, code]);
    }
  };

  const toggleMetric = (code: string) => {
    if (selectedValues.includes(code)) {
      if (selectedValues.length > 1) {
        setSelectedValues(prev => prev.filter(v => v !== code));
      }
    } else {
      setSelectedValues(prev => [...prev, code]);
    }
  };

  const removeRow = (code: string) => {
    if (selectedRows.length > 1) {
      setSelectedRows(prev => prev.filter(r => r !== code));
    }
  };

  const removeColumn = (code: string) => {
    setSelectedColumns(prev => prev.filter(c => c !== code));
  };

  const removeValue = (code: string) => {
    if (selectedValues.length > 1) {
      setSelectedValues(prev => prev.filter(v => v !== code));
    }
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

  const formatMetricValue = (val: number | undefined, format: string) => {
    if (val === undefined || val === null) return '—';
    if (format === 'currency') {
      return `${val.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TJS`;
    }
    if (format === 'percent') {
      return `${val}%`;
    }
    return val.toLocaleString('ru-RU');
  };

  // EXCEL (.XLSX) EXPORT with auto-column widths and styled cells
  const exportToExcel = () => {
    if (!reportData || !reportData.rows) return;

    const wb = XLSX.utils.book_new();
    const rowsData: any[][] = [];

    const is2D = Boolean(reportData.columnDimension && reportData.columnKeys && reportData.columnKeys.length > 0);
    const rowDimName = meta.dimensions.find(d => d.code === selectedRows[0])?.name || 'Строка';
    const primaryMetric = selectedValues[0];

    if (is2D) {
      const colDimName = meta.dimensions.find(d => d.code === reportData.columnDimension)?.name || 'Столбец';
      
      const header = [
        `${rowDimName} \ ${colDimName}`,
        ...reportData.columnKeys,
        'ИТОГО ЗА ПЕРИОД',
      ];
      rowsData.push(header);

      reportData.rows.forEach((r: any) => {
        const rowVals = [
          r.name,
          ...reportData.columnKeys.map((cKey: string) => r.cells?.[cKey]?.[primaryMetric] ?? 0),
          r.metrics?.[primaryMetric] ?? 0,
        ];
        rowsData.push(rowVals);

        if (r.subItems) {
          r.subItems.forEach((sub: any) => {
            const subVals = [
              `   ↳ ${sub.name}`,
              ...reportData.columnKeys.map((cKey: string) => sub.cells?.[cKey]?.[primaryMetric] ?? 0),
              sub.metrics?.[primaryMetric] ?? 0,
            ];
            rowsData.push(subVals);
          });
        }
      });

      if (reportData.colTotals && reportData.totals) {
        const totalRow = [
          'ИТОГО ПО КОМПАНИИ',
          ...reportData.columnKeys.map((cKey: string) => reportData.colTotals?.[cKey]?.[primaryMetric] ?? 0),
          reportData.totals?.[primaryMetric] ?? 0,
        ];
        rowsData.push(totalRow);
      }
    } else {
      const header = [
        rowDimName,
        ...selectedValues.map(v => meta.metrics.find(m => m.code === v)?.name || v),
      ];
      rowsData.push(header);

      reportData.rows.forEach((r: any) => {
        const rowVals = [
          r.name,
          ...selectedValues.map(v => r.metrics?.[v] ?? 0),
        ];
        rowsData.push(rowVals);

        if (r.subItems) {
          r.subItems.forEach((sub: any) => {
            const subVals = [
              `   ↳ ${sub.name}`,
              ...selectedValues.map(v => sub.metrics?.[v] ?? 0),
            ];
            rowsData.push(subVals);
          });
        }
      });

      if (reportData.totals) {
        const totalRow = [
          'ИТОГО ПО КОМПАНИИ',
          ...selectedValues.map(v => reportData.totals?.[v] ?? 0),
        ];
        rowsData.push(totalRow);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rowsData);

    const colWidths = rowsData[0].map((_, colIndex) => {
      let maxLen = 12;
      for (let r = 0; r < rowsData.length; r++) {
        const val = rowsData[r][colIndex];
        const strLen = val ? String(val).length : 0;
        if (strLen > maxLen) maxLen = strLen;
      }
      return { wch: Math.min(Math.max(maxLen + 4, 15), 45) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Отчет MBI');
    XLSX.writeFile(wb, `smartsale_mbi_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // PRINT OFFICIAL A4 DOCUMENT
  const handlePrint = () => {
    window.print();
  };

  // Filtered dimensions & metrics for library search
  const filteredDimensions = useMemo(() => {
    return meta.dimensions.filter(d => {
      const matchCat = activeCategory === 'all' || d.category === activeCategory;
      const matchSearch = d.name.toLowerCase().includes(searchField.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [meta.dimensions, activeCategory, searchField]);

  const filteredMetrics = useMemo(() => {
    return meta.metrics.filter(m => {
      const matchCat = activeCategory === 'all' || activeCategory === 'metrics';
      const matchSearch = m.name.toLowerCase().includes(searchField.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [meta.metrics, activeCategory, searchField]);

  const is2DMatrix = Boolean(
    reportData &&
    reportData.columnDimension &&
    reportData.columnKeys &&
    reportData.columnKeys.length > 0
  );

  return (
    <div className="space-y-6">
      {/* PRINT-ONLY CSS INJECTION */}
      <style>{`
        @media print {
          /* Hide non-printable UI */
          header, aside, nav, .no-print, button, .lucide {
            display: none !important;
          }
          body, html, #root, main {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
          }
          #printable-report {
            display: block !important;
            width: 100% !important;
            padding: 10mm 15mm !important;
            box-sizing: border-box !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 11px !important;
            margin-top: 12px !important;
          }
          th, td {
            border: 1px solid #1f2937 !important;
            padding: 5px 8px !important;
            color: #000000 !important;
          }
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          .print-signature-block {
            display: block !important;
            margin-top: 40px !important;
            page-break-inside: avoid !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* TOP HEADER & ACTION BAR (NO-PRINT) */}
      <div className="no-print bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-500/20">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Конструктор отчетов MBI</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              OLAP 2.0
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Интерактивный Drag-and-Drop конструктор. Мгновенный предпросмотр структуры и данных в реальном времени.
          </p>
        </div>

        {/* Date Pickers & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="bg-transparent border-none text-xs text-gray-700 focus:outline-none"
            />
            <span className="text-gray-400">—</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="bg-transparent border-none text-xs text-gray-700 focus:outline-none"
            />
          </div>

          <button
            onClick={() => runReport()}
            disabled={loading}
            title="Обновить расчет данных"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Обновить</span>
          </button>

          {/* ПРЕДПРОСМОТР А4 (MODAL PREVIEW BUTTON) */}
          <button
            onClick={() => setShowPrintPreview(true)}
            disabled={!reportData}
            title="Открыть экранный предпросмотр бланка А4"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Предпросмотр А4</span>
          </button>

          <button
            onClick={exportToExcel}
            disabled={!reportData}
            title="Выгрузить в Excel (.xlsx) с авто-шириной колонок"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!reportData}
            title="Печать официального бланка А4"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Печать</span>
          </button>
        </div>
      </div>

      {/* POPULAR PRESETS / TEMPLATES (NO-PRINT) */}
      <div className="no-print bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Готовые шаблоны дистрибуции</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all text-left border ${
                activePreset === p.id 
                  ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-sm font-semibold ring-2 ring-blue-500/20' 
                  : 'bg-gray-50/70 border-gray-200/80 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">{p.name}</div>
              <div className="text-[11px] text-gray-500 font-normal mt-0.5 line-clamp-1">{p.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN INTERACTIVE CONSTRUCTOR: LEFT LIBRARY + RIGHT 4-ZONES (NO-PRINT) */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: FIELD LIBRARY */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-gray-900">Библиотека полей</h2>
            </div>
            <span className="text-[11px] text-gray-400">Перетащите в зоны справа</span>
          </div>

          {/* Search field */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск полей и метрик..."
              value={searchField}
              onChange={e => setSearchField(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 pb-2 border-b border-gray-100 overflow-x-auto text-[11px]">
            {[
              { id: 'all', label: 'Все' },
              { id: 'team', label: 'Команда' },
              { id: 'clients', label: 'Клиенты' },
              { id: 'products', label: 'Товары' },
              { id: 'logistics', label: 'Склады' },
              { id: 'metrics', label: 'Показатели' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeCategory === tab.id
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Draggable items scroll list */}
          <div className="flex-1 overflow-y-auto pt-3 space-y-2 pr-1">
            {/* DIMENSIONS */}
            {filteredDimensions.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1.5">
                  Измерения (Группировки)
                </div>
                <div className="space-y-1.5">
                  {filteredDimensions.map(dim => {
                    const inRows = selectedRows.includes(dim.code);
                    const inCols = selectedColumns.includes(dim.code);
                    return (
                      <div
                        key={dim.code}
                        draggable
                        onDragStart={e => handleDragStart(e, dim.code, 'dim')}
                        className={`group flex items-center justify-between p-2 rounded-xl border text-xs cursor-grab active:cursor-grabbing transition-all ${
                          inRows 
                            ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 font-medium'
                            : inCols 
                              ? 'bg-purple-50/70 border-purple-200 text-purple-950 font-medium'
                              : 'bg-white border-gray-200 text-gray-800 hover:border-blue-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
                          <span>{dim.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {inRows && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                              Строка
                            </span>
                          )}
                          {inCols && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold">
                              Колонка
                            </span>
                          )}
                          {!inRows && !inCols && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                              <button
                                onClick={() => addDimensionTo(dim.code, 'rows')}
                                title="Добавить в Строки"
                                className="p-1 hover:bg-indigo-100 text-indigo-600 rounded text-[10px]"
                              >
                                +Строка
                              </button>
                              <button
                                onClick={() => addDimensionTo(dim.code, 'columns')}
                                title="Добавить в Столбцы (Матрица 2D)"
                                className="p-1 hover:bg-purple-100 text-purple-600 rounded text-[10px]"
                              >
                                +Колонка
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* METRICS */}
            {filteredMetrics.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1.5">
                  Показатели (Метрики / Числа)
                </div>
                <div className="space-y-1.5">
                  {filteredMetrics.map(met => {
                    const isSelected = selectedValues.includes(met.code);
                    return (
                      <div
                        key={met.code}
                        draggable
                        onDragStart={e => handleDragStart(e, met.code, 'metric')}
                        className={`group flex items-center justify-between p-2 rounded-xl border text-xs cursor-grab active:cursor-grabbing transition-all ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                            : 'bg-white border-gray-200 text-gray-800 hover:border-emerald-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-500" />
                          <span>{met.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isSelected ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Активно
                            </span>
                          ) : (
                            <button
                              onClick={() => toggleMetric(met.code)}
                              className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] transition-opacity"
                            >
                              +Добавить
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 4 SMART DROP ZONES */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* ZONE 1: ROWS (СТРОКИ) */}
          <div 
            onDragOver={e => handleDragOver(e, 'rows')}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 'rows')}
            className={`p-4 rounded-2xl border-2 border-dashed transition-all ${
              dragOverZone === 'rows'
                ? 'border-indigo-500 bg-indigo-50/50 ring-4 ring-indigo-500/20'
                : 'border-indigo-200 bg-indigo-50/20 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <ArrowUpDown className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Строки (Иерархия уровней группировки)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Первый уровень группирует таблицу, второй создает вложенный раскрывающийся список
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                {selectedRows.length} ур.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 min-h-[44px] p-2 bg-white rounded-xl border border-indigo-100">
              {selectedRows.map((rowCode, idx) => {
                const dim = meta.dimensions.find(d => d.code === rowCode);
                return (
                  <div
                    key={rowCode}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-800 text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span>{dim?.name || rowCode}</span>
                    {selectedRows.length > 1 && (
                      <button
                        onClick={() => removeRow(rowCode)}
                        className="p-0.5 hover:bg-indigo-200 text-indigo-600 hover:text-indigo-900 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              {selectedRows.length === 0 && (
                <span className="text-xs text-gray-400 italic">Перетащите измерение сюда...</span>
              )}
            </div>
          </div>

          {/* ZONE 2: COLUMNS (СТОЛБЦЫ - 2D МАТРИЦА) */}
          <div 
            onDragOver={e => handleDragOver(e, 'columns')}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 'columns')}
            className={`p-4 rounded-2xl border-2 border-dashed transition-all ${
              dragOverZone === 'columns'
                ? 'border-purple-500 bg-purple-50/50 ring-4 ring-purple-500/20'
                : 'border-purple-200 bg-purple-50/20 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                  <MoveRight className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                    Столбцы (Кросс-таблица 2D Матрица)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Перенесите сюда Дату, Категорию или Склад для разворота по горизонтали
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                {selectedColumns.length > 0 ? 'Матрица активна' : 'Стандартно'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 min-h-[44px] p-2 bg-white rounded-xl border border-purple-100">
              {selectedColumns.map(colCode => {
                const dim = meta.dimensions.find(d => d.code === colCode);
                return (
                  <div
                    key={colCode}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 text-purple-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <span>{dim?.name || colCode}</span>
                    <button
                      onClick={() => removeColumn(colCode)}
                      className="p-0.5 hover:bg-purple-200 text-purple-600 hover:text-purple-900 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {selectedColumns.length === 0 && (
                <span className="text-xs text-gray-400 italic">
                  (Не обязательно) Перетащите измерение сюда для 2D кросс-таблицы (например, Дату)
                </span>
              )}
            </div>
          </div>

          {/* ZONE 3: VALUES (ПОКАЗАТЕЛИ / МЕТРИКИ) */}
          <div 
            onDragOver={e => handleDragOver(e, 'values')}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 'values')}
            className={`p-4 rounded-2xl border-2 border-dashed transition-all ${
              dragOverZone === 'values'
                ? 'border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/20'
                : 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Coins className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Показатели (Рассчитываемые значения)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Суммы, объемы, чеки и показатели АКБ, отображаемые в ячейках
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                {selectedValues.length} метрик
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 min-h-[44px] p-2 bg-white rounded-xl border border-emerald-100">
              {selectedValues.map(valCode => {
                const met = meta.metrics.find(m => m.code === valCode);
                return (
                  <div
                    key={valCode}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <span>{met?.name || valCode}</span>
                    {selectedValues.length > 1 && (
                      <button
                        onClick={() => removeValue(valCode)}
                        className="p-0.5 hover:bg-emerald-200 text-emerald-600 hover:text-emerald-900 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* KPI SUMMARY CARDS (NO-PRINT) */}
      {reportData?.totals && (
        <div className="no-print grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-500 font-medium">Общая выручка</div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {formatMetricValue(reportData.totals.totalAmount, 'currency')}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
              <span>За выбранный период</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-500 font-medium">Всего заказов</div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {formatMetricValue(reportData.totals.orderCount, 'number')}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Ср. чек: {formatMetricValue(reportData.totals.avgCheck, 'currency')}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-500 font-medium">АКБ / ОКБ Покрытие</div>
            <div className="text-xl font-bold text-gray-900 mt-1 flex items-baseline gap-1.5">
              <span>{reportData.totals.acb}</span>
              <span className="text-xs font-normal text-gray-400">/ {reportData.totals.okb}</span>
              <span className="text-xs font-bold text-blue-600">({reportData.totals.acbIndex}%)</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, reportData.totals.acbIndex || 0)}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-500 font-medium">Оценочная маржа</div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {formatMetricValue(reportData.totals.grossProfit, 'currency')}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Рентабельность: {reportData.totals.marginPercent}%
            </div>
          </div>
        </div>
      )}

      {/* REPORT DATA TABLE CONTAINER (ALSO USED FOR PRINTING) */}
      <div id="printable-report" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* OFFICIAL PRINT HEADER (VISIBLE ONLY IN PRINT) */}
        <div className="print-only mb-4 border-b pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-black uppercase">
                ООО &quot;СОМОН САВДО&quot; — ДИСТРИБЬЮТОРСКАЯ СЕТЬ
              </h1>
              <h2 className="text-base font-semibold text-black mt-1">
                ОФИЦИАЛЬНЫЙ АНАЛИТИЧЕСКИЙ ОТЧЕТ MBI
              </h2>
              <p className="text-xs text-gray-800 mt-0.5">
                Период: с {startDate} по {endDate} | Разрезы: {selectedRows.map(r => meta.dimensions.find(d => d.code === r)?.name).join(' ➜ ')}
                {is2DMatrix && ` × ${meta.dimensions.find(d => d.code === reportData.columnDimension)?.name}`}
              </p>
            </div>
            <div className="text-right text-xs text-gray-700">
              <div>Дата формирования: {new Date().toLocaleDateString('ru-RU')} {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
              <div>Система: SmartSale OLAP 2.0</div>
            </div>
          </div>
        </div>

        {/* SCREEN TABLE HEADER WITH VIEW MODE TABS (NO-PRINT) */}
        <div className="no-print p-4 bg-gray-50/70 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-bold text-gray-900">
                {is2DMatrix ? '2D Кросс-матрица' : 'Иерархический отчет'}
              </h3>
              {reportData?.rows && (
                <span className="text-xs text-gray-500 font-normal">
                  ({reportData.rows.length} основных строк)
                </span>
              )}
            </div>

            {/* TAB SWITCH: DATA vs STRUCTURE (SMARTUP PREVIEW) */}
            <div className="flex items-center bg-gray-200/80 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('data')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'data'
                    ? 'bg-white text-gray-900 shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Данные отчета
              </button>
              <button
                onClick={() => setViewMode('structure')}
                className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'structure'
                    ? 'bg-white text-indigo-900 shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Предпросмотр макета</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <button
              onClick={() => setShowPrintPreview(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Предпросмотр А4</span>
            </button>
            <span>•</span>
            <span>Клик по названию для накладных</span>
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="no-print p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <div className="text-sm font-semibold text-gray-900">Выполняется OLAP-агрегация...</div>
            <div className="text-xs text-gray-400 mt-1">Обработка заказов, SKU и клиентской базы</div>
          </div>
        )}

        {/* VIEW MODE: STRUCTURE PREVIEW (SMARTUP BLUEPRINT PREVIEW) */}
        {viewMode === 'structure' && (
          <div className="p-6 bg-slate-50 border-b border-gray-100">
            <div className="max-w-4xl mx-auto bg-white rounded-xl border border-indigo-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>Скелет макета таблицы (Smartup Blueprint Preview)</span>
                </div>
                <span className="text-[11px] text-gray-500">
                  Строк: {selectedRows.length}, Колонок: {selectedColumns.length > 0 ? 1 : 0}, Показателей: {selectedValues.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-300">
                  <thead>
                    {selectedColumns.length > 0 ? (
                      <>
                        <tr className="bg-purple-100/70 border-b border-gray-300 font-bold text-purple-950">
                          <th className="p-2 border border-gray-300">
                            {selectedRows.map(r => meta.dimensions.find(d => d.code === r)?.name).join(' ➜ ')}
                          </th>
                          <th className="p-2 border border-gray-300 text-center" colSpan={2}>
                            {meta.dimensions.find(d => d.code === selectedColumns[0])?.name} (Значение 1)
                          </th>
                          <th className="p-2 border border-gray-300 text-center" colSpan={2}>
                            {meta.dimensions.find(d => d.code === selectedColumns[0])?.name} (Значение 2)
                          </th>
                          <th className="p-2 border border-gray-300 text-center bg-purple-200/80">. . .</th>
                          <th className="p-2 border border-gray-300 text-center bg-blue-100 text-blue-900" colSpan={selectedValues.length}>
                            ИТОГО ЗА ПЕРИОД
                          </th>
                        </tr>
                        <tr className="bg-gray-100 border-b border-gray-300 text-gray-700">
                          <th className="p-2 border border-gray-300">Группировка</th>
                          {selectedValues.slice(0, 2).map(v => (
                            <th key={`c1-${v}`} className="p-1.5 border border-gray-300 text-right">
                              {meta.metrics.find(m => m.code === v)?.name}
                            </th>
                          ))}
                          {selectedValues.slice(0, 2).map(v => (
                            <th key={`c2-${v}`} className="p-1.5 border border-gray-300 text-right">
                              {meta.metrics.find(m => m.code === v)?.name}
                            </th>
                          ))}
                          <th className="p-1.5 border border-gray-300 text-center">. . .</th>
                          {selectedValues.map(v => (
                            <th key={`ct-${v}`} className="p-1.5 border border-gray-300 text-right font-bold text-blue-950 bg-blue-50">
                              {meta.metrics.find(m => m.code === v)?.name}
                            </th>
                          ))}
                        </tr>
                      </>
                    ) : (
                      <tr className="bg-indigo-100/70 border-b border-gray-300 font-bold text-indigo-950">
                        <th className="p-2.5 border border-gray-300">
                          {selectedRows.map(r => meta.dimensions.find(d => d.code === r)?.name).join(' ➜ ')}
                        </th>
                        {selectedValues.map(v => (
                          <th key={v} className="p-2.5 border border-gray-300 text-right">
                            {meta.metrics.find(m => m.code === v)?.name}
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody className="text-gray-600">
                    <tr className="border-b border-gray-200 bg-white">
                      <td className="p-2 border border-gray-300 font-semibold text-gray-900">
                        {meta.dimensions.find(d => d.code === selectedRows[0])?.name} (Запись А)
                      </td>
                      {selectedColumns.length > 0 ? (
                        <>
                          <td className="p-2 border border-gray-300 text-right font-mono">1 450.00</td>
                          <td className="p-2 border border-gray-300 text-right font-mono">12</td>
                          <td className="p-2 border border-gray-300 text-right font-mono">3 200.00</td>
                          <td className="p-2 border border-gray-300 text-right font-mono">25</td>
                          <td className="p-2 border border-gray-300 text-center font-mono">...</td>
                          <td className="p-2 border border-gray-300 text-right font-bold font-mono text-blue-900 bg-blue-50/50">4 650.00</td>
                        </>
                      ) : (
                        selectedValues.map(v => (
                          <td key={v} className="p-2 border border-gray-300 text-right font-mono">
                            {v.includes('Amount') || v.includes('Profit') ? '12 450.00 TJS' : '15'}
                          </td>
                        ))
                      )}
                    </tr>
                    {selectedRows.length > 1 && (
                      <tr className="border-b border-gray-200 bg-gray-50/60 text-[11px]">
                        <td className="p-2 pl-6 border border-gray-300 text-gray-500">
                          ↳ {meta.dimensions.find(d => d.code === selectedRows[1])?.name} (Вложенный элемент)
                        </td>
                        {selectedColumns.length > 0 ? (
                          <>
                            <td className="p-2 border border-gray-300 text-right font-mono">600.00</td>
                            <td className="p-2 border border-gray-300 text-right font-mono">5</td>
                            <td className="p-2 border border-gray-300 text-right font-mono">1 100.00</td>
                            <td className="p-2 border border-gray-300 text-right font-mono">8</td>
                            <td className="p-2 border border-gray-300 text-center font-mono">...</td>
                            <td className="p-2 border border-gray-300 text-right font-mono text-blue-900">1 700.00</td>
                          </>
                        ) : (
                          selectedValues.map(v => (
                            <td key={v} className="p-2 border border-gray-300 text-right font-mono">
                              {v.includes('Amount') || v.includes('Profit') ? '1 700.00 TJS' : '3'}
                            </td>
                          ))
                        )}
                      </tr>
                    )}
                    <tr className="border-b border-gray-200 bg-white">
                      <td className="p-2 border border-gray-300 font-semibold text-gray-900">
                        {meta.dimensions.find(d => d.code === selectedRows[0])?.name} (Запись Б)
                      </td>
                      {selectedColumns.length > 0 ? (
                        <>
                          <td className="p-2 border border-gray-300 text-right font-mono">2 100.00</td>
                          <td className="p-2 border border-gray-300 text-right font-mono">18</td>
                          <td className="p-2 border border-gray-300 text-right font-mono">950.00</td>
                          <td className="p-2 border border-gray-300 text-right font-mono">7</td>
                          <td className="p-2 border border-gray-300 text-center font-mono">...</td>
                          <td className="p-2 border border-gray-300 text-right font-bold font-mono text-blue-900 bg-blue-50/50">3 050.00</td>
                        </>
                      ) : (
                        selectedValues.map(v => (
                          <td key={v} className="p-2 border border-gray-300 text-right font-mono">
                            {v.includes('Amount') || v.includes('Profit') ? '8 320.00 TJS' : '9'}
                          </td>
                        ))
                      )}
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-400 text-gray-900">
                      <td className="p-2.5 border border-gray-300 uppercase">ИТОГО ПО КОМПАНИИ</td>
                      {selectedColumns.length > 0 ? (
                        <>
                          <td className="p-2 border border-gray-300 text-right font-mono">3 550.00</td>
                          <td className="p-2 border border-gray-300 text-right font-mono">30</td>
                          <td className="p-2 border border-gray-300 text-right font-mono">4 150.00</td>
                          <td className="p-2 border border-gray-300 text-right font-mono">32</td>
                          <td className="p-2 border border-gray-300 text-center font-mono">...</td>
                          <td className="p-2 border border-gray-300 text-right font-mono text-blue-800 bg-blue-100/60">7 700.00</td>
                        </>
                      ) : (
                        selectedValues.map(v => (
                          <td key={v} className="p-2.5 border border-gray-300 text-right font-mono text-blue-900">
                            {v.includes('Amount') || v.includes('Profit') ? '20 770.00 TJS' : '24'}
                          </td>
                        ))
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && (!reportData || !reportData.rows || reportData.rows.length === 0) && (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-gray-800">Нет данных за выбранный период</div>
            <div className="text-xs text-gray-400 mt-1">
              Попробуйте расширить диапазон дат или изменить фильтры
            </div>
          </div>
        )}

        {/* DATA TABLE RENDERING (VIEW MODE: DATA) */}
        {!loading && viewMode === 'data' && reportData && reportData.rows && reportData.rows.length > 0 && (
          <div className="overflow-x-auto">
            {is2DMatrix ? (
              /* ======================= 2D CROSS-TAB MATRIX ======================= */
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
                    <th className="py-3 px-4 sticky left-0 bg-gray-100 z-10 min-w-[220px]">
                      {meta.dimensions.find(d => d.code === selectedRows[0])?.name || 'Строка'} 
                      <span className="text-gray-400 font-normal ml-1">
                        \ {meta.dimensions.find(d => d.code === reportData.columnDimension)?.name || 'Колонка'}
                      </span>
                    </th>
                    {reportData.columnKeys.map((cKey: string) => (
                      <th key={cKey} className="py-3 px-3 text-right whitespace-nowrap min-w-[110px]">
                        {cKey}
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right bg-blue-50/50 text-blue-900 font-bold min-w-[130px]">
                      ИТОГО
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                  {reportData.rows.map((row: any) => {
                    const isExpanded = expandedRows[row.name];
                    const hasSub = row.subItems && row.subItems.length > 0;
                    const primaryMetric = selectedValues[0];
                    const metricDef = meta.metrics.find(m => m.code === primaryMetric);

                    return (
                      <React.Fragment key={row.name}>
                        <tr className="hover:bg-blue-50/30 transition-colors font-medium">
                          <td className="py-2.5 px-4 sticky left-0 bg-white z-10 flex items-center gap-2">
                            {hasSub ? (
                              <button
                                onClick={() => toggleRowExpand(row.name)}
                                className="no-print p-0.5 hover:bg-gray-200 rounded text-gray-500"
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <span className="w-4 inline-block" />
                            )}
                            <button
                              onClick={() => handleOpenDrilldown(selectedRows[0], row.name)}
                              className="text-left font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {row.name}
                            </button>
                          </td>

                          {reportData.columnKeys.map((cKey: string) => {
                            const val = row.cells?.[cKey]?.[primaryMetric];
                            return (
                              <td key={cKey} className="py-2.5 px-3 text-right text-gray-700">
                                {val ? formatMetricValue(val, metricDef?.format || 'number') : '—'}
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-4 text-right font-bold text-blue-950 bg-blue-50/30">
                            {formatMetricValue(row.metrics?.[primaryMetric], metricDef?.format || 'number')}
                          </td>
                        </tr>

                        {/* SUB-ROWS IN 2D */}
                        {hasSub && isExpanded && row.subItems.map((sub: any) => (
                          <tr key={sub.name} className="bg-gray-50/60 text-gray-600 text-[11px] hover:bg-gray-100/70">
                            <td className="py-2 px-4 pl-10 sticky left-0 bg-gray-50/90 z-10 flex items-center gap-1.5">
                              <span className="text-gray-300">↳</span>
                              <button
                                onClick={() => handleOpenDrilldown(selectedRows[1], sub.name)}
                                className="hover:text-blue-600 text-left"
                              >
                                {sub.name}
                              </button>
                            </td>

                            {reportData.columnKeys.map((cKey: string) => {
                              const subVal = sub.cells?.[cKey]?.[primaryMetric];
                              return (
                                <td key={cKey} className="py-2 px-3 text-right">
                                  {subVal ? formatMetricValue(subVal, metricDef?.format || 'number') : '—'}
                                </td>
                              );
                            })}

                            <td className="py-2 px-4 text-right font-semibold text-gray-800 bg-blue-50/20">
                              {formatMetricValue(sub.metrics?.[primaryMetric], metricDef?.format || 'number')}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>

                {/* 2D GRAND TOTAL ROW */}
                {reportData.totals && reportData.colTotals && (
                  <tfoot>
                    <tr className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300">
                      <td className="py-3 px-4 sticky left-0 bg-gray-100 z-10 uppercase text-xs">
                        ИТОГО ПО КОМПАНИИ
                      </td>
                      {reportData.columnKeys.map((cKey: string) => {
                        const colTotal = reportData.colTotals?.[cKey]?.[selectedValues[0]];
                        const metricDef = meta.metrics.find(m => m.code === selectedValues[0]);
                        return (
                          <td key={cKey} className="py-3 px-3 text-right">
                            {formatMetricValue(colTotal, metricDef?.format || 'number')}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-right text-blue-700 bg-blue-100/60 text-xs">
                        {formatMetricValue(reportData.totals[selectedValues[0]], meta.metrics.find(m => m.code === selectedValues[0])?.format || 'number')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            ) : (
              /* ======================= 1D TABULAR REPORT ======================= */
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
                    <th className="py-3 px-4 min-w-[240px]">
                      {meta.dimensions.find(d => d.code === selectedRows[0])?.name || 'Группировка'}
                    </th>
                    {selectedValues.map(v => (
                      <th key={v} className="py-3 px-4 text-right whitespace-nowrap min-w-[130px]">
                        {meta.metrics.find(m => m.code === v)?.name || v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                  {reportData.rows.map((row: any) => {
                    const isExpanded = expandedRows[row.name];
                    const hasSub = row.subItems && row.subItems.length > 0;

                    return (
                      <React.Fragment key={row.name}>
                        <tr className="hover:bg-blue-50/30 transition-colors font-medium">
                          <td className="py-2.5 px-4 flex items-center gap-2">
                            {hasSub ? (
                              <button
                                onClick={() => toggleRowExpand(row.name)}
                                className="no-print p-0.5 hover:bg-gray-200 rounded text-gray-500"
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <span className="w-4 inline-block" />
                            )}
                            <button
                              onClick={() => handleOpenDrilldown(selectedRows[0], row.name)}
                              className="text-left font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {row.name}
                            </button>
                          </td>

                          {selectedValues.map(v => {
                            const mDef = meta.metrics.find(m => m.code === v);
                            return (
                              <td key={v} className="py-2.5 px-4 text-right">
                                {formatMetricValue(row.metrics?.[v], mDef?.format || 'number')}
                              </td>
                            );
                          })}
                        </tr>

                        {/* SUB-ROWS IN 1D */}
                        {hasSub && isExpanded && row.subItems.map((sub: any) => (
                          <tr key={sub.name} className="bg-gray-50/60 text-gray-600 text-[11px] hover:bg-gray-100/70">
                            <td className="py-2 px-4 pl-10 flex items-center gap-1.5">
                              <span className="text-gray-300">↳</span>
                              <button
                                onClick={() => handleOpenDrilldown(selectedRows[1], sub.name)}
                                className="hover:text-blue-600 text-left"
                              >
                                {sub.name}
                              </button>
                            </td>

                            {selectedValues.map(v => {
                              const mDef = meta.metrics.find(m => m.code === v);
                              return (
                                <td key={v} className="py-2 px-4 text-right">
                                  {formatMetricValue(sub.metrics?.[v], mDef?.format || 'number')}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>

                {/* 1D GRAND TOTAL ROW */}
                {reportData.totals && (
                  <tfoot>
                    <tr className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300 text-xs">
                      <td className="py-3 px-4 uppercase">ИТОГО ПО КОМПАНИИ</td>
                      {selectedValues.map(v => {
                        const mDef = meta.metrics.find(m => m.code === v);
                        return (
                          <td key={v} className="py-3 px-4 text-right text-blue-900 font-bold">
                            {formatMetricValue(reportData.totals[v], mDef?.format || 'number')}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        )}

        {/* OFFICIAL SIGNATURE BLOCK FOR PRINT (VISIBLE ONLY IN PRINT) */}
        <div className="print-signature-block print-only mt-10 pt-4 border-t border-gray-400 text-xs">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="mb-6">
                Руководитель отдела продаж: __________________________ / ______________________
              </div>
              <div>
                Главный бухгалтер: __________________________ / ______________________
              </div>
            </div>
            <div className="text-right">
              <div className="mb-6">М.П.</div>
              <div>Дата: «______» ___________________ 2026 г.</div>
            </div>
          </div>
        </div>

      </div>

      {/* FULL-SCREEN A4 PRINT PREVIEW MODAL (ПРЕДПРОСМОТР БЛАНКА А4) */}
      {showPrintPreview && (
        <div className="no-print fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col items-center p-4 md:p-6 overflow-y-auto">
          {/* Top floating control bar */}
          <div className="w-full max-w-4xl bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between mb-4 sticky top-2 z-20">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold">Предпросмотр печатной формы А4</span>
              <span className="text-xs text-gray-400 hidden sm:inline">
                (Точно так документ выйдет на бумаге)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Отправить на печать</span>
              </button>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Realistic white A4 Sheet simulation */}
          <div className="w-full max-w-4xl bg-white text-black p-8 md:p-12 shadow-2xl rounded-sm border border-gray-300 min-h-[297mm] font-sans box-border">
            {/* Header */}
            <div className="border-b-2 border-black pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-base font-extrabold tracking-wide uppercase">
                    ООО &quot;СОМОН САВДО&quot;
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Дистрибьюторская сеть товаров народного потребления
                  </div>
                  <div className="text-lg font-bold mt-3 uppercase text-black">
                    ОФИЦИАЛЬНЫЙ АНАЛИТИЧЕСКИЙ ОТЧЕТ MBI
                  </div>
                  <div className="text-xs text-gray-800 mt-1 font-medium">
                    Период: с <span className="font-bold">{startDate}</span> по <span className="font-bold">{endDate}</span>
                  </div>
                  <div className="text-xs text-gray-700 mt-0.5">
                    Группировки: {selectedRows.map(r => meta.dimensions.find(d => d.code === r)?.name).join(' ➜ ')}
                    {is2DMatrix && ` × ${meta.dimensions.find(d => d.code === reportData?.columnDimension)?.name}`}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <div>Форма: УО-2026-MBI</div>
                  <div>Дата: {new Date().toLocaleDateString('ru-RU')}</div>
                  <div>Время: {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            </div>

            {/* Document Table */}
            {reportData && reportData.rows && reportData.rows.length > 0 ? (
              <div className="overflow-x-auto">
                {is2DMatrix ? (
                  <table className="w-full text-left border-collapse text-[11px] border border-black">
                    <thead>
                      <tr className="bg-gray-100 font-bold border-b border-black">
                        <th className="p-2 border border-black">
                          {meta.dimensions.find(d => d.code === selectedRows[0])?.name} \ {meta.dimensions.find(d => d.code === reportData.columnDimension)?.name}
                        </th>
                        {reportData.columnKeys.map((cKey: string) => (
                          <th key={cKey} className="p-2 border border-black text-right">
                            {cKey}
                          </th>
                        ))}
                        <th className="p-2 border border-black text-right bg-gray-200">ИТОГО</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.rows.map((row: any) => (
                        <tr key={row.name} className="border-b border-gray-400">
                          <td className="p-2 border border-black font-semibold">{row.name}</td>
                          {reportData.columnKeys.map((cKey: string) => (
                            <td key={cKey} className="p-2 border border-black text-right">
                              {formatMetricValue(row.cells?.[cKey]?.[selectedValues[0]], meta.metrics.find(m => m.code === selectedValues[0])?.format || 'number')}
                            </td>
                          ))}
                          <td className="p-2 border border-black text-right font-bold bg-gray-50">
                            {formatMetricValue(row.metrics?.[selectedValues[0]], meta.metrics.find(m => m.code === selectedValues[0])?.format || 'number')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {reportData.totals && reportData.colTotals && (
                      <tfoot>
                        <tr className="bg-gray-200 font-bold border-t-2 border-black">
                          <td className="p-2 border border-black uppercase">ИТОГО ПО КОМПАНИИ</td>
                          {reportData.columnKeys.map((cKey: string) => (
                            <td key={cKey} className="p-2 border border-black text-right">
                              {formatMetricValue(reportData.colTotals?.[cKey]?.[selectedValues[0]], meta.metrics.find(m => m.code === selectedValues[0])?.format || 'number')}
                            </td>
                          ))}
                          <td className="p-2 border border-black text-right bg-gray-300">
                            {formatMetricValue(reportData.totals[selectedValues[0]], meta.metrics.find(m => m.code === selectedValues[0])?.format || 'number')}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                ) : (
                  <table className="w-full text-left border-collapse text-[11px] border border-black">
                    <thead>
                      <tr className="bg-gray-100 font-bold border-b border-black">
                        <th className="p-2 border border-black">
                          {meta.dimensions.find(d => d.code === selectedRows[0])?.name || 'Группировка'}
                        </th>
                        {selectedValues.map(v => (
                          <th key={v} className="p-2 border border-black text-right">
                            {meta.metrics.find(m => m.code === v)?.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.rows.map((row: any) => (
                        <React.Fragment key={row.name}>
                          <tr className="border-b border-gray-400 font-semibold">
                            <td className="p-2 border border-black">{row.name}</td>
                            {selectedValues.map(v => (
                              <td key={v} className="p-2 border border-black text-right">
                                {formatMetricValue(row.metrics?.[v], meta.metrics.find(m => m.code === v)?.format || 'number')}
                              </td>
                            ))}
                          </tr>
                          {row.subItems && row.subItems.map((sub: any) => (
                            <tr key={sub.name} className="border-b border-gray-300 text-[10px] text-gray-700">
                              <td className="p-1.5 pl-6 border border-black">↳ {sub.name}</td>
                              {selectedValues.map(v => (
                                <td key={v} className="p-1.5 border border-black text-right">
                                  {formatMetricValue(sub.metrics?.[v], meta.metrics.find(m => m.code === v)?.format || 'number')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                    {reportData.totals && (
                      <tfoot>
                        <tr className="bg-gray-200 font-bold border-t-2 border-black">
                          <td className="p-2 border border-black uppercase">ИТОГО ПО КОМПАНИИ</td>
                          {selectedValues.map(v => (
                            <td key={v} className="p-2 border border-black text-right">
                              {formatMetricValue(reportData.totals[v], meta.metrics.find(m => m.code === v)?.format || 'number')}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400">Нет данных для печати</div>
            )}

            {/* Official Signatures */}
            <div className="mt-16 pt-6 border-t border-gray-500 text-xs">
              <div className="grid grid-cols-2 gap-12">
                <div>
                  <div className="mb-8">
                    Руководитель отдела продаж: __________________________ / ______________________
                  </div>
                  <div>
                    Главный бухгалтер: __________________________ / ______________________
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-8 font-bold">М.П.</div>
                  <div>Дата: «______» ___________________ 2026 г.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRILLDOWN MODAL DRAWER (NO-PRINT) */}
      {drilldown.open && (
        <div className="no-print fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col p-6 overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Детализация накладных</h3>
                <p className="text-xs text-blue-600 font-medium mt-0.5">{drilldown.title}</p>
              </div>
              <button
                onClick={() => setDrilldown(prev => ({ ...prev, open: false }))}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {drilldown.loading ? (
                <div className="p-8 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <span className="text-xs">Загрузка накладных...</span>
                </div>
              ) : drilldown.orders.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Нет накладных по данной выборке
                </div>
              ) : (
                drilldown.orders.map((ord: any) => (
                  <div key={ord.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-gray-900">
                          Заказ №{ord.id.slice(0, 8)}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Клиент: <span className="font-semibold text-gray-700">{ord.client?.name}</span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Агент: {ord.salesRep?.firstName} {ord.salesRep?.lastName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600 text-sm">
                          {Number(ord.totalAmount).toLocaleString('ru-RU')} TJS
                        </div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          ord.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {ord.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2 border-t border-gray-100 pt-1.5 flex justify-between">
                      <span>Дата: {new Date(ord.createdAt).toLocaleDateString('ru-RU')}</span>
                      <span>Оплата: {ord.client?.paymentType || 'CASH'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setDrilldown(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
