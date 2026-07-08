import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash, MapPin } from 'lucide-react';

export default function Branches() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [editingBranch, setEditingBranch] = useState<any>(null);

  const loadBranches = async () => {
    try {
      const response = await api.get('/branches');
      setBranches(response.data || []);
    } catch (err) {
      console.error('Failed to load branches', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    try {
      await api.post('/branches', { name: newBranchName });
      setNewBranchName('');
      setShowAddModal(false);
      loadBranches();
    } catch (err) {
      console.error('Failed to create branch', err);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !editingBranch.name.trim()) return;
    try {
      await api.put(`/branches/${editingBranch.id}`, { name: editingBranch.name });
      setEditingBranch(null);
      loadBranches();
    } catch (err) {
      console.error('Failed to update branch', err);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот филиал?')) return;
    try {
      await api.delete(`/branches/${id}`);
      loadBranches();
    } catch (err) {
      console.error('Failed to delete branch', err);
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
    <div className="space-y-6 animate-fadeIn text-[#37352f]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-5 border border-[#e9e9e7] rounded-xl shadow-sm">
        <div>
          <h3 className="font-bold text-[#1d1d1f] text-base flex items-center gap-1.5">
            <MapPin className="w-4.5 h-4.5 text-[#37352f]" />
            Филиалы Компании
          </h3>
          <p className="text-[11px] text-[#86868b] mt-0.5">
            Управление региональными филиалами дистрибуции ЧДММ "Сомон Камолот"
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-semibold text-xs transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить филиал</span>
        </button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div key={branch.id} className="bg-white border border-[#e9e9e7] rounded-xl p-5 shadow-sm space-y-4 relative hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-[#1d1d1f] text-sm">{branch.name}</h4>
                <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{branch.id}</span>
              </div>
              <div className="flex gap-1.5 font-sans">
                <button
                  onClick={() => setEditingBranch(branch)}
                  className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-[#0071e3] rounded-lg transition-colors border border-transparent hover:border-slate-100"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteBranch(branch.id)}
                  className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-slate-100"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-[#e9e9e7]/60 pt-4 text-center">
              <div className="bg-[#fbfbfa] p-2 rounded-lg border border-[#e9e9e7]/40">
                <div className="text-base font-bold text-slate-700">{branch._count?.users || 0}</div>
                <div className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider mt-0.5">Агенты</div>
              </div>
              <div className="bg-[#fbfbfa] p-2 rounded-lg border border-[#e9e9e7]/40">
                <div className="text-base font-bold text-slate-700">{branch._count?.clients || 0}</div>
                <div className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider mt-0.5">Клиенты</div>
              </div>
              <div className="bg-[#fbfbfa] p-2 rounded-lg border border-[#e9e9e7]/40">
                <div className="text-base font-bold text-slate-700">{branch._count?.warehouses || 0}</div>
                <div className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider mt-0.5">Склады</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateBranch} className="bg-white border border-[#e9e9e7] rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h4 className="font-bold text-[#1d1d1f] text-sm">Добавить новый филиал</h4>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6a6a65]">Название филиала*</label>
              <input
                type="text"
                required
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Например, Худжандский филиал"
                className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3]"
              />
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
      {editingBranch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdateBranch} className="bg-white border border-[#e9e9e7] rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h4 className="font-bold text-[#1d1d1f] text-sm">Редактировать филиал</h4>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6a6a65]">Название филиала*</label>
              <input
                type="text"
                required
                value={editingBranch.name}
                onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                className="bg-[#fbfbfa] border border-[#e9e9e7] rounded-lg p-2 text-xs focus:outline-none focus:border-[#0071e3]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#e9e9e7]">
              <button
                type="button"
                onClick={() => setEditingBranch(null)}
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
