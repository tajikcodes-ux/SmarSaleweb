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

/** A work zone of the distributor; the header's "Зона" filter selects one. */
export interface ZoneItem {
  id: string;
  code: string;
  name: string;
  branchId: string | null;
  brandIds: string[];
}

interface ScopeContextType {
  selectedBranchId: string | null;
  selectedBrandId: string | null;
  /** id of the selected sector */
  selectedZone: string | null;
  branches: BranchItem[];
  brands: BrandItem[];
  zones: ZoneItem[];
  loading: boolean;
  setBranchId: (id: string | null) => void;
  setBrandId: (id: string | null) => void;
  setZone: (zone: string | null) => void;
  resetAll: () => void;
  activeCount: number;
  selectedBranchName: string;
  selectedBrandName: string;
  selectedZoneName: string;
  refreshScopeData: () => Promise<void>;
  /** client passes the zone and brand filters (branch is checked by the pages) */
  matchClient: (client: any) => boolean;
  /** product belongs to the selected brand */
  matchProduct: (product: any, categoryId?: string | null) => boolean;
  /** order's client is in the zone and the order has items of the brand */
  matchOrder: (order: any) => boolean;
}

const ScopeContext = createContext<ScopeContextType | undefined>(undefined);

const remember = (key: string, value: string | null) => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // storage is a convenience only
  }
};
const recall = (key: string) => {
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
};

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(() => recall('smartsale_scope_branch'));
  const [selectedBrandId, setSelectedBrandIdState] = useState<string | null>(() => recall('smartsale_scope_brand'));
  const [selectedZone, setSelectedZoneState] = useState<string | null>(() => recall('smartsale_scope_sector'));

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  // Brands come from the brand directory; companies that have not set it up keep root catalog categories
  const [brandSource, setBrandSource] = useState<'brands' | 'categories'>('brands');
  const [sectors, setSectors] = useState<ZoneItem[]>([]);
  const [loading, setLoading] = useState(false);

  const setBranchId = useCallback((id: string | null) => {
    setSelectedBranchIdState(id);
    remember('smartsale_scope_branch', id);
  }, []);

  const setBrandId = useCallback((id: string | null) => {
    setSelectedBrandIdState(id);
    remember('smartsale_scope_brand', id);
  }, []);

  const setZone = useCallback((zone: string | null) => {
    setSelectedZoneState(zone);
    remember('smartsale_scope_sector', zone);
  }, []);

  const resetAll = useCallback(() => {
    setBranchId(null);
    setBrandId(null);
    setZone(null);
  }, [setBranchId, setBrandId, setZone]);

  const refreshScopeData = useCallback(async () => {
    if (!recall('access_token')) return;

    setLoading(true);
    try {
      try {
        const branchRes = await api.get('/branches');
        if (Array.isArray(branchRes.data)) {
          setBranches(branchRes.data.map((b: any) => ({ id: b.id, name: b.name })));
        }
      } catch {
        // roles without branches:read work without the branch list
      }

      let directoryBrands: BrandItem[] = [];
      try {
        const scopeRes = await api.get('/territory/scope');
        setSectors(scopeRes.data?.sectors ?? []);
        directoryBrands = (scopeRes.data?.brands ?? []).map((b: any) => ({ id: b.id, name: b.name }));
      } catch {
        setSectors([]);
      }

      if (directoryBrands.length > 0) {
        setBrands(directoryBrands);
        setBrandSource('brands');
      } else {
        try {
          const catRes = await api.get('/catalog/categories');
          if (Array.isArray(catRes.data)) {
            const rootCategories = catRes.data.filter((c: any) => !c.parentId);
            setBrands((rootCategories.length > 0 ? rootCategories : catRes.data).map((c: any) => ({ id: c.id, name: c.name, parentId: c.parentId })));
            setBrandSource('categories');
          }
        } catch {
          setBrands([]);
        }
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
      if (recall('access_token') && branches.length === 0) {
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

  // Zones of the selected branch; sectors without a branch are shown everywhere
  const zones = useMemo(
    () => (selectedBranchId ? sectors.filter((s) => !s.branchId || s.branchId === selectedBranchId) : sectors),
    [sectors, selectedBranchId],
  );

  useEffect(() => {
    if (selectedZone && sectors.length > 0 && !zones.some((z) => z.id === selectedZone)) {
      setZone(null);
    }
  }, [zones, sectors.length, selectedZone, setZone]);

  const sectorById = useMemo(() => new Map(sectors.map((s) => [s.id, s])), [sectors]);
  const anySectorHasBrands = useMemo(() => sectors.some((s) => s.brandIds.length > 0), [sectors]);

  const matchProduct = useCallback((product: any, categoryId?: string | null) => {
    if (!selectedBrandId) return true;
    if (brandSource === 'brands') return product?.brandId === selectedBrandId;
    return product?.categoryId === selectedBrandId || product?.category?.parentId === selectedBrandId || categoryId === selectedBrandId;
  }, [selectedBrandId, brandSource]);

  const matchClient = useCallback((client: any) => {
    if (selectedZone && client?.sectorId !== selectedZone) return false;
    // A brand narrows clients to the sectors selling it, once sectors have brands at all
    if (selectedBrandId && brandSource === 'brands' && anySectorHasBrands) {
      const sector = client?.sectorId ? sectorById.get(client.sectorId) : undefined;
      if (!sector || !sector.brandIds.includes(selectedBrandId)) return false;
    }
    return true;
  }, [selectedZone, selectedBrandId, brandSource, anySectorHasBrands, sectorById]);

  const matchOrder = useCallback((order: any) => {
    if (selectedZone && order?.client?.sectorId !== selectedZone) return false;
    if (selectedBrandId && !(order?.items || []).some((item: any) => matchProduct(item.product || {}, item.categoryId))) return false;
    return true;
  }, [selectedZone, selectedBrandId, matchProduct]);

  const activeCount = (selectedBranchId ? 1 : 0) + (selectedBrandId ? 1 : 0) + (selectedZone ? 1 : 0);

  const selectedBranchName = useMemo(() => {
    if (!selectedBranchId) return 'Все филиалы';
    return branches.find((b) => b.id === selectedBranchId)?.name || 'Филиал';
  }, [selectedBranchId, branches]);

  const selectedBrandName = useMemo(() => {
    if (!selectedBrandId) return 'Все бренды';
    return brands.find((b) => b.id === selectedBrandId)?.name || 'Бренд';
  }, [selectedBrandId, brands]);

  const selectedZoneName = useMemo(() => {
    if (!selectedZone) return 'Все зоны';
    const sector = sectorById.get(selectedZone);
    return sector ? sector.name : 'Зона';
  }, [selectedZone, sectorById]);

  return (
    <ScopeContext.Provider
      value={{
        selectedBranchId,
        selectedBrandId,
        selectedZone,
        branches,
        brands,
        zones,
        loading,
        setBranchId,
        setBrandId,
        setZone,
        resetAll,
        activeCount,
        selectedBranchName,
        selectedBrandName,
        selectedZoneName,
        refreshScopeData,
        matchClient,
        matchProduct,
        matchOrder,
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
