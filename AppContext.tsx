import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRODUCT_CATALOG } from '@/lib/productCatalog';
import { IMPORTED_CATEGORIES, IMPORTED_COMPANIES, PRICED_IMPORTED_PRODUCT_CATALOG } from '@/lib/importedProductCatalog';
import { YEMEN_AREAS, YEMEN_PROVINCES } from '@/lib/yemenLocations';

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'REP';

export interface AppUser {
  id: string;
  name: string;
  password: string;
  role: UserRole;
  phone?: string;
  areaId?: string;
  parentId?: string;
}

export interface VisitProduct {
  name: string;
  stock: number;
  order: number;
}

export interface Visit {
  id: string;
  refId: string;
  orderRefId?: string;
  outletName: string;
  outletPhone?: string;
  outletType: string;
  customerName?: string;
  customerNumber?: string;
  userId: string;
  userName: string;
  timestamp: number;
  dateDisplay: string;
  province: string;
  area: string;
  agent?: string;
  products: VisitProduct[];
  photo?: string;
  signature?: string;
  gps?: { lat: number; lng: number };
  notes?: string;
}

export interface Province { id: string; name: string; }
export interface Area { id: string; name: string; provinceId: string; }
export interface Agent { id: string; name: string; phone?: string; }
export interface Category { id: string; name: string; }
export interface Company { id: string; name: string; }
export interface ProductItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  currency?: string;
  company?: string;
  oldPrice?: number;
  newPrice?: number;
}

export type DataType = 'provinces' | 'areas' | 'agents' | 'categories' | 'companies' | 'products';

export interface AppData {
  users: AppUser[];
  visits: Visit[];
  provinces: Province[];
  areas: Area[];
  agents: Agent[];
  categories: Category[];
  companies: Company[];
  products: ProductItem[];
  deletedProductIds: string[];
  deletedProductNames: string[];
}

interface AppContextType {
  currentUser: AppUser | null;
  data: AppData;
  isLoading: boolean;
  login: (name: string, password: string) => boolean;
  logout: () => void;
  addVisit: (visitData: Omit<Visit, 'id' | 'refId' | 'timestamp' | 'dateDisplay'>) => void;
  updateVisit: (visit: Visit) => void;
  deleteVisit: (id: string) => void;
  addDataItem: (type: DataType, item: Record<string, unknown>) => void;
  updateProduct: (id: string, updates: Partial<Pick<ProductItem, 'name' | 'price' | 'category' | 'currency' | 'company'>>) => void;
  updateProductPrice: (id: string, price: number) => void;
  deleteDataItem: (type: DataType, id: string) => void;
  addUser: (user: Omit<AppUser, 'id'>) => void;
  deleteUser: (id: string) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  restoreAutoBackup: () => Promise<boolean>;
  clearAllData: () => Promise<void>;
  visibleVisits: Visit[];
}

const INITIAL_DATA: AppData = {
  users: [
    { id: 'admin-001', name: 'حسن الهتاري', password: '734730625h', role: 'ADMIN' },
  ],
  visits: [],
  provinces: YEMEN_PROVINCES.map(province => ({ ...province })),
  areas: YEMEN_AREAS.map(area => ({ ...area })),
  agents: [
    { id: 'agent-1', name: 'أحمد الوكيل', phone: '770000001' },
  ],
  categories: [
    { id: 'cat-1', name: 'مستحضرات جلدية' },
    { id: 'cat-2', name: 'فيتامينات ومكملات' },
    ...IMPORTED_CATEGORIES.map((name, index) => ({ id: `cat-imported-${index + 1}`, name })),
  ],
  companies: IMPORTED_COMPANIES.map((name, index) => ({ id: `company-${index + 1}`, name })),
  products: PRODUCT_CATALOG.map(product => ({ ...product })),
  deletedProductIds: [],
  deletedProductNames: [],
};

const CORRUPTED_LABELS = new Set([
  'الفيديو',
  'مشروب',
  'خزعة',
  'عرض الله',
  'مقالات أخرى',
  'نفقات',
  'ثقوب',
  'تقوب',
  'نسبي',
]);

function isCorruptedLabel(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const label = value.trim();
  return !label || /^\d+$/.test(label) || CORRUPTED_LABELS.has(label);
}

function normalizeNamedList<T extends { id: string; name: string }>(
  value: unknown,
  fallback: T[],
): T[] {
  const source = Array.isArray(value) ? value : [];
  const valid = source.filter((item): item is T => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<T>;
    return typeof candidate.id === 'string' && !isCorruptedLabel(candidate.name);
  });

  // Keep valid custom entries, but restore the built-in entries if an older
  // version stored unrelated words in a master-data list.
  if (valid.length !== source.length) {
    const merged = [...fallback, ...valid];
    return merged.filter((item, index, list) =>
      list.findIndex(other => other.name.trim() === item.name.trim()) === index
    );
  }

  return valid.length > 0 ? valid : fallback;
}

function productNameKey(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function isUploadedProductId(id: string): boolean {
  return PRICED_IMPORTED_PRODUCT_CATALOG.some(product => product.id === id);
}

function normalizeProducts(value: unknown, fallback: ProductItem[]): ProductItem[] {
  const source = Array.isArray(value) ? value : fallback;
  const byName = new Map<string, ProductItem>();

  for (const item of source) {
    if (!item || typeof item !== 'object') continue;
    const product = item as Partial<ProductItem>;
    const name = productNameKey(product.name);
    if (typeof product.id !== 'string' || !name || isCorruptedLabel(product.name)) continue;
    const candidate = { ...product, name } as ProductItem;
    const current = byName.get(name);
    if (!current || (isUploadedProductId(candidate.id) && !isUploadedProductId(current.id))) {
      byName.set(name, candidate);
    }
  }

  return byName.size > 0 ? Array.from(byName.values()) : fallback.map(product => ({ ...product }));
}

function normalizeAppData(value: Partial<AppData>): AppData {
  return {
    users: Array.isArray(value.users) ? value.users : INITIAL_DATA.users,
    visits: Array.isArray(value.visits) ? value.visits : INITIAL_DATA.visits,
    provinces: normalizeNamedList(value.provinces, INITIAL_DATA.provinces),
    areas: normalizeNamedList(value.areas, INITIAL_DATA.areas),
    agents: normalizeNamedList(value.agents, INITIAL_DATA.agents),
    categories: normalizeNamedList(value.categories, INITIAL_DATA.categories),
    companies: normalizeNamedList(value.companies, INITIAL_DATA.companies),
    products: normalizeProducts(value.products, INITIAL_DATA.products),
    deletedProductIds: Array.isArray(value.deletedProductIds)
      ? value.deletedProductIds.filter((id): id is string => typeof id === 'string')
      : INITIAL_DATA.deletedProductIds,
    deletedProductNames: Array.isArray(value.deletedProductNames)
      ? value.deletedProductNames.filter((name): name is string => typeof name === 'string')
      : INITIAL_DATA.deletedProductNames,
  };
}

const STORAGE_KEYS = { data: 'hasco_app_data_v2', session: 'hasco_session_v2' };
const AUTO_BACKUP_KEY = 'hasco_auto_backup_v1';
const LEGACY_PRODUCT_CATALOG_VERSION_KEY = 'hasco_product_catalog_v1';
const PRODUCT_CATALOG_VERSION_KEY = 'hasco_product_catalog_v2';
const PRODUCT_CATALOG_VERSION = '4';
const LOCATION_CATALOG_VERSION_KEY = 'hasco_yemen_locations_v1';
const LOCATION_CATALOG_VERSION = '1';
const LEGACY_PROVINCE_ID_MAP: Record<string, string> = {
  'prov-1': 'ye-gov-YE23',
  'prov-2': 'ye-gov-YE24',
  'prov-3': 'ye-gov-YE15',
  'prov-4': 'ye-gov-YE11',
};

function migrateYemenLocations(
  parsed: Partial<AppData>,
  locationVersion: string | null,
): Partial<AppData> {
  if (locationVersion === LOCATION_CATALOG_VERSION) return parsed;

  const existingProvinces = Array.isArray(parsed.provinces) ? parsed.provinces : [];
  const migratedProvinces = existingProvinces.map(province => {
    const nextId = LEGACY_PROVINCE_ID_MAP[province.id];
    if (!nextId) return province;
    const official = YEMEN_PROVINCES.find(item => item.id === nextId);
    return official ? { ...province, id: official.id, name: official.name } : province;
  });
  const provinceById = new Map(migratedProvinces.map(province => [province.id, province]));
  for (const province of YEMEN_PROVINCES) {
    if (!provinceById.has(province.id)) provinceById.set(province.id, { ...province });
  }

  const existingAreas = Array.isArray(parsed.areas) ? parsed.areas : [];
  const migratedAreas = existingAreas.map(area => ({
    ...area,
    provinceId: LEGACY_PROVINCE_ID_MAP[area.provinceId] ?? area.provinceId,
  }));
  const areaIds = new Set(migratedAreas.map(area => area.id));
  const areaKeys = new Set(migratedAreas.map(area => `${area.provinceId}:${area.name.trim()}`));
  const areas = [
    ...migratedAreas,
    ...YEMEN_AREAS.filter(area => {
      const key = `${area.provinceId}:${area.name.trim()}`;
      return !areaIds.has(area.id) && !areaKeys.has(key);
    }).map(area => ({ ...area })),
  ];

  return {
    ...parsed,
    provinces: Array.from(provinceById.values()),
    areas,
  };
}

function mergeNamedItems<T extends { id: string; name: string }>(
  existing: T[],
  additions: T[],
): T[] {
  const result = [...existing];
  const names = new Set(existing.map(item => item.name.trim()));
  for (const item of additions) {
    if (!names.has(item.name.trim())) {
      result.push({ ...item });
      names.add(item.name.trim());
    }
  }
  return result;
}

function migrateProductMetadata(
  parsed: Partial<AppData>,
  productVersion: string | null,
): Partial<AppData> {
  if (productVersion === PRODUCT_CATALOG_VERSION) return parsed;

  const categories = mergeNamedItems(
    Array.isArray(parsed.categories) ? parsed.categories : [],
    IMPORTED_CATEGORIES.map((name, index) => ({ id: `cat-imported-${index + 1}`, name })),
  );
  const companies = mergeNamedItems(
    Array.isArray(parsed.companies) ? parsed.companies : [],
    IMPORTED_COMPANIES.map((name, index) => ({ id: `company-${index + 1}`, name })),
  );
  return { ...parsed, categories, companies };
}

function migrateProductCatalog(
  parsed: Partial<AppData>,
  productVersion: string | null,
): Partial<AppData> {
  const deletedProductIds = new Set(
    Array.isArray(parsed.deletedProductIds)
      ? parsed.deletedProductIds.filter((id): id is string => typeof id === 'string')
      : [],
  );
  const deletedProductNames = new Set(
    Array.isArray(parsed.deletedProductNames)
      ? parsed.deletedProductNames.map(productNameKey).filter(Boolean)
      : [],
  );
  const sourceProducts = Array.isArray(parsed.products) ? parsed.products : [];
  const uploadedById = new Map<string, (typeof PRICED_IMPORTED_PRODUCT_CATALOG)[number]>(
    PRICED_IMPORTED_PRODUCT_CATALOG.map(product => [product.id, product]),
  );
  const uploadedByName = new Map(
    PRICED_IMPORTED_PRODUCT_CATALOG.map(product => [productNameKey(product.name), product]),
  );
  const productsByName = new Map<string, ProductItem>();

  for (const product of sourceProducts
    .filter(product => !['prod-1', 'prod-2', 'prod-3'].includes(product.id))
  ) {
      const uploadedProduct = uploadedById.get(product.id) ?? uploadedByName.get(productNameKey(product.name));
      const mergedProduct = !uploadedProduct
        ? product
        : {
          ...product,
          category: product.category || uploadedProduct.category,
          company: product.company || uploadedProduct.company,
          currency: uploadedProduct.currency,
          oldPrice: uploadedProduct.oldPrice,
          newPrice: uploadedProduct.newPrice,
          price: uploadedProduct.price,
        };
      const name = productNameKey(mergedProduct.name);
      if (!name) continue;
      const current = productsByName.get(name);
      if (!current || (isUploadedProductId(mergedProduct.id) && !isUploadedProductId(current.id))) {
        productsByName.set(name, mergedProduct);
      }
  }

  const updatedProducts = Array.from(productsByName.values());
  const seenIds = new Set(updatedProducts.map(product => product.id));

  // Only older catalog migrations append missing records. In the current
  // update, a missing catalog id is treated as a deliberate user deletion.
  const productsToAppend = !productVersion || productVersion === '1'
    ? PRODUCT_CATALOG.filter(product => Number(product.id.replace('catalog-', '')) > 100)
    : productVersion === '2'
      ? PRODUCT_CATALOG.filter(product => Number(product.id.replace('catalog-', '')) >= 164)
      : [];

  for (const product of productsToAppend) {
    if (
      !seenIds.has(product.id)
      && !deletedProductIds.has(product.id)
      && !deletedProductNames.has(productNameKey(product.name))
    ) {
      updatedProducts.push({ ...product });
      seenIds.add(product.id);
    }
  }

  return {
    ...parsed,
    products: updatedProducts,
    deletedProductIds: Array.from(deletedProductIds),
    deletedProductNames: Array.from(deletedProductNames),
  };
}

const AppContext = createContext<AppContextType | null>(null);

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function genReference(date: Date): string {
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0').slice(0, 6);
  return `ORD-${datePart}-${suffix}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadFromStorage(); }, []);

  const saveData = async (newData: AppData) => {
    try {
      const serialized = JSON.stringify(newData);
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.data, serialized),
        AsyncStorage.setItem(AUTO_BACKUP_KEY, serialized),
      ]);
    } catch { /* ignore */ }
  };

  const loadFromStorage = async () => {
    try {
      const [dataStr, sessionStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.data),
        AsyncStorage.getItem(STORAGE_KEYS.session),
      ]);
      const sourceStr = dataStr ?? await AsyncStorage.getItem(AUTO_BACKUP_KEY);
      if (sourceStr) {
        const parsed = JSON.parse(sourceStr) as AppData;
        const [catalogVersion, legacyCatalogVersion] = await Promise.all([
          AsyncStorage.getItem(PRODUCT_CATALOG_VERSION_KEY),
          AsyncStorage.getItem(LEGACY_PRODUCT_CATALOG_VERSION_KEY),
        ]);
        const locationVersion = await AsyncStorage.getItem(LOCATION_CATALOG_VERSION_KEY);
        const previousCatalogVersion = catalogVersion ?? legacyCatalogVersion;
        const legacyDemoIds = new Set(['prod-1', 'prod-2', 'prod-3']);
        const existingProducts = Array.isArray(parsed.products)
          ? parsed.products.filter(product => !legacyDemoIds.has(product.id))
          : [];
        const withProductCatalog = migrateProductCatalog({
          ...parsed,
          products: existingProducts,
        }, previousCatalogVersion);
        const withProductMetadata = migrateProductMetadata(withProductCatalog, previousCatalogVersion);
        const withLocations = migrateYemenLocations(withProductMetadata, locationVersion);
        const normalized = normalizeAppData(withLocations);
        setData(normalized);
        const normalizedJson = JSON.stringify(normalized);
        if (
          normalizedJson !== JSON.stringify(parsed)
          || !dataStr
          || catalogVersion !== PRODUCT_CATALOG_VERSION
          || locationVersion !== LOCATION_CATALOG_VERSION
        ) {
          await Promise.all([
            AsyncStorage.setItem(STORAGE_KEYS.data, normalizedJson),
            AsyncStorage.setItem(AUTO_BACKUP_KEY, normalizedJson),
            AsyncStorage.setItem(PRODUCT_CATALOG_VERSION_KEY, PRODUCT_CATALOG_VERSION),
            AsyncStorage.setItem(LOCATION_CATALOG_VERSION_KEY, LOCATION_CATALOG_VERSION),
          ]);
        }
      } else {
        const initialJson = JSON.stringify(INITIAL_DATA);
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.data, initialJson),
          AsyncStorage.setItem(AUTO_BACKUP_KEY, initialJson),
          AsyncStorage.setItem(PRODUCT_CATALOG_VERSION_KEY, PRODUCT_CATALOG_VERSION),
          AsyncStorage.setItem(LOCATION_CATALOG_VERSION_KEY, LOCATION_CATALOG_VERSION),
        ]);
      }
      if (sessionStr) setCurrentUser(JSON.parse(sessionStr) as AppUser);
    } catch { /* ignore */ } finally { setIsLoading(false); }
  };

  const updateData = (newData: AppData) => { setData(newData); saveData(newData); };

  const visibleVisits = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN') return data.visits;
    if (currentUser.role === 'SUPERVISOR') {
      const teamIds = new Set([
        currentUser.id,
        ...data.users.filter(user => user.parentId === currentUser.id).map(user => user.id),
      ]);
      return data.visits.filter(visit => teamIds.has(visit.userId));
    }
    return data.visits.filter(visit => visit.userId === currentUser.id);
  }, [currentUser, data.users, data.visits]);

  const login = (name: string, password: string): boolean => {
    const user = data.users.find(u => u.name === name && u.password === password);
    if (user) {
      setCurrentUser(user);
      AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user)).catch(() => {});
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    AsyncStorage.removeItem(STORAGE_KEYS.session).catch(() => {});
  };

  const addVisit = (visitData: Omit<Visit, 'id' | 'refId' | 'timestamp' | 'dateDisplay'>) => {
    const now = Date.now();
    const date = new Date(now);
    const newVisit: Visit = {
      ...visitData,
      id: genId(),
      refId: genReference(date),
      orderRefId: visitData.products.some(product => product.order > 0) ? genReference(date) : undefined,
      timestamp: now,
      dateDisplay: date.toLocaleDateString('ar-SA'),
    };
    const newData = { ...data, visits: [newVisit, ...data.visits] };
    updateData(newData);
  };

  const updateVisit = (visit: Visit) => {
    updateData({ ...data, visits: data.visits.map(v => v.id === visit.id ? visit : v) });
  };

  const deleteVisit = (id: string) => {
    updateData({ ...data, visits: data.visits.filter(v => v.id !== id) });
  };

  const addDataItem = (type: DataType, item: Record<string, unknown>) => {
    const newItem = { ...item, id: genId() };
    updateData({ ...data, [type]: [...data[type], newItem] });
  };

  const deleteDataItem = (type: DataType, id: string) => {
    const nextData = {
      ...data,
      [type]: (data[type] as Array<{ id: string }>).filter(i => i.id !== id),
    };
    if (type === 'products' && !data.deletedProductIds.includes(id)) {
      nextData.deletedProductIds = [...data.deletedProductIds, id];
    }
    if (type === 'products') {
      const deletedProduct = data.products.find(product => product.id === id);
      const deletedProductName = productNameKey(deletedProduct?.name);
      if (deletedProductName && !data.deletedProductNames.includes(deletedProductName)) {
        nextData.deletedProductNames = [...data.deletedProductNames, deletedProductName];
      }
    }
    updateData(nextData);
  };

  const updateProduct = (
    id: string,
    updates: Partial<Pick<ProductItem, 'name' | 'price' | 'category' | 'currency' | 'company'>>,
  ) => {
    updateData({
      ...data,
      products: data.products.map(product => product.id === id ? { ...product, ...updates } : product),
    });
  };

  const updateProductPrice = (id: string, price: number) => {
    updateProduct(id, { price });
  };

  const addUser = (user: Omit<AppUser, 'id'>) => {
    updateData({ ...data, users: [...data.users, { ...user, id: genId() }] });
  };

  const deleteUser = (id: string) => {
    updateData({ ...data, users: data.users.filter(u => u.id !== id) });
  };

  const exportData = (): string => JSON.stringify(data, null, 2);

  const importData = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as Partial<AppData>;
      updateData(normalizeAppData(migrateProductMetadata(migrateYemenLocations({
        ...data,
        ...parsed,
      }, null), null)));
      return true;
    } catch { return false; }
  };

  const restoreAutoBackup = async (): Promise<boolean> => {
    try {
      const backup = await AsyncStorage.getItem(AUTO_BACKUP_KEY);
      if (!backup) return false;
      const parsed = JSON.parse(backup) as Partial<AppData>;
      updateData(normalizeAppData(migrateProductMetadata(
        migrateYemenLocations({ ...data, ...parsed }, null),
        null,
      )));
      return true;
    } catch {
      return false;
    }
  };

  const clearAllData = async () => {
    await AsyncStorage.clear();
    setData(INITIAL_DATA);
    setCurrentUser(null);
  };

  return (
    <AppContext.Provider value={{
      currentUser, data, visibleVisits, isLoading,
      login, logout,
      addVisit, updateVisit, deleteVisit,
      addDataItem, deleteDataItem,
      updateProduct,
      updateProductPrice,
      addUser, deleteUser,
      exportData, importData, restoreAutoBackup, clearAllData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
