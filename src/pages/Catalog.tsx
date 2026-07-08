import { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  Plus, Package, Map, Edit, Trash, Users, Truck, ArrowLeftRight, Check, X, ClipboardList 
} from 'lucide-react';

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

  // Form states (Products & Warehouses)
  const [showProductForm, setShowProductForm] = useState(false);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [prodName, setProdName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState(0);
  const [unit, setUnit] = useState('pcs');
  const [catId, setCatId] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [whName, setWhName] = useState('');
  const [whAddress, setWhAddress] = useState('');

  const loadCatalog = async () => {
    try {
      const [prodRes, catRes, whRes, supRes, procRes, movRes] = await Promise.all([
        api.get('/catalog/products'),
        api.get('/catalog/categories'),
        api.get('/stocks/warehouses'),
        api.get('/procurements/suppliers'),
        api.get('/procurements/incoming'),
        api.get('/procurements/movements'),
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setWarehouses(whRes.data);
      setSuppliers(supRes.data);
      setProcurements(procRes.data);
      setMovements(movRes.data);

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

  // Warehouse Create
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/stocks/warehouses', {
        name: whName,
        address: whAddress,
      });
      setShowWarehouseForm(false);
      loadCatalog();
      setWhName('');
      setWhAddress('');
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
            onClick={handleOpenCreateProduct}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0b57d0] hover:bg-[#094cb3] text-white rounded-xl font-bold text-xs transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Новый товар</span>
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
          <Truck className="w-3.5 h-3.5 inline-block mr-1.5 align-text-bottom" />
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
            <select
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              className="bg-[#f8f9fa] border border-[#e3e3e8] rounded-xl p-3 text-xs focus:outline-none focus:border-[#0b57d0] text-[#1d1d1f]"
            >
              <option value="">Выберите категорию</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
    </div>
  );
}
