import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Package, Map, Edit, Trash } from 'lucide-react';

export default function Catalog() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
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
      const [prodRes, catRes, whRes] = await Promise.all([
        api.get('/catalog/products'),
        api.get('/catalog/categories'),
        api.get('/stocks/warehouses'),
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setWarehouses(whRes.data);
      if (whRes.data.length > 0) {
        setSelectedWarehouseId(whRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load catalog', err);
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="w-8 h-8 border-4 border-slate-200 border-t-[#37352f] rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Upper header */}
      <div className="flex justify-between items-center bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
        <div>
          <h3 className="font-bold text-[#1d1d1f] text-base">Каталог товаров и Склады</h3>
          <p className="text-[11px] text-[#86868b] mt-0.5">Номенклатурный справочник товаров, остатков по складам дистрибуции</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (showProductForm) {
                setShowProductForm(false);
                setEditingProduct(null);
              } else {
                handleOpenCreateProduct();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Товар</span>
          </button>
          <button
            onClick={() => setShowWarehouseForm(!showWarehouseForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e9e9e7] hover:bg-[#f5f5f7] rounded-lg font-semibold text-xs transition-all text-[#37352f] shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Склад</span>
          </button>
        </div>
      </div>

      {showProductForm && (
        <form onSubmit={handleCreateOrUpdateProduct} className="bg-white border border-[#e9e9e7] p-5 rounded-xl space-y-4 max-w-2xl shadow-sm">
          <h4 className="font-bold text-[#1d1d1f] text-xs">
            {editingProduct ? 'Редактировать товар' : 'Новый товар'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Наименование товара*"
              required
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <input
              type="text"
              placeholder="Артикул (SKU)*"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <input
              type="number"
              step="any"
              placeholder="Цена (TJS)*"
              required
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value))}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f]"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f]"
            >
              <option value="pcs">Штука (pcs)</option>
              <option value="kg">Килограмм (kg)</option>
              <option value="box">Коробка (box)</option>
            </select>
            <select
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f]"
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
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs shadow-sm">
            {editingProduct ? 'Сохранить изменения' : 'Создать товар'}
          </button>
        </form>
      )}

      {showWarehouseForm && (
        <form onSubmit={handleCreateWarehouse} className="bg-white border border-[#e9e9e7] p-5 rounded-xl space-y-4 max-w-2xl shadow-sm">
          <h4 className="font-bold text-[#1d1d1f] text-xs">Новый склад</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Название склада*"
              required
              value={whName}
              onChange={(e) => setWhName(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
            <input
              type="text"
              placeholder="Адрес склада"
              value={whAddress}
              onChange={(e) => setWhAddress(e.target.value)}
              className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0071e3] text-[#37352f] placeholder-slate-400"
            />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs shadow-sm">
            Создать склад
          </button>
        </form>
      )}

      {/* Grid listing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products List */}
        <div className="lg:col-span-2 bg-white border border-[#e9e9e7] p-5 rounded-xl flex flex-col shadow-sm">
          <h4 className="font-bold text-[#1d1d1f] text-sm mb-4 flex items-center gap-1.5">
            <Package className="w-4.5 h-4.5 text-[#37352f]" />
            Каталог товаров
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e9e9e7] bg-[#fbfbfa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                  <th className="p-3">Фото</th>
                  <th className="p-3">Товар</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Ед. изм.</th>
                  <th className="p-3">Цена</th>
                  <th className="p-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9e9e7]/60 text-xs">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#fbfbfa]">
                    <td className="p-3">
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-8 h-8 rounded-md object-cover border border-slate-200" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=60';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-[#f5f5f7] border border-[#e9e9e7] flex items-center justify-center text-[10px] text-slate-400 font-bold">No Photo</div>
                      )}
                    </td>
                    <td className="p-3 font-bold text-[#37352f]">{p.name}</td>
                    <td className="p-3 text-[#6a6a65] font-mono">{p.sku}</td>
                    <td className="p-3 text-[#6a6a65]">{p.unit}</td>
                    <td className="p-3 font-bold text-[#37352f]">{parseFloat(p.price || 0).toFixed(2)} TJS</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-1.5 rounded-lg border border-[#e3e3e8] hover:bg-[#f8f9fa] text-[#5f6368]"
                          title="Редактировать"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-lg border border-[#e3e3e8] hover:bg-rose-50 text-rose-600 hover:border-rose-200"
                          title="Удалить"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warehouses list */}
        <div className="bg-white border border-[#e9e9e7] p-5 rounded-xl flex flex-col shadow-sm h-fit">
          <h4 className="font-bold text-[#1d1d1f] text-sm mb-4 flex items-center gap-1.5">
            <Map className="w-4.5 h-4.5 text-[#37352f]" />
            Складские остатки
          </h4>
          <select 
            value={selectedWarehouseId} 
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="w-full bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none mb-4 text-[#37352f] font-semibold"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <div className="max-h-[350px] overflow-y-auto pr-1 text-xs">
            {stocks.length === 0 ? (
              <p className="text-slate-400 font-bold text-center py-4">Нет товаров на складе</p>
            ) : (
              <div className="space-y-3">
                {stocks.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b border-[#e9e9e7]/50 pb-2">
                    <span className="font-semibold text-[#37352f] line-clamp-1 max-w-[150px]">{item.product?.name}</span>
                    <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-bold text-[#6a6a65]">
                      {parseFloat(item.quantity).toFixed(0)} шт
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
