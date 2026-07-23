import { useEffect, useState } from 'react';
import api from '../services/api';
import { DollarSign, Plus, Calendar, User, FileText, Filter, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

export default function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [salesRepCanCollectPayment, setSalesRepCanCollectPayment] = useState(true);
  const [deliveryDriverCanCollectPayment, setDeliveryDriverCanCollectPayment] = useState(false);

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isFinanceManager = currentUser && ['OWNER', 'FINANCIER', 'ACCOUNTANT'].includes(currentUser.role);

  const handleToggleSalesRep = async (val: boolean) => {
    try {
      setSalesRepCanCollectPayment(val);
      await api.patch('/companies/payment-settings', { salesRepCanCollectPayment: val });
    } catch (err) {
      console.error(err);
      alert('Не удалось сохранить настройки');
    }
  };

  const handleToggleDriver = async (val: boolean) => {
    try {
      setDeliveryDriverCanCollectPayment(val);
      await api.patch('/companies/payment-settings', { deliveryDriverCanCollectPayment: val });
    } catch (err) {
      console.error(err);
      alert('Не удалось сохранить настройки');
    }
  };

  const handleReconcile = async (paymentId: string, action: 'verify' | 'reject') => {
    try {
      await api.patch(`/payments/${paymentId}/reconcile`, { action });
      loadData();
    } catch (err: any) {
      console.error('Reconciliation failed', err);
      alert(err.response?.data?.message || 'Ошибка сверки платежа');
    }
  };

  // Filter states
  const [selectedClient, setSelectedClient] = useState('all');

  // Modal states
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      const [paymentRes, clientRes, settingsRes] = await Promise.all([
        api.get('/payments').catch(() => ({ data: [] })),
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/companies/payment-settings').catch(() => ({ data: { salesRepCanCollectPayment: true, deliveryDriverCanCollectPayment: false } })),
      ]);
      setPayments(paymentRes.data);
      setClients(clientRes.data);
      setSalesRepCanCollectPayment(settingsRes.data.salesRepCanCollectPayment);
      setDeliveryDriverCanCollectPayment(settingsRes.data.deliveryDriverCanCollectPayment);

      if (clientRes.data.length > 0) {
        setClientId(clientRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load payments data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const closeForm = () => {
    setShowAddForm(false);
    setAmount('');
    setNotes('');
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/payments', {
        clientId,
        amount: parseFloat(amount),
        paymentMethod,
        notes,
      });
      closeForm();
      loadData();
    } catch (err: any) {
      console.error('Failed to register payment', err);
      alert(err.response?.data?.message || 'Ошибка при регистрации платежа');
    }
  };

  const filteredPayments = payments.filter((p) => {
    return selectedClient === 'all' || p.clientId === selectedClient;
  });

  const totalCollected = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

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
          <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight flex items-center gap-1.5">
            <DollarSign className="w-5 h-5 text-[#0071e3]" />
            Инкассация и Оплаты
          </h1>
          <p className="text-xs text-[#86868b] mt-0.5">Регистрация поступивших платежей от торговых точек и контроль дебиторской задолженности</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#37352f] hover:bg-[#4a4944] text-white font-semibold text-xs transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Принять оплату</span>
        </button>
      </div>

      {/* Payment Collection Permissions Settings for Owners/SuperAdmins */}
      {currentUser && ['OWNER', 'SUPER_ADMIN'].includes(currentUser.role) && (
        <div className="bg-white border border-[#e9e9e7] rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f]">Настройки приема оплаты в мобильном приложении</h3>
            <p className="text-[11px] text-[#86868b] mt-0.5">Укажите, какие роли сотрудников имеют право принимать и регистрировать денежные средства от торговых точек.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            <div className="flex items-center justify-between bg-[#fbfbfa] border border-[#f1f1f0] p-4 rounded-xl">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#37352f]">Торговые представители (Sales Reps)</span>
                <span className="text-[10px] text-[#86868b] mt-0.5">Могут проводить инкассацию оплат при визите</span>
              </div>
              <button
                onClick={() => handleToggleSalesRep(!salesRepCanCollectPayment)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  salesRepCanCollectPayment ? 'bg-[#0071e3]' : 'bg-slate-200'
                }`}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 shadow-sm"
                  style={{ transform: salesRepCanCollectPayment ? 'translateX(22px)' : 'translateX(4px)' }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between bg-[#fbfbfa] border border-[#f1f1f0] p-4 rounded-xl">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#37352f]">Водители-экспедиторы (Delivery Drivers)</span>
                <span className="text-[10px] text-[#86868b] mt-0.5">Могут принимать наложенный платеж при доставке</span>
              </div>
              <button
                onClick={() => handleToggleDriver(!deliveryDriverCanCollectPayment)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  deliveryDriverCanCollectPayment ? 'bg-[#0071e3]' : 'bg-slate-200'
                }`}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 shadow-sm"
                  style={{ transform: deliveryDriverCanCollectPayment ? 'translateX(22px)' : 'translateX(4px)' }}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters & KPI Summary bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filter panel */}
        <div className="bg-[#ffffff] border border-[#e9e9e7] rounded-xl p-4 flex gap-4 items-center shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#86868b]">
            <Filter className="w-3.5 h-3.5" />
            <span>Фильтр:</span>
          </div>

          <div className="flex flex-col gap-1 w-full max-w-xs">
            <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Розничная точка</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="bg-[#f5f5f7] border border-[#e9e9e7] rounded-lg px-2.5 py-1 text-xs text-[#37352f] font-medium focus:outline-none"
            >
              <option value="all">Все клиенты</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Total Collected KPI */}
        <div className="bg-white border border-[#e9e9e7] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Всего инкассировано</span>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              {totalCollected.toLocaleString()} TJS
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-200 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Payments Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl border border-[#e9e9e7] p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="font-bold text-sm text-[#1d1d1f] mb-4">Внесение оплаты</h3>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Клиент</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="bg-[#f5f5f7] border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs focus:outline-none"
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Долг: {c.currentDebt} TJS)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Сумма (TJS)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Например: 1200.50"
                  className="bg-[#f5f5f7] border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Способ оплаты</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="bg-[#f5f5f7] border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="CASH">Наличные (CASH)</option>
                  <option value="BANK_TRANSFER">Безналичный расчет (BANK)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Примечания</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Дополнительная информация"
                  className="bg-[#f5f5f7] border border-[#e9e9e7] rounded-lg px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-3.5 py-1.5 rounded-lg border border-[#e9e9e7] bg-white text-xs font-semibold text-[#86868b] hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments table */}
      <div className="bg-white border border-[#e9e9e7] rounded-xl overflow-x-auto shadow-sm">
        <div className="p-4 border-b border-[#e9e9e7] bg-[#f5f5f7] flex items-center gap-2 font-bold text-xs text-[#1d1d1f]">
          <CheckCircle2 className="w-4 h-4 text-[#86868b]" />
          <span>Реестр поступивших платежей</span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e9e9e7] bg-[#fbfbfa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
              <th className="p-3.5">Дата платежа</th>
              <th className="p-3.5">Клиент</th>
              <th className="p-3.5">Агент (Собрал)</th>
              <th className="p-3.5">Способ оплаты</th>
              <th className="p-3.5 text-right">Сумма (TJS)</th>
              <th className="p-3.5">Статус</th>
              <th className="p-3.5">Примечания</th>
              {isFinanceManager && <th className="p-3.5 text-center">Сверка</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9e9e7]/60 text-xs">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={isFinanceManager ? 8 : 7} className="p-8 text-center text-slate-400 italic">
                  Платежи не найдены.
                </td>
              </tr>
            ) : (
              filteredPayments.map((item) => (
                <tr key={item.id} className="hover:bg-[#fbfbfa] transition-colors">
                  <td className="p-3.5 text-[#86868b]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="p-3.5 font-bold text-[#37352f]">
                    {item.client?.name || 'Удаленный клиент'}
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {item.salesRep ? `${item.salesRep.firstName} ${item.salesRep.lastName}` : 'Администратор'}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      item.paymentMethod === 'CASH' 
                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {item.paymentMethod === 'CASH' ? 'Наличные' : 'Безналичный'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-emerald-700 font-mono">
                    +{parseFloat(item.amount).toFixed(2)}
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      item.status === 'verified' 
                        ? 'bg-green-50 text-green-700 border border-green-100'
                        : item.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {item.status === 'verified' ? 'Подтвержден' : item.status === 'rejected' ? 'Отклонен' : 'На сверке'}
                    </span>
                  </td>
                  <td className="p-3.5 text-[#6a6a65]">
                    <div className="flex items-center gap-1.5 max-w-xs truncate">
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{item.notes || '—'}</span>
                    </div>
                  </td>
                  {isFinanceManager && (
                    <td className="p-3.5 text-center">
                      {item.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleReconcile(item.id, 'verify')}
                            title="Подтвердить получение наличных"
                            className="p-1.5 rounded bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleReconcile(item.id, 'reject')}
                            title="Отклонить (возврат долга клиенту)"
                            className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-colors"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#86868b] italic">
                          {item.status === 'verified' ? 'Сверено' : 'Отклонено'}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
