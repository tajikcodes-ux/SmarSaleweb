import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash, Gift, Percent } from 'lucide-react';

export default function Promotions() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('buy_x_get_y');
  const [triggerProductId, setTriggerProductId] = useState('');
  const [minQuantity, setMinQuantity] = useState(5);
  const [minOrderAmount, setMinOrderAmount] = useState(3000);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [bonusProductId, setBonusProductId] = useState('');
  const [bonusQuantity, setBonusQuantity] = useState(1);
  const [status, setStatus] = useState('active');

  const loadData = async () => {
    try {
      const [promoRes, prodRes] = await Promise.all([
        api.get('/promotions'),
        api.get('/catalog/products'),
      ]);
      setPromotions(promoRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Failed to load promotions data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        type,
        triggerProductId: type !== 'order_discount' ? triggerProductId : null,
        minQuantity: type !== 'order_discount' ? Number(minQuantity) : 1,
        minOrderAmount: type === 'order_discount' ? Number(minOrderAmount) : null,
        discountPercent: type !== 'buy_x_get_y' ? Number(discountPercent) : null,
        bonusProductId: type === 'buy_x_get_y' ? (bonusProductId || triggerProductId) : null,
        bonusQuantity: type === 'buy_x_get_y' ? Number(bonusQuantity) : 0,
        status,
      };

      await api.post('/promotions', payload);
      resetForm();
      setShowAddModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to create promotion', err);
      alert('Ошибка при создании акции');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo) return;
    try {
      const payload = {
        name: editingPromo.name,
        type: editingPromo.type,
        triggerProductId: editingPromo.type !== 'order_discount' ? editingPromo.triggerProductId : null,
        minQuantity: editingPromo.type !== 'order_discount' ? Number(editingPromo.minQuantity) : 1,
        minOrderAmount: editingPromo.type === 'order_discount' ? Number(editingPromo.minOrderAmount) : null,
        discountPercent: editingPromo.type !== 'buy_x_get_y' ? Number(editingPromo.discountPercent) : null,
        bonusProductId: editingPromo.type === 'buy_x_get_y' ? (editingPromo.bonusProductId || editingPromo.triggerProductId) : null,
        bonusQuantity: editingPromo.type === 'buy_x_get_y' ? Number(editingPromo.bonusQuantity) : 0,
        status: editingPromo.status,
      };

      await api.put(`/promotions/${editingPromo.id}`, payload);
      setEditingPromo(null);
      loadData();
    } catch (err) {
      console.error('Failed to update promotion', err);
      alert('Ошибка при обновлении акции');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту акцию?')) return;
    try {
      await api.delete(`/promotions/${id}`);
      loadData();
    } catch (err) {
      console.error('Failed to delete promotion', err);
    }
  };

  const resetForm = () => {
    setName('');
    setType('buy_x_get_y');
    setTriggerProductId('');
    setMinQuantity(5);
    setMinOrderAmount(3000);
    setDiscountPercent(10);
    setBonusProductId('');
    setBonusQuantity(1);
    setStatus('active');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="w-8 h-8 border-4 border-slate-200 border-t-[#37352f] rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-[#37352f]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
        <div>
          <h3 className="font-bold text-[#1d1d1f] text-base flex items-center gap-1.5">
            <Gift className="w-4.5 h-4.5 text-rose-600" />
            Промо-акции и скидки
          </h3>
          <p className="text-[11px] text-[#86868b] mt-0.5">
            Настройка автоматических маркетинговых акций, бонусов (подарков) и объемных скидок
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Создать акцию</span>
        </button>
      </div>

      {/* Grid of Promos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.map((promo) => {
          const triggerProd = products.find(p => p.id === promo.triggerProductId);
          const bonusProd = products.find(p => p.id === promo.bonusProductId);
          
          return (
            <div key={promo.id} className="bg-white border border-[#e9e9e7] rounded-xl p-5 shadow-sm space-y-4 relative hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-1.5">
                      {promo.type === 'buy_x_get_y' ? (
                        <Gift className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Percent className="w-4 h-4 text-emerald-600" />
                      )}
                      {promo.name}
                    </h4>
                    <span className="text-[9px] text-[#86868b] uppercase tracking-wider font-bold block mt-1">
                      {promo.type === 'buy_x_get_y' && 'Подарок при покупке (X+Y)'}
                      {promo.type === 'volume_discount' && 'Скидка за объем позиции'}
                      {promo.type === 'order_discount' && 'Скидка на весь чек'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingPromo(promo)}
                      className="p-1 hover:bg-slate-50 text-slate-500 hover:text-[#0071e3] rounded"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="p-1 hover:bg-slate-50 text-slate-500 hover:text-rose-600 rounded"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                  {promo.type === 'buy_x_get_y' && (
                    <>
                      <div>
                        <span className="text-slate-400">Условие:</span> Купить{' '}
                        <strong>{promo.minQuantity} шт.</strong> товара{' '}
                        <span className="font-medium text-slate-700">{triggerProd ? triggerProd.name : '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Бонус:</span> Получить{' '}
                        <strong>{promo.bonusQuantity} шт.</strong> бесплатно товара{' '}
                        <span className="font-medium text-rose-600">{bonusProd ? bonusProd.name : '—'}</span>
                      </div>
                    </>
                  )}

                  {promo.type === 'volume_discount' && (
                    <>
                      <div>
                        <span className="text-slate-400">Условие:</span> Купить от{' '}
                        <strong>{promo.minQuantity} шт.</strong> товара{' '}
                        <span className="font-medium text-slate-700">{triggerProd ? triggerProd.name : '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Скидка:</span>{' '}
                        <strong className="text-emerald-600">-{promo.discountPercent}%</strong> на эту позицию
                      </div>
                    </>
                  )}

                  {promo.type === 'order_discount' && (
                    <>
                      <div>
                        <span className="text-slate-400">Условие:</span> Сумма заказа от{' '}
                        <strong className="font-mono">{promo.minOrderAmount} TJS</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Скидка на чек:</span>{' '}
                        <strong className="text-emerald-600">-{promo.discountPercent}%</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-50 pt-3 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  promo.status === 'active' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {promo.status === 'active' ? 'Активна' : 'Черновик'}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {new Date(promo.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white border border-[#e9e9e7] rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h4 className="font-bold text-[#1d1d1f] text-sm">Создать промо-акцию</h4>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6a6a65]">Название акции*</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Colgate 5+1"
                className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6a6a65]">Тип акции*</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
              >
                <option value="buy_x_get_y">Подарок при покупке (Buy X Get Y)</option>
                <option value="volume_discount">Скидка за объем товара</option>
                <option value="order_discount">Скидка на общую сумму чека</option>
              </select>
            </div>

            {type !== 'order_discount' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6a65]">Целевой товар*</label>
                  <select
                    required
                    value={triggerProductId}
                    onChange={(e) => setTriggerProductId(e.target.value)}
                    className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="">Выберите товар...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6a65]">Минимальное количество для активации*</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(parseInt(e.target.value) || 1)}
                    className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
              </>
            )}

            {type === 'order_discount' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Минимальная сумма заказа (TJS)*</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(parseFloat(e.target.value) || 0)}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none font-mono"
                />
              </div>
            )}

            {type !== 'buy_x_get_y' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Процент скидки (%)*</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>
            )}

            {type === 'buy_x_get_y' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6a65]">Бонусный товар (Подарок)*</label>
                  <select
                    value={bonusProductId}
                    onChange={(e) => setBonusProductId(e.target.value)}
                    className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="">Такой же товар</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6a65]">Количество бонусов*</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={bonusQuantity}
                    onChange={(e) => setBonusQuantity(parseInt(e.target.value) || 1)}
                    className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6a6a65]">Статус*</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
              >
                <option value="active">Активна</option>
                <option value="inactive">Выключена (Черновик)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#e9e9e7]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-1.5 border border-[#e9e9e7] rounded-lg text-xs font-semibold text-[#6a6a65] hover:bg-[#fbfbfa]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg text-xs font-bold"
              >
                Создать
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingPromo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdate} className="bg-white border border-[#e9e9e7] rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h4 className="font-bold text-[#1d1d1f] text-sm">Редактировать промо-акцию</h4>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6a6a65]">Название акции*</label>
              <input
                type="text"
                required
                value={editingPromo.name}
                onChange={(e) => setEditingPromo({ ...editingPromo, name: e.target.value })}
                className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6a6a65]">Тип акции*</label>
              <select
                value={editingPromo.type}
                onChange={(e) => setEditingPromo({ ...editingPromo, type: e.target.value })}
                className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
              >
                <option value="buy_x_get_y">Подарок при покупке (Buy X Get Y)</option>
                <option value="volume_discount">Скидка за объем товара</option>
                <option value="order_discount">Скидка на общую сумму чека</option>
              </select>
            </div>

            {editingPromo.type !== 'order_discount' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6a65]">Целевой товар*</label>
                  <select
                    required
                    value={editingPromo.triggerProductId || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, triggerProductId: e.target.value })}
                    className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="">Выберите товар...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6a65]">Минимальное количество для активации*</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingPromo.minQuantity}
                    onChange={(e) => setEditingPromo({ ...editingPromo, minQuantity: parseInt(e.target.value) || 1 })}
                    className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
              </>
            )}

            {editingPromo.type === 'order_discount' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Минимальная сумма заказа (TJS)*</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editingPromo.minOrderAmount || 0}
                  onChange={(e) => setEditingPromo({ ...editingPromo, minOrderAmount: parseFloat(e.target.value) || 0 })}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none font-mono"
                />
              </div>
            )}

            {editingPromo.type !== 'buy_x_get_y' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6a6a65]">Процент скидки (%)*</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={editingPromo.discountPercent || 0}
                  onChange={(e) => setEditingPromo({ ...editingPromo, discountPercent: parseInt(e.target.value) || 0 })}
                  className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>
            )}

            {editingPromo.type === 'buy_x_get_y' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6a65]">Бонусный товар (Подарок)*</label>
                  <select
                    value={editingPromo.bonusProductId || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, bonusProductId: e.target.value })}
                    className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="">Такой же товар</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#6a6a65]">Количество бонусов*</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingPromo.bonusQuantity}
                    onChange={(e) => setEditingPromo({ ...editingPromo, bonusQuantity: parseInt(e.target.value) || 1 })}
                    className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6a6a65]">Статус*</label>
              <select
                value={editingPromo.status}
                onChange={(e) => setEditingPromo({ ...editingPromo, status: e.target.value })}
                className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none"
              >
                <option value="active">Активна</option>
                <option value="inactive">Выключена (Черновик)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#e9e9e7]">
              <button
                type="button"
                onClick={() => setEditingPromo(null)}
                className="px-3.5 py-1.5 border border-[#e9e9e7] rounded-lg text-xs font-semibold text-[#6a6a65] hover:bg-[#fbfbfa]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg text-xs font-bold"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
