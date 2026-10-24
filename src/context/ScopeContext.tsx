import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import api from '../services/api';

export interface BranchItem {
  id: string;
  name: string;
}

export interface BrandItem {
  id: string;
  name: string;
  parentId?: string | null;
}

interface ScopeContextType {
  selectedBranchId: string | null;
  selectedBrandId: string | null;
  selectedZone: string | null;
  branches: BranchItem[];
  brands: BrandItem[];
  zones: string[];
  loading: boolean;
  setBranchId: (id: string | null) => void;
  setBrandId: (id: string | null) => void;
  setZone: (zone: string | null) => void;
  resetAll: () => void;
  activeCount: number;
  selectedBranchName: string;
  selectedBrandName: string;
  refreshScopeData: () => Promise<void>;
}

const ScopeContext = createContext<ScopeContextType | undefined>(undefined);

const DUSHANBE_ZONES = ['Сино', 'Фирдавси', 'И. Сомони', 'Шохмансур'];
const KHUJAND_ZONES = ['Панджшанбе', '18-й мкр', '34-й мкр', 'Б. Гафуров'];
const OTHER_ZONES = ['Бохтар', 'Куляб', 'Вахдат', 'Турсунзаде', 'Гиссар'];
const ALL_DEFAULT_ZONES = Array.from(new Set([...DUSHANBE_ZONES, ...KHUJAND_ZONES, ...OTHER_ZONES]));

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(() => {
    return localStorage.getItem('smartsale_scope_branch') || null;
  });
  const [selectedBrandId, setSelectedBrandIdState] = useState<string | null>(() => {
    return localStorage.getItem('smartsale_scope_brand') || null;
  });
  const [selectedZone, setSelectedZoneState] = useState<string | null>(() => {
    return localStorage.getItem('smartsale_scope_zone') || null;
  });

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [dynamicZones, setDynamicZones] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const setBranchId = useCallback((id: string | null) => {
    setSelectedBranchIdState(id);
    if (id) {
      localStorage.setItem('smartsale_scope_branch', id);
    } else {
      localStorage.removeItem('smartsale_scope_branch');
    }
  }, []);

  const setBrandId = useCallback((id: string | null) => {
    setSelectedBrandIdState(id);
    if (id) {
      localStorage.setItem('smartsale_scope_brand', id);
    } else {
      localStorage.removeItem('smartsale_scope_brand');
    }
  }, []);

  const setZone = useCallback((zone: string | null) => {
    setSelectedZoneState(zone);
    if (zone) {
      localStorage.setItem('smartsale_scope_zone', zone);
    } else {
      localStorage.removeItem('smartsale_scope_zone');
    }
  }, []);

  const resetAll = useCallback(() => {
    setSelectedBranchIdState(null);
    setSelectedBrandIdState(null);
    setSelectedZoneState(null);
    localStorage.removeItem('smartsale_scope_branch');
    localStorage.removeItem('smartsale_scope_brand');
    localStorage.removeItem('smartsale_scope_zone');
  }, []);

  const refreshScopeData = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      // 1. Fetch branches
      try {
        const branchRes = await api.get('/branches');
        if (Array.isArray(branchRes.data)) {
          setBranches(branchRes.data.map((b: any) => ({ id: b.id, name: b.name })));
        }
      } catch (err) {
        // Fallback gracefully
      }

      // 2. Fetch categories (Root categories parentId == null are Brands/Directions)
      try {
        const catRes = await api.get('/catalog/categories');
        if (Array.isArray(catRes.data)) {
          const rootCategories = catRes.data.filter((c: any) => !c.parentId);
          const brandList = (rootCategories.length > 0 ? rootCategories : catRes.data).map((c: any) => ({
            id: c.id,
            name: c.name,
            parentId: c.parentId,
          }));
          setBrands(brandList);
        }
      } catch (err) {
        // Fallback gracefully
      }

      // 3. Collect zones from clients
      try {
        const clientRes = await api.get('/clients');
        if (Array.isArray(clientRes.data)) {
          const foundZones = new Set<string>();
          clientRes.data.forEach((cl: any) => {
            const addr = cl.address || '';
            ALL_DEFAULT_ZONES.forEach((z) => {
              if (addr.toLowerCase().includes(z.toLowerCase())) {
                foundZones.add(z);
              }
            });
          });
          if (foundZones.size > 0) {
            setDynamicZones(Array.from(foundZones));
          }
        }
      } catch (err) {
        // Fallback gracefully
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshScopeData();

    const handleAuthChange = () => {
      refreshScopeData();
    };

    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('smartsale:auth-change', handleAuthChange);
    window.addEventListener('focus', handleAuthChange);

    const timer = setInterval(() => {
      const hasToken = !!localStorage.getItem('access_token');
      if (hasToken && branches.length === 0) {
        refreshScopeData();
      }
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('smartsale:auth-change', handleAuthChange);
      window.removeEventListener('focus', handleAuthChange);
      clearInterval(timer);
    };
  }, [refreshScopeData, branches.length]);

  // Dependent available zones based on selected branch
  const availableZones = useMemo(() => {
    if (!selectedBranchId) {
      return Array.from(new Set([...dynamicZones, ...ALL_DEFAULT_ZONES]));
    }
    const branch = branches.find((b) => b.id === selectedBranchId);
    if (!branch) return ALL_DEFAULT_ZONES;

    const bName = branch.name.toLowerCase();
    if (bName.includes('худжанд') || bName.includes('согд')) {
      return KHUJAND_ZONES;
    }
    if (bName.includes('душанбе')) {
      return DUSHANBE_ZONES;
    }
    return ALL_DEFAULT_ZONES;
  }, [selectedBranchId, branches, dynamicZones]);

  // Auto-reset zone if current selectedZone is not in the filtered branch zones
  useEffect(() => {
    if (selectedZone && !availableZones.includes(selectedZone)) {
      setZone(null);
    }
  }, [availableZones, selectedZone, setZone]);

  const activeCount = (selectedBranchId ? 1 : 0) + (selectedBrandId ? 1 : 0) + (selectedZone ? 1 : 0);

  const selectedBranchName = useMemo(() => {
    if (!selectedBranchId) return 'Все филиалы';
    return branches.find((b) => b.id === selectedBranchId)?.name || 'Филиал';
  }, [selectedBranchId, branches]);

  const selectedBrandName = useMemo(() => {
    if (!selectedBrandId) return 'Все бренды';
    return brands.find((b) => b.id === selectedBrandId)?.name || 'Бренд';
  }, [selectedBrandId, brands]);

  return (
    <ScopeContext.Provider
      value={{
        selectedBranchId,
        selectedBrandId,
        selectedZone,
        branches,
        brands,
        zones: availableZones,
        loading,
        setBranchId,
        setBrandId,
        setZone,
        resetAll,
        activeCount,
        selectedBranchName,
        selectedBrandName,
        refreshScopeData,
      }}
    >
      {children}
    </ScopeContext.Provider>
  );
}

export function useScope() {
  const context = useContext(ScopeContext);
  if (!context) {
    throw new Error('useScope must be used within a ScopeProvider');
  }
  return context;
}
