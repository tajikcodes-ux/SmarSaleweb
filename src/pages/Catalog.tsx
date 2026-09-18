import { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  Plus, Package, Map, Edit, Trash, Users, ArrowLeftRight, Check, X, ClipboardList,
  FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

export default function Catalog() {
  const [activeTab, setActiveTab] = useState<'products' | 'stocks' | 'suppliers' | 'incoming' | 'movements'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Suppliers State
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Procurements (Incoming) State
  const [procurements, setProcurements] = useState<any[]>([]);
  const [showProcurementForm, setShowProcurementForm] = useState(false);
  const [procSupplierId, setProcSupplierId] = useState('');
  const [procWarehouseId, setProcWarehouseId] = useState('');
  const [procItems, setProcItems] = useState<Array<{ productId: string; quantity: number; price: number }>>([]);

  // Movements State
  const [movements, setMovements] = useState<any[]>([]);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movFromWarehouseId, setMovFromWarehouseId] = useState('');
  const [movToWarehouseId, setMovToWarehouseId] = useState('');
  const [movItems, setMovItems] = useState<Array<{ productId: string; quantity: number }>>([]);

  // Form states (Products & Warehouses & Categories)
  // Bulk Excel Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; total: number } | null>(null);
  const [importError, setImportError] = useState('');

  const downloadProductTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Название товара', 'Артикул', 'Цена', 'Ед. изм.', 'Категория', 'Штрихкод'],
      ['Вода минеральная 0.5л', 'SKU-001', 3.50, 'шт', 'Напитки', '482000001001'],
      ['Сок Яблочный 1л', 'SKU-002', 12.00, 'шт', 'Напитки', '482000001002'],
      ['Шоколад Алёнка 100г', 'SKU-003', 9.50, 'шт', 'Кондитерские изделия', '482000001003'],
      ['Печенье Овсяное 300г', 'SKU-004', 8.00, 'упак', 'Кондитерские изделия', '482000001004'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Шаблон товаров');
    XLSX.writeFile(wb, 'shablon_tovarov_smartsale.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) {
          setImportError('Файл пуст или не содержит строк с данными');
          return;
        }

        const headers: string[] = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
        
        const nameIdx = headers.findIndex(h => h.includes('назван') || h.includes('наименов') || h.includes('товар') || h.includes('name'));
        const skuIdx = headers.findIndex(h => h.includes('артикул') || h.includes('sku') || h.includes('код'));
        const priceIdx = headers.findIndex(h => h.includes('цена') || h.includes('стоимост') || h.includes('price'));
        const unitIdx = headers.findIndex(h => h.includes('ед') || h.includes('изм') || h.includes('unit'));
        const catIdx = headers.findIndex(h => h.includes('категор') || h.includes('бренд') || h.includes('category'));
        const barcodeIdx = headers.findIndex(h => h.includes('штрих') || h.includes('barcode'));

        if (nameIdx === -1) {
          setImportError('Не найдена колонка "Название товара" в первой строке таблицы.');
          return;
        }

        const items: any[] = [];
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || !row[nameIdx]) continue;
          const name = String(row[nameIdx]).trim();
          if (!name) continue;

          items.push({
            name,
            sku: skuIdx !== -1 && row[skuIdx] ? String(row[skuIdx]).trim() : undefined,
            price: priceIdx !== -1 ? Number(row[priceIdx]) || 0 : 0,
            unit: unitIdx !== -1 && row[unitIdx] ? String(row[unitIdx]).trim() : 'pcs',
            categoryName: catIdx !== -1 && row[catIdx] ? String(row[catIdx]).trim() : undefined,
            barcode: barcodeIdx !== -1 && row[barcodeIdx] ? String(row[barcodeIdx]).trim() : undefined,
          });
        }

        if (items.length === 0) {
          setImportError('Не удалось распознать строки с товарами.');
          return;
        }

        setParsedProducts(items);
      } catch (err: any) {
        setImportError('Ошибка чтения Excel файла: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteImport = async () => {
    if (parsedProducts.length === 0) return;
    setImporting(true);
    setImportError('');
    try {
      const res = await api.post('/catalog/products/bulk', parsedProducts);
      setImportResult(res.data);
      loadCatalog();
    } catch (err: any) {
      setImportError(err.response?.data?.message || 'Ошибка сохранения товаров');
    } finally {
      setImporting(false);
    }
  };

  const [showProductForm, setShowProductForm] = useState(false);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [prodName, setProdName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState(0);
  const [unit, setUnit] = useState('pcs');
  const [catId, setCatId] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [newCatName, setNewCatName] = useState('');
  const [whName, setWhName] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whBranchId, setWhBranchId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);

  const loadCatalog = async () => {
    try {
      const [prodRes, catRes, whRes, supRes, procRes, movRes, branchRes] = await Promise.all([
        api.get('/catalog/products'),
        api.get('/catalog/categories'),
        api.get('/stocks/warehouses'),
        api.get('/procurements/suppliers'),
        api.get('/procurements/incoming'),
        api.get('/procurements/movements'),
        api.get('/branches').catch(() => ({ data: [] })),
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setWarehouses(whRes.data);
      setSuppliers(supRes.data);
      setProcurements(procRes.data);
      setMovements(movRes.data);
      setBranches(branchRes.data || []);

      if (whRes.data.length > 0) {
        setSelectedWarehouseId(whRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load catalog/procurements data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Load stocks when selected warehouse changes
  useEffect(() => {
    if (!selectedWarehouseId) return;

    const loadStocks = async () => {
      try {
        const response = await api.get(`/stocks/warehouse/${selectedWarehouseId}`);
        setStocks(response.data);
      } catch (err) {
        console.error('Failed to load stocks', err);
      }
    };
    loadStocks();
  }, [selectedWarehouseId]);

  // Product CRUD
  const handleOpenEditProduct = (product: any) => {
    setEditingProduct(product);
    setProdName(product.name || '');
    setSku(product.sku || '');
    setPrice(parseFloat(product.price?.toString() || '0'));
    setUnit(product.unit || 'pcs');
    setCatId(product.categoryId || '');
    setImageUrl(product.imageUrl || '');
    setShowProductForm(true);
  };

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setSku('');
    setPrice(0);
    setUnit('pcs');
    setCatId('');
    setImageUrl('');
    setShowProductForm(true);
  };

  const handleCreateOrUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: prodName,
      sku,
      price: parseFloat(price.toString()),
      unit,
      categoryId: catId || undefined,
      imageUrl: imageUrl || undefined,
    };

    try {
      if (editingProduct) {
        await api.put(`/catalog/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/catalog/products', payload);
      }
      setShowProductForm(false);
      setEditingProduct(null);
      loadCatalog();
      setProdName('');
      setSku('');
      setPrice(0);
      setImageUrl('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот товар?')) return;
    try {
      await api.delete(`/catalog/products/${id}`);
      loadCatalog();
    } catch (err) {
      console.error(err);
    }
  };

  // Category Create
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await api.post('/catalog/categories', { name: newCatName.trim() });
      setShowCategoryForm(false);
      setNewCatName('');
      await loadCatalog();
      if (res.data && res.data.id) {
        setCatId(res.data.id);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Ошибка создания категории');
    }
  };

  // Warehouse Create
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/stocks/warehouses', {
        name: whName,
        address: whAddress,
        branchId: whBranchId || undefined,
      });
      setShowWarehouseForm(false);
      loadCatalog();
      setWhName('');
      setWhAddress('');
      setWhBranchId('');
    } catch (err) {
      console.error(err);
    }
  };

  // Supplier CRUD
  const handleCreateOrUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/procurements/suppliers/${editingSupplier.id}`, {
          name: supName,
          phone: supPhone,
          address: supAddress
        });
      } else {
        await api.post('/procurements/suppliers', {
          name: supName,
          phone: supPhone,
          address: supAddress
        });
      }
      setShowSupplierForm(false);
      setEditingSupplier(null);
      setSupName('');
      setSupPhone('');
      setSupAddress('');
      loadCatalog();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!window.confirm('Удалить этого поставщика?')) return;
    try {
      await api.delete(`/procurements/suppliers/${id}`);
      loadCatalog();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка удаления поставщика');
    }
  };

  // Procurement (Incoming) Actions
  const handleCreateProcurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (procItems.length === 0) {
      alert('Добавьте хотя бы один товар');
      return;
    }
    try {
      await api.post('/procurements/incoming', {
        supplierId: procSupplierId,
        warehouseId: procWarehouseId,
        items: procItems
      });
      setShowProcurementForm(false);
      setProcSupplierId('');
      setProcWarehouseId('');
      setProcItems([]);
      loadCatalog();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveProcurement = async (id: string) => {
    try {
      await api.patch(`/procurements/incoming/${id}/status`, { status: 'completed' });
      loadCatalog();
    } catch (err) {
      console.error(err);
    }
  };

  // Movement Actions
  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (movItems.length === 0) {
      alert('Добавьте хотя бы один товар');
      return;
    }
    try {
      await api.post('/procurements/movements', {
        fromWarehouseId: movFromWarehouseId,
        toWarehouseId: movToWarehouseId,
        items: movItems
      });
      setShowMovementForm(false);
      setMovFromWarehouseId('');
      setMovToWarehouseId('');
      setMovItems([]);
      loadCatalog();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка при создании перемещения');
    }
  };

  const handleApproveMovement = async (id: string) => {
    try {
      await api.patch(`/procurements/movements/${id}/status`, { status: 'completed' });
      loadCatalog();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка проведения перемещения');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="w-8 h-8 border-4 border-slate-200 border-t-[#0b57d0] rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 border border-[#e3e3e8] rounded-2xl shadow-sm gap-4">
        <div>
          <h3 className="font-bold text-[#1d1d1f] text-lg">Складской учет и Закупки</h3>
          <p className="text-xs text-[#86868b] mt-0.5">Управление номенклатурой товаров, складами, поставщиками и перемещениями</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setParsedProducts([]);
              setImportResult(null);
              setImportError('');
              setShowImportModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Импорт из Excel</span>
          </button>
          <button
            onClick={handleOpenCreateProduct}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0b57d0] hover:bg-[#094cb3] text-white rounded-xl font-bold text-xs transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Новый товар</span>
          </button>
          <button
            onClick={() => setShowCategoryForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Категория</span>
          </button>
          <button
            onClick={() => setShowWarehouseForm(!showWarehouseForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e3e3e8] hover:bg-[#f5f5f7] rounded-xl font-bold text-xs text-[#1d1d1f] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Новый склад</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-[#e3e3e8] overflow-x-auto scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'products' ? 'border-[#0b57d0] text-[#0b57d0]' : 'border-transparent text-[#5f6368] hover:text-[#1d1d1f]'
          }`}
        >
          <Package className="w-3.5 h-3.5 inline-block mr-1.5 align-text-bottom" />
          Каталог товаров
        </button>
        <button
          onClick={() => setActiveTab('stocks')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'stocks' ? 'border-[#0b57d0] text-[#0b57d0]' : 'border-transparent text-[#5f6368] hover:text-[#1d1d1f]'
          }`}
        >
          <Map className="w-3.5 h-3.5 inline-block mr-1.5 align-text-bottom" />
          Остатки на складах
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'suppliers' ? 'border-[#0b57d0] text-[#0b57d0]' : 'border-transparent text-[#5f6368] hover:text-[#1d1d1f]'
          }`}
        >
          <Users className="w-3.5 h-3.5 inline-block mr-1.5 align-text-bottom" />
          Поставщики
        </button>
        <button
          onClick={() => setActiveTab('incoming')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'incoming' ? 'border-[#0b57d0] text-[#0b57d0]' : 'border-transparent text-[#5f6368] hover:text-[#1d1d1f]'
          }`}
        >
          <Package className="w-3.5 h-3.5 inline-block mr-1.5 align-text-bottom" />
          Приход товара
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'movements' ? 'border-[#0b57d0] text-[#0b57d0]' : 'border-transparent text-[#5f6368] hover:text-[#1d1d1f]'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5 inline-block mr-1.5 align-text-bottom" />
          Перемещения
        </button>
      </div>

      {/* Forms Section */}
      {showCategoryForm && (
        <form onSubmit={handleCreateCategory} className="bg-white border border-emerald-200 p-6 rounded-2xl space-y-4 max-w-lg shadow-sm">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-1.5">
              📁 Новая категория товаров
            </h4>
            <button type="button" onClick={() => setShowCategoryForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#86868b] uppercase mb-1">Название категории (например: Напитки, Бытовая химия)</label>
            <input
              type="text"
              placeholder="Введите название категории*"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-600 text-[#1d1d1f]"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCategoryForm(false)} className="px-4 py-2 border border-[#e3e3e8] hover:bg-slate-50 text-[#1d1d1f] rounded-xl font-semibold text-xs">
              Отмена
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm">
              Сохранить категорию
            </button>
          </div>
        </form>
      )}

      {showProductForm && (
        <form onSubmit={handleCreateOrUpdateProduct} className="bg-white border border-[#e3e3e8] p-6 rounded-2xl space-y-4 max-w-2xl shadow-sm">
          <h4 className="font-bold text-[#1d1d1f] text-sm">
            {editingProduct ? 'Редактировать товар' : 'Новый товар'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Наименование товара*"
              required
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
            />
            <input
              type="text"
              placeholder="Артикул (SKU)*"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
            />
            <input
              type="number"
              step="any"
              placeholder="Цена (TJS)*"
              required
              value={price || ''}
              onChange={(e) => setPrice(parseFloat(e.target.value))}
              className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
            >
              <option value="pcs">Штука (pcs)</option>
              <option value="kg">Килограмм (kg)</option>
              <option value="box">Коробка (box)</option>
            </select>
            <div className="flex gap-2">
              <select
                value={catId}
                onChange={(e) => setCatId(e.target.value)}
                className="flex-1 bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
              >
                <option value="">Выберите категорию</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCategoryForm(true)}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold whitespace-nowrap"
                title="Добавить новую категорию"
              >
                + Категория
              </button>
            </div>
            <input
              type="text"
              placeholder="Ссылка на изображение товара (URL)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowProductForm(false)} className="px-4 py-2 border border-[#e3e3e8] hover:bg-slate-50 text-[#1d1d1f] rounded-xl font-semibold text-xs">
              Отмена
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#0b57d0] hover:bg-[#094cb3] text-white font-semibold text-xs shadow-sm">
              {editingProduct ? 'Сохранить изменения' : 'Создать товар'}
            </button>
          </div>
        </form>
      )}

      {showWarehouseForm && (
        <form onSubmit={handleCreateWarehouse} className="bg-white border border-[#e3e3e8] p-6 rounded-2xl space-y-4 max-w-2xl shadow-sm">
          <h4 className="font-bold text-[#1d1d1f] text-sm">Новый склад</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Название склада*"
              required
              value={whName}
              onChange={(e) => setWhName(e.target.value)}
              className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
            />
            <input
              type="text"
              placeholder="Адрес склада"
              value={whAddress}
              onChange={(e) => setWhAddress(e.target.value)}
              className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
            />
            <select
              value={whBranchId}
              onChange={(e) => setWhBranchId(e.target.value)}
              className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
            >
              <option value="">Привязка к филиалу (По умолчанию Общий)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  🏢 {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowWarehouseForm(false)} className="px-4 py-2 border border-[#e3e3e8] hover:bg-slate-50 text-[#1d1d1f] rounded-xl font-semibold text-xs">
              Отмена
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#0b57d0] hover:bg-[#094cb3] text-white font-semibold text-xs shadow-sm">
              Создать склад
            </button>
          </div>
        </form>
      )}

      {/* Tabs Content */}
      {activeTab === 'products' && (
        <div className="bg-white border border-[#e3e3e8] p-6 rounded-2xl shadow-sm">
          <h4 className="font-bold text-[#1d1d1f] text-sm mb-4 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-[#5f6368]" />
            Каталог товаров ({products.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e3e3e8] bg-[#f8f9fa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                  <th className="p-3">Фото</th>
                  <th className="p-3">Товар</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Ед. изм.</th>
                  <th className="p-3">Цена</th>
                  <th className="p-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e3e8]/60 text-xs">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=60';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#f8f9fa] border border-[#e3e3e8] flex items-center justify-center text-[10px] text-slate-400 font-bold">Фото нет</div>
                      )}
                    </td>
                    <td className="p-3 font-bold text-[#1d1d1f]">{p.name}</td>
                    <td className="p-3 text-[#5f6368] font-mono">{p.sku}</td>
                    <td className="p-3 text-[#5f6368]">{p.unit}</td>
                    <td className="p-3 font-bold text-[#1d1d1f]">{parseFloat(p.price || 0).toFixed(2)} TJS</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-2 rounded-xl border border-[#e3e3e8] hover:bg-[#f8f9fa] text-[#5f6368]"
                          title="Редактировать"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 rounded-xl border border-[#e3e3e8] hover:bg-rose-50 text-rose-600 hover:border-rose-200"
                          title="Удалить"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'stocks' && (
        <div className="bg-white border border-[#e3e3e8] p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-1.5">
              <Map className="w-4 h-4 text-[#5f6368]" />
              Складские остатки
            </h4>
            <select 
              value={selectedWarehouseId} 
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-2.5 text-xs font-bold text-[#1d1d1f]"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e3e3e8] bg-[#f8f9fa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                  <th className="p-3">Товар</th>
                  <th className="p-3">Единица</th>
                  <th className="p-3">Текущий запас</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e3e8]/60 text-xs">
                {stocks.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center p-6 text-slate-400 font-bold">На этом складе нет товаров</td>
                  </tr>
                ) : (
                  stocks.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-[#1d1d1f]">{item.product?.name}</td>
                      <td className="p-3 text-[#5f6368]">{item.product?.unit}</td>
                      <td className="p-3">
                        <span className="font-mono bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-100">
                          {parseFloat(item.quantity).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {showSupplierForm && (
            <form onSubmit={handleCreateOrUpdateSupplier} className="bg-white border border-[#e3e3e8] p-6 rounded-2xl space-y-4 max-w-2xl shadow-sm">
              <h4 className="font-bold text-[#1d1d1f] text-sm">
                {editingSupplier ? 'Редактировать поставщика' : 'Добавить поставщика'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Имя / Компания*"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
                />
                <input
                  type="text"
                  placeholder="Телефон"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
                />
                <input
                  type="text"
                  placeholder="Адрес"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowSupplierForm(false); setEditingSupplier(null); }} className="px-4 py-2 border border-[#e3e3e8] hover:bg-slate-50 text-[#1d1d1f] rounded-xl font-semibold text-xs">
                  Отмена
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#0b57d0] hover:bg-[#094cb3] text-white font-semibold text-xs shadow-sm">
                  {editingSupplier ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-[#e3e3e8] p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#5f6368]" />
                Список поставщиков
              </h4>
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setSupName('');
                  setSupPhone('');
                  setSupAddress('');
                  setShowSupplierForm(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0b57d0] hover:bg-[#094cb3] text-white rounded-xl font-bold text-xs transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить поставщика</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e3e3e8] bg-[#f8f9fa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                    <th className="p-3">Наименование</th>
                    <th className="p-3">Телефон</th>
                    <th className="p-3">Адрес</th>
                    <th className="p-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e3e8]/60 text-xs">
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center p-6 text-slate-400 font-bold">Список поставщиков пуст</td>
                    </tr>
                  ) : (
                    suppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-[#1d1d1f]">{s.name}</td>
                        <td className="p-3 text-[#5f6368]">{s.phone || '—'}</td>
                        <td className="p-3 text-[#5f6368]">{s.address || '—'}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingSupplier(s);
                                setSupName(s.name);
                                setSupPhone(s.phone || '');
                                setSupAddress(s.address || '');
                                setShowSupplierForm(true);
                              }}
                              className="p-2 rounded-xl border border-[#e3e3e8] hover:bg-[#f8f9fa] text-[#5f6368]"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(s.id)}
                              className="p-2 rounded-xl border border-[#e3e3e8] hover:bg-rose-50 text-rose-600 hover:border-rose-200"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'incoming' && (
        <div className="space-y-4">
          {showProcurementForm && (
            <form onSubmit={handleCreateProcurement} className="bg-white border border-[#e3e3e8] p-6 rounded-2xl space-y-4 max-w-3xl shadow-sm">
              <h4 className="font-bold text-[#1d1d1f] text-sm">Оформить приход товара</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#86868b] uppercase mb-1">Поставщик</label>
                  <select
                    required
                    value={procSupplierId}
                    onChange={(e) => setProcSupplierId(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none"
                  >
                    <option value="">Выберите поставщика</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#86868b] uppercase mb-1">Склад поступления</label>
                  <select
                    required
                    value={procWarehouseId}
                    onChange={(e) => setProcWarehouseId(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none"
                  >
                    <option value="">Выберите склад</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Items Sub-form */}
              <div className="border-t border-[#e3e3e8] pt-4">
                <h5 className="font-bold text-[#1d1d1f] text-xs mb-3">Состав поставки</h5>
                
                <button
                  type="button"
                  onClick={() => setProcItems([...procItems, { productId: '', quantity: 1, price: 0 }])}
                  className="mb-3 flex items-center gap-1.5 px-3 py-1.5 border border-[#e3e3e8] hover:bg-slate-50 rounded-xl font-bold text-xs text-[#1d1d1f]"
                >
                  <Plus className="w-3.5 h-3.5" /> Добавить товар
                </button>

                {procItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3 mb-2 items-center">
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => {
                        const next = [...procItems];
                        next[idx].productId = e.target.value;
                        setProcItems(next);
                      }}
                      className="flex-1 bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-2.5 text-xs"
                    >
                      <option value="">Выберите товар</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>

                    <input
                      type="number"
                      placeholder="Кол-во"
                      required
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const next = [...procItems];
                        next[idx].quantity = parseFloat(e.target.value) || 0;
                        setProcItems(next);
                      }}
                      className="w-24 bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-2.5 text-xs"
                    />

                    <input
                      type="number"
                      placeholder="Цена за ед."
                      required
                      min="0"
                      step="any"
                      value={item.price || ''}
                      onChange={(e) => {
                        const next = [...procItems];
                        next[idx].price = parseFloat(e.target.value) || 0;
                        setProcItems(next);
                      }}
                      className="w-28 bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-2.5 text-xs"
                    />

                    <button
                      type="button"
                      onClick={() => setProcItems(procItems.filter((_, i) => i !== idx))}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end border-t border-[#e3e3e8] pt-4">
                <button type="button" onClick={() => setShowProcurementForm(false)} className="px-4 py-2 border border-[#e3e3e8] hover:bg-slate-50 text-[#1d1d1f] rounded-xl font-semibold text-xs">
                  Отмена
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#0b57d0] hover:bg-[#094cb3] text-white font-semibold text-xs shadow-sm">
                  Создать приход
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-[#e3e3e8] p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-[#5f6368]" />
                Журнал приходов
              </h4>
              <button
                onClick={() => {
                  setProcItems([]);
                  setShowProcurementForm(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0b57d0] hover:bg-[#094cb3] text-white rounded-xl font-bold text-xs transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Оформить приход</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e3e3e8] bg-[#f8f9fa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                    <th className="p-3">ID</th>
                    <th className="p-3">Поставщик</th>
                    <th className="p-3">Склад</th>
                    <th className="p-3">Сумма</th>
                    <th className="p-3">Статус</th>
                    <th className="p-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e3e8]/60 text-xs">
                  {procurements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-6 text-slate-400 font-bold">Нет оформленных приходов</td>
                    </tr>
                  ) : (
                    procurements.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-[10px] text-[#5f6368]">{p.id.slice(0, 8)}...</td>
                        <td className="p-3 font-bold text-[#1d1d1f]">{p.supplier?.name}</td>
                        <td className="p-3 text-[#5f6368]">{p.warehouse?.name}</td>
                        <td className="p-3 font-bold text-[#1d1d1f]">{parseFloat(p.totalAmount || 0).toFixed(2)} TJS</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            p.status === 'completed' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {p.status === 'completed' ? 'Проведён' : 'Черновик'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {p.status !== 'completed' && (
                            <button
                              onClick={() => handleApproveProcurement(p.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition-all shadow-sm"
                            >
                              <Check className="w-3 h-3" /> Провести
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="space-y-4">
          {showMovementForm && (
            <form onSubmit={handleCreateMovement} className="bg-white border border-[#e3e3e8] p-6 rounded-2xl space-y-4 max-w-3xl shadow-sm">
              <h4 className="font-bold text-[#1d1d1f] text-sm">Новое перемещение</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#86868b] uppercase mb-1">Склад отправитель</label>
                  <select
                    required
                    value={movFromWarehouseId}
                    onChange={(e) => setMovFromWarehouseId(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none"
                  >
                    <option value="">Выберите склад отправления</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#86868b] uppercase mb-1">Склад получатель</label>
                  <select
                    required
                    value={movToWarehouseId}
                    onChange={(e) => setMovToWarehouseId(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none"
                  >
                    <option value="">Выберите склад назначения</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Items Sub-form */}
              <div className="border-t border-[#e3e3e8] pt-4">
                <h5 className="font-bold text-[#1d1d1f] text-xs mb-3">Состав перемещения</h5>
                
                <button
                  type="button"
                  onClick={() => setMovItems([...movItems, { productId: '', quantity: 1 }])}
                  className="mb-3 flex items-center gap-1.5 px-3 py-1.5 border border-[#e3e3e8] hover:bg-slate-50 rounded-xl font-bold text-xs text-[#1d1d1f]"
                >
                  <Plus className="w-3.5 h-3.5" /> Добавить товар
                </button>

                {movItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3 mb-2 items-center">
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => {
                        const next = [...movItems];
                        next[idx].productId = e.target.value;
                        setMovItems(next);
                      }}
                      className="flex-1 bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-2.5 text-xs"
                    >
                      <option value="">Выберите товар</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>

                    <input
                      type="number"
                      placeholder="Кол-во"
                      required
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const next = [...movItems];
                        next[idx].quantity = parseFloat(e.target.value) || 0;
                        setMovItems(next);
                      }}
                      className="w-32 bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-2.5 text-xs"
                    />

                    <button
                      type="button"
                      onClick={() => setMovItems(movItems.filter((_, i) => i !== idx))}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end border-t border-[#e3e3e8] pt-4">
                <button type="button" onClick={() => setShowMovementForm(false)} className="px-4 py-2 border border-[#e3e3e8] hover:bg-slate-50 text-[#1d1d1f] rounded-xl font-semibold text-xs">
                  Отмена
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#0b57d0] hover:bg-[#094cb3] text-white font-semibold text-xs shadow-sm">
                  Создать перемещение
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-[#e3e3e8] p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4 text-[#5f6368]" />
                Журнал перемещений
              </h4>
              <button
                onClick={() => {
                  setMovItems([]);
                  setShowMovementForm(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0b57d0] hover:bg-[#094cb3] text-white rounded-xl font-bold text-xs transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Оформить перемещение</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e3e3e8] bg-[#f8f9fa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                    <th className="p-3">ID</th>
                    <th className="p-3">Откуда</th>
                    <th className="p-3">Куда</th>
                    <th className="p-3">Статус</th>
                    <th className="p-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e3e8]/60 text-xs">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-6 text-slate-400 font-bold">История перемещений пуста</td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const fromName = warehouses.find(w => w.id === m.fromWarehouseId)?.name || 'Неизвестно';
                      const toName = warehouses.find(w => w.id === m.toWarehouseId)?.name || 'Неизвестно';
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-[10px] text-[#5f6368]">{m.id.slice(0, 8)}...</td>
                          <td className="p-3 text-[#1d1d1f] font-semibold">{fromName}</td>
                          <td className="p-3 text-[#1d1d1f] font-semibold">{toName}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              m.status === 'completed' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {m.status === 'completed' ? 'Проведён' : 'Черновик'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {m.status !== 'completed' && (
                              <button
                                onClick={() => handleApproveMovement(m.id)}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition-all shadow-sm"
                              >
                                <Check className="w-3 h-3" /> Провести
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BULK EXCEL IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Массовый импорт товаров из Excel / 1С</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Загрузите номенклатуру за считанные секунды</p>
                </div>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Step 1: Download sample */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Шаг 1. Скачайте готовый образец таблицы</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Файл содержит колонки: Название, Артикул, Цена, Ед. изм., Категория, Штрихкод
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadProductTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-semibold whitespace-nowrap shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать .xlsx</span>
                </button>
              </div>

              {/* Step 2: Upload */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-900">Шаг 2. Выберите или перетащите заполненный файл</h4>
                <div className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-6 text-center transition-colors bg-gray-50/50">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <label className="cursor-pointer">
                    <span className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline">
                      Нажмите для выбора файла
                    </span>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                  <p className="text-[11px] text-gray-500 mt-1">Поддерживаются форматы Excel (.xlsx, .xls) и CSV</p>
                </div>
              </div>

              {/* Error notice */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Success Result */}
              {importResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Импорт успешно завершен!</span>
                  </div>
                  <div>Всего распознано: <b>{importResult.total}</b></div>
                  <div>Новых создано: <b>{importResult.created}</b></div>
                  <div>Обновлено существующих: <b>{importResult.updated}</b></div>
                </div>
              )}

              {/* Parsed Rows Preview */}
              {parsedProducts.length > 0 && !importResult && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-800">
                      Распознано товаров: <span className="text-emerald-700">{parsedProducts.length}</span>
                    </span>
                    <span className="text-[11px] text-gray-500">Первые 5 позиций для проверки:</span>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[11px]">
                        <tr>
                          <th className="p-2">Название</th>
                          <th className="p-2">Артикул</th>
                          <th className="p-2">Цена (TJS)</th>
                          <th className="p-2">Категория</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedProducts.slice(0, 5).map((p, i) => (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="p-2 font-medium text-gray-900">{p.name}</td>
                            <td className="p-2 text-gray-600">{p.sku || '—'}</td>
                            <td className="p-2 font-semibold text-emerald-700">{p.price}</td>
                            <td className="p-2 text-gray-600">{p.categoryName || 'Общая'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Закрыть
              </button>
              {parsedProducts.length > 0 && !importResult && (
                <button
                  type="button"
                  disabled={importing}
                  onClick={handleExecuteImport}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{importing ? 'Загрузка...' : `Импортировать ${parsedProducts.length} товаров`}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
