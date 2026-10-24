import { useState, useRef, useEffect } from 'react';
import { Building2, Tag, MapPin, ChevronDown, Check, RotateCcw, Search } from 'lucide-react';
import { useScope } from '../context/ScopeContext';

export default function ScopeBar() {
  const {
    selectedBranchId,
    selectedBrandId,
    selectedZone,
    branches,
    brands,
    zones,
    setBranchId,
    setBrandId,
    setZone,
    resetAll,
    activeCount,
    selectedBranchName,
    selectedBrandName,
    refreshScopeData,
  } = useScope();

  const [openDropdown, setOpenDropdown] = useState<'branch' | 'brand' | 'zone' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const barRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (type: 'branch' | 'brand' | 'zone') => {
    if (openDropdown === type) {
      setOpenDropdown(null);
      setSearchQuery('');
    } else {
      if (branches.length === 0 || brands.length === 0) {
        refreshScopeData();
      }
      setOpenDropdown(type);
      setSearchQuery('');
    }
  };

  const filteredBrands = brands.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredBranches = branches.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredZones = zones.filter((z) => z.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div ref={barRef} className="flex items-center gap-1.5 relative text-xs">
      {/* 🏢 BRANCH PILL */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown('branch')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs ${
            selectedBranchId
              ? 'bg-blue-50/90 border-blue-200 text-[#0b57d0] font-bold shadow-sm'
              : 'bg-[#f8f9fa] hover:bg-white border-[#e3e3e8] text-[#5f6368] hover:text-[#1d1d1f]'
          }`}
          title="Фильтр по филиалу компании"
        >
          <Building2 className={`w-3.5 h-3.5 ${selectedBranchId ? 'text-[#0b57d0]' : 'text-slate-400'}`} />
          <span className="max-w-[120px] truncate">{selectedBranchName}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'branch' ? 'rotate-180' : ''}`} />
        </button>

        {openDropdown === 'branch' && (
          <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-[#e3e3e8] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[11px] font-bold text-[#86868b] uppercase tracking-wider flex items-center justify-between border-b border-[#f1f3f4]">
              <span>Филиал компании</span>
              {branches.length > 0 && <span className="text-[10px] text-slate-400">{branches.length}</span>}
            </div>

            <div className="p-1.5 max-h-60 overflow-y-auto space-y-0.5">
              <button
                onClick={() => {
                  setBranchId(null);
                  setOpenDropdown(null);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  !selectedBranchId ? 'bg-blue-50 font-bold text-[#0b57d0]' : 'hover:bg-[#f8f9fa] text-[#1d1d1f]'
                }`}
              >
                <span>Все филиалы (Сводно)</span>
                {!selectedBranchId && <Check className="w-3.5 h-3.5 text-[#0b57d0]" />}
              </button>

              {filteredBranches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBranchId(b.id);
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedBranchId === b.id ? 'bg-blue-50 font-bold text-[#0b57d0]' : 'hover:bg-[#f8f9fa] text-[#1d1d1f]'
                  }`}
                >
                  <span className="truncate">{b.name}</span>
                  {selectedBranchId === b.id && <Check className="w-3.5 h-3.5 text-[#0b57d0]" />}
                </button>
              ))}

              {branches.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-slate-400 text-center">
                  Филиалы не созданы (Моно-филиал)
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🏷️ BRAND / DIRECTION PILL */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown('brand')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs ${
            selectedBrandId
              ? 'bg-indigo-50/90 border-indigo-200 text-indigo-700 font-bold shadow-sm'
              : 'bg-[#f8f9fa] hover:bg-white border-[#e3e3e8] text-[#5f6368] hover:text-[#1d1d1f]'
          }`}
          title="Фильтр по бренду / торговому направлению"
        >
          <Tag className={`w-3.5 h-3.5 ${selectedBrandId ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span className="max-w-[120px] truncate">{selectedBrandName}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'brand' ? 'rotate-180' : ''}`} />
        </button>

        {openDropdown === 'brand' && (
          <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-[#e3e3e8] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[11px] font-bold text-[#86868b] uppercase tracking-wider flex items-center justify-between border-b border-[#f1f3f4]">
              <span>Торговый бренд / Направление</span>
              {brands.length > 0 && <span className="text-[10px] text-slate-400">{brands.length}</span>}
            </div>

            {brands.length > 6 && (
              <div className="p-2 border-b border-[#f1f3f4]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Поиск бренда..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 bg-[#f1f3f4] text-xs rounded-lg border-none focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-400"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="p-1.5 max-h-60 overflow-y-auto space-y-0.5">
              <button
                onClick={() => {
                  setBrandId(null);
                  setOpenDropdown(null);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  !selectedBrandId ? 'bg-indigo-50 font-bold text-indigo-700' : 'hover:bg-[#f8f9fa] text-[#1d1d1f]'
                }`}
              >
                <span>Все бренды (Сводно)</span>
                {!selectedBrandId && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </button>

              {filteredBrands.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBrandId(b.id);
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedBrandId === b.id ? 'bg-indigo-50 font-bold text-indigo-700' : 'hover:bg-[#f8f9fa] text-[#1d1d1f]'
                  }`}
                >
                  <span className="truncate">{b.name}</span>
                  {selectedBrandId === b.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              ))}

              {brands.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-slate-400 text-center">
                  Бренды не настроены в каталоге
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 📍 ZONE / DISTRICT PILL */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown('zone')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs ${
            selectedZone
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-700 font-bold shadow-sm'
              : 'bg-[#f8f9fa] hover:bg-white border-[#e3e3e8] text-[#5f6368] hover:text-[#1d1d1f]'
          }`}
          title="Фильтр по торговой зоне / району"
        >
          <MapPin className={`w-3.5 h-3.5 ${selectedZone ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="max-w-[110px] truncate">{selectedZone || 'Все зоны'}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'zone' ? 'rotate-180' : ''}`} />
        </button>

        {openDropdown === 'zone' && (
          <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-[#e3e3e8] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[11px] font-bold text-[#86868b] uppercase tracking-wider flex items-center justify-between border-b border-[#f1f3f4]">
              <span>Торговый район / Зона</span>
              <span className="text-[10px] text-slate-400">{zones.length}</span>
            </div>

            <div className="p-1.5 max-h-60 overflow-y-auto space-y-0.5">
              <button
                onClick={() => {
                  setZone(null);
                  setOpenDropdown(null);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  !selectedZone ? 'bg-emerald-50 font-bold text-emerald-700' : 'hover:bg-[#f8f9fa] text-[#1d1d1f]'
                }`}
              >
                <span>Все районы</span>
                {!selectedZone && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              {filteredZones.map((z) => (
                <button
                  key={z}
                  onClick={() => {
                    setZone(z);
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedZone === z ? 'bg-emerald-50 font-bold text-emerald-700' : 'hover:bg-[#f8f9fa] text-[#1d1d1f]'
                  }`}
                >
                  <span className="truncate">{z}</span>
                  {selectedZone === z && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 🔄 RESET ALL BUTTON (shows when at least one filter is active) */}
      {activeCount > 0 && (
        <button
          onClick={resetAll}
          className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold transition-all"
          title="Сбросить все срезы к сводному виду"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden xl:inline">Сброс</span>
        </button>
      )}
    </div>
  );
}
