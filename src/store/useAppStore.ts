import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  DataAsset,
  AppState,
  ScoringCriterion,
  RiskItem,
  QuoteScheme,
  ApprovalRecord,
  DataSource,
  ApplicationScenario,
  HistoricalPrice,
  ServiceCost,
  CoverageScope,
  UpdateFrequency,
  ValuationLevel,
  AssetStatus,
} from '../types';
import { mockAssets, defaultIndustries, defaultScoringCriteria } from '../data/mockData';

const STORAGE_KEY = 'data-asset-valuation-store';

type ModuleType = 'basic' | 'metrics' | 'valuation' | 'risk' | 'quote' | 'approval';

const moduleNames: Record<ModuleType, string> = {
  basic: '资产基础信息',
  metrics: '指标数据',
  valuation: '价值评估',
  risk: '风险提示',
  quote: '报价方案',
  approval: '审批记录',
};

const calculateValuationLevel = (score: number): ValuationLevel => {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
};

const calculateTotalScore = (criteria: ScoringCriterion[]): number => {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = criteria.reduce((sum, c) => sum + c.score * c.weight, 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10;
};

const calculateEstimatedValue = (score: number, historicalPrices: HistoricalPrice[]): number => {
  const avgPrice =
    historicalPrices.length > 0
      ? historicalPrices.reduce((sum, p) => sum + p.price, 0) / historicalPrices.length
      : 0;
  const baseValue = avgPrice || 500000;
  const multiplier = 0.5 + (score / 100) * 1.5;
  return Math.round(baseValue * multiplier);
};

const loadFromStorage = (): {
  assets: DataAsset[];
  selectedAssetId: string | null;
  industryFilter: string;
} | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        assets: parsed.assets || null,
        selectedAssetId: parsed.selectedAssetId || null,
        industryFilter: parsed.industryFilter || 'all',
      };
    }
  } catch (e) {
    console.warn('Failed to load from localStorage', e);
  }
  return null;
};

const saveToStorage = (state: Partial<AppState & { selectedAssetId: string | null; industryFilter: string }>) => {
  try {
    const data = {
      assets: state.assets,
      selectedAssetId: state.selectedAssetId,
      industryFilter: state.industryFilter,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to localStorage', e);
  }
};

const persisted = loadFromStorage();
const initialAssets = persisted?.assets && persisted.assets.length > 0 ? persisted.assets : mockAssets;
const initialSelectedId = persisted?.selectedAssetId && initialAssets.find((a) => a.id === persisted.selectedAssetId)
  ? persisted.selectedAssetId
  : initialAssets.length > 0
  ? initialAssets[0].id
  : null;
const initialIndustryFilter = persisted?.industryFilter || 'all';

interface StoreActions {
  setSelectedAsset: (id: string | null) => void;
  setIndustryFilter: (industry: string) => void;
  addAsset: (asset: Partial<DataAsset>) => DataAsset;
  updateAsset: (id: string, updates: Partial<DataAsset>, module?: ModuleType) => void;
  deleteAsset: (id: string) => void;
  importAssets: (assets: Partial<DataAsset>[]) => void;

  addDataSource: (assetId: string, source: Omit<DataSource, 'id'>) => void;
  updateDataSource: (assetId: string, sourceId: string, updates: Partial<DataSource>) => void;
  removeDataSource: (assetId: string, sourceId: string) => void;

  updateCoverageScope: (assetId: string, scope: Partial<CoverageScope>) => void;
  setUpdateFrequency: (assetId: string, freq: UpdateFrequency) => void;
  setDataVolume: (assetId: string, volume: string) => void;

  addApplicationScenario: (assetId: string, scenario: Omit<ApplicationScenario, 'id'>) => void;
  removeApplicationScenario: (assetId: string, scenarioId: string) => void;

  addHistoricalPrice: (assetId: string, price: Omit<HistoricalPrice, 'id'>) => void;
  removeHistoricalPrice: (assetId: string, priceId: string) => void;

  updateScoringCriteria: (assetId: string, criteria: ScoringCriterion[]) => void;
  recalculateScore: (assetId: string) => void;

  addRisk: (assetId: string, risk: Omit<RiskItem, 'id'>) => void;
  updateRisk: (assetId: string, riskId: string, updates: Partial<RiskItem>) => void;
  removeRisk: (assetId: string, riskId: string) => void;

  addQuoteScheme: (assetId: string, scheme: Omit<QuoteScheme, 'id' | 'totalPrice'>) => void;
  updateQuoteScheme: (assetId: string, schemeId: string, updates: Partial<QuoteScheme>) => void;
  removeQuoteScheme: (assetId: string, schemeId: string) => void;
  addServiceCost: (assetId: string, schemeId: string, cost: Omit<ServiceCost, 'id'>) => void;
  removeServiceCost: (assetId: string, schemeId: string, costId: string) => void;
  selectQuoteScheme: (assetId: string, schemeId: string) => void;

  addApprovalRecord: (assetId: string, record: Omit<ApprovalRecord, 'id' | 'timestamp'>) => void;
  submitForReview: (assetId: string, comment: string, submitter: string) => void;
  recordModification: (assetId: string, module: ModuleType, description: string) => void;

  recalculateAllDerived: (assetId: string) => void;
}

export const useAppStore = create<AppState & StoreActions>((set, get) => ({
  assets: initialAssets,
  selectedAssetId: initialSelectedId,
  industryFilter: initialIndustryFilter,
  industries: defaultIndustries,

  setSelectedAsset: (id) => {
    set({ selectedAssetId: id });
    saveToStorage({ ...get(), selectedAssetId: id });
  },

  setIndustryFilter: (industry) => {
    const filter = industry || 'all';
    const state = get();
    let newSelectedId = state.selectedAssetId;

    if (filter !== 'all' && state.selectedAssetId) {
      const selected = state.assets.find((a) => a.id === state.selectedAssetId);
      if (selected && selected.industry !== filter) {
        const firstInIndustry = state.assets.find((a) => a.industry === filter);
        newSelectedId = firstInIndustry ? firstInIndustry.id : null;
      }
    }

    if (filter === 'all' && !state.selectedAssetId && state.assets.length > 0) {
      newSelectedId = state.assets[0].id;
    }

    set({ industryFilter: filter, selectedAssetId: newSelectedId });
    saveToStorage({ ...get(), industryFilter: filter, selectedAssetId: newSelectedId });
  },

  addAsset: (asset) => {
    const newAsset: DataAsset = {
      id: uuidv4(),
      name: asset.name || '未命名资产',
      code: asset.code || `DA-${Date.now()}`,
      category: asset.category || '其他',
      industry: asset.industry || '通用',
      description: asset.description || '',
      owner: asset.owner || '',
      department: asset.department || '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dataSources: [],
      updateFrequency: 'monthly',
      lastUpdated: new Date().toISOString(),
      dataVolume: '',
      coverageScope: { regions: [], industries: [] },
      applicationScenarios: [],
      historicalPrices: [],
      scoringCriteria: JSON.parse(JSON.stringify(defaultScoringCriteria)),
      totalScore: 0,
      valuationLevel: 'D',
      estimatedValue: 0,
      risks: [],
      quoteSchemes: [],
      approvalRecords: [],
      ...asset,
    };

    const state = get();
    const newAssets = [...state.assets, newAsset];
    set({ assets: newAssets, selectedAssetId: newAsset.id });

    get().recordModification(newAsset.id, 'basic', '创建了新的数据资产');
    saveToStorage({ ...get(), assets: newAssets, selectedAssetId: newAsset.id });
    return newAsset;
  },

  updateAsset: (id, updates, module = 'basic') => {
    const state = get();
    const oldAsset = state.assets.find((a) => a.id === id);
    const newAssets = state.assets.map((a) =>
      a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
    );
    set({ assets: newAssets });

    if (oldAsset && module !== 'approval') {
      let desc = `修改了${moduleNames[module]}`;
      if (module === 'basic' && updates.name) {
        desc = `修改资产名称为「${updates.name}」`;
      } else if (module === 'basic') {
        desc = '更新了资产基础信息';
      }
      get().recordModification(id, module, desc);
    }

    saveToStorage({ ...get(), assets: newAssets });
  },

  deleteAsset: (id) => {
    const state = get();
    const newAssets = state.assets.filter((a) => a.id !== id);
    const newSelected =
      state.selectedAssetId === id
        ? newAssets.length > 0
          ? newAssets[0].id
          : null
        : state.selectedAssetId;
    set({ assets: newAssets, selectedAssetId: newSelected });
    saveToStorage({ ...get(), assets: newAssets, selectedAssetId: newSelected });
  },

  importAssets: (imported) => {
    const newAssets: DataAsset[] = imported.map((asset) => ({
      id: uuidv4(),
      name: asset.name || '未命名资产',
      code: asset.code || `DA-${Date.now()}-${Math.random()}`,
      category: asset.category || '其他',
      industry: asset.industry || '通用',
      description: asset.description || '',
      owner: asset.owner || '',
      department: asset.department || '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dataSources: [],
      updateFrequency: 'monthly',
      lastUpdated: new Date().toISOString(),
      dataVolume: '',
      coverageScope: { regions: [], industries: [] },
      applicationScenarios: [],
      historicalPrices: [],
      scoringCriteria: JSON.parse(JSON.stringify(defaultScoringCriteria)),
      totalScore: 0,
      valuationLevel: 'D',
      estimatedValue: 0,
      risks: [],
      quoteSchemes: [],
      approvalRecords: [],
      ...asset,
    }));

    const state = get();
    const result = [...state.assets, ...newAssets];
    set({ assets: result });

    newAssets.forEach((a) => {
      get().recordModification(a.id, 'basic', '导入数据资产');
    });

    saveToStorage({ ...get(), assets: result });
  },

  addDataSource: (assetId, source) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? { ...a, dataSources: [...a.dataSources, { ...source, id: uuidv4() }], updatedAt: new Date().toISOString() }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'metrics', `添加数据源：${source.name}`);
    saveToStorage({ ...get(), assets: newAssets });
  },

  updateDataSource: (assetId, sourceId, updates) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            dataSources: a.dataSources.map((s) => (s.id === sourceId ? { ...s, ...updates } : s)),
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'metrics', `更新数据源信息`);
    saveToStorage({ ...get(), assets: newAssets });
  },

  removeDataSource: (assetId, sourceId) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    const source = asset?.dataSources.find((s) => s.id === sourceId);
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? { ...a, dataSources: a.dataSources.filter((s) => s.id !== sourceId), updatedAt: new Date().toISOString() }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'metrics', `删除数据源：${source?.name || '未命名'}`);
    saveToStorage({ ...get(), assets: newAssets });
  },

  updateCoverageScope: (assetId, scope) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? { ...a, coverageScope: { ...a.coverageScope, ...scope }, updatedAt: new Date().toISOString() }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'metrics', '更新覆盖范围');
    saveToStorage({ ...get(), assets: newAssets });
  },

  setUpdateFrequency: (assetId, freq) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId ? { ...a, updateFrequency: freq, updatedAt: new Date().toISOString() } : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'metrics', `设置更新频率为：${freq}`);
    saveToStorage({ ...get(), assets: newAssets });
  },

  setDataVolume: (assetId, volume) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId ? { ...a, dataVolume: volume, updatedAt: new Date().toISOString() } : a
    );
    set({ assets: newAssets });
    saveToStorage({ ...get(), assets: newAssets });
  },

  addApplicationScenario: (assetId, scenario) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            applicationScenarios: [...a.applicationScenarios, { ...scenario, id: uuidv4() }],
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'metrics', `添加应用场景：${scenario.name}`);
    saveToStorage({ ...get(), assets: newAssets });
  },

  removeApplicationScenario: (assetId, scenarioId) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    const scenario = asset?.applicationScenarios.find((s) => s.id === scenarioId);
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            applicationScenarios: a.applicationScenarios.filter((s) => s.id !== scenarioId),
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'metrics', `删除应用场景：${scenario?.name || '未命名'}`);
    saveToStorage({ ...get(), assets: newAssets });
  },

  addHistoricalPrice: (assetId, price) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            historicalPrices: [...a.historicalPrices, { ...price, id: uuidv4() }],
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'metrics', `添加历史交易：${price.buyer} - ${price.price}元`);
    get().recalculateAllDerived(assetId);
    saveToStorage({ ...get(), assets: get().assets });
  },

  removeHistoricalPrice: (assetId, priceId) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    const price = asset?.historicalPrices.find((p) => p.id === priceId);
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? { ...a, historicalPrices: a.historicalPrices.filter((p) => p.id !== priceId), updatedAt: new Date().toISOString() }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'metrics', `删除历史交易：${price?.buyer || ''}`);
    get().recalculateAllDerived(assetId);
    saveToStorage({ ...get(), assets: get().assets });
  },

  updateScoringCriteria: (assetId, criteria) => {
    const totalScore = calculateTotalScore(criteria);
    const level = calculateValuationLevel(totalScore);
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    const estimatedValue = asset ? calculateEstimatedValue(totalScore, asset.historicalPrices) : 0;
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            scoringCriteria: criteria,
            totalScore,
            valuationLevel: level,
            estimatedValue,
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'valuation', `更新评分配置，当前得分：${totalScore}，等级：${level}`);
    saveToStorage({ ...get(), assets: newAssets });
  },

  recalculateScore: (assetId) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) return;
    const totalScore = calculateTotalScore(asset.scoringCriteria);
    const level = calculateValuationLevel(totalScore);
    const estimatedValue = calculateEstimatedValue(totalScore, asset.historicalPrices);
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? { ...a, totalScore, valuationLevel: level, estimatedValue, updatedAt: new Date().toISOString() }
        : a
    );
    set({ assets: newAssets });
    saveToStorage({ ...get(), assets: newAssets });
  },

  recalculateAllDerived: (assetId) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) return;
    const totalScore = calculateTotalScore(asset.scoringCriteria);
    const level = calculateValuationLevel(totalScore);
    const estimatedValue = calculateEstimatedValue(totalScore, asset.historicalPrices);
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? { ...a, totalScore, valuationLevel: level, estimatedValue, updatedAt: new Date().toISOString() }
        : a
    );
    set({ assets: newAssets });
  },

  addRisk: (assetId, risk) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? { ...a, risks: [...a.risks, { ...risk, id: uuidv4() }], updatedAt: new Date().toISOString() }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'risk', `添加风险项：${risk.title}`);
    saveToStorage({ ...get(), assets: newAssets });
  },

  updateRisk: (assetId, riskId, updates) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            risks: a.risks.map((r) => (r.id === riskId ? { ...r, ...updates } : r)),
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'risk', '更新风险项信息');
    saveToStorage({ ...get(), assets: newAssets });
  },

  removeRisk: (assetId, riskId) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    const risk = asset?.risks.find((r) => r.id === riskId);
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? { ...a, risks: a.risks.filter((r) => r.id !== riskId), updatedAt: new Date().toISOString() }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'risk', `删除风险项：${risk?.title || '未命名'}`);
    saveToStorage({ ...get(), assets: newAssets });
  },

  addQuoteScheme: (assetId, scheme) => {
    const totalPrice = scheme.basePrice + scheme.serviceCosts.reduce((s, c) => s + c.amount, 0);
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            quoteSchemes: [...a.quoteSchemes, { ...scheme, id: uuidv4(), totalPrice }],
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'quote', `新增报价方案：${scheme.name}`);
    saveToStorage({ ...get(), assets: newAssets });
  },

  updateQuoteScheme: (assetId, schemeId, updates) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            quoteSchemes: a.quoteSchemes.map((q) => {
              if (q.id !== schemeId) return q;
              const merged = { ...q, ...updates };
              merged.totalPrice = merged.basePrice + merged.serviceCosts.reduce((s, c) => s + c.amount, 0);
              return merged;
            }),
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'quote', '更新报价方案');
    saveToStorage({ ...get(), assets: newAssets });
  },

  removeQuoteScheme: (assetId, schemeId) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    const scheme = asset?.quoteSchemes.find((q) => q.id === schemeId);
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? { ...a, quoteSchemes: a.quoteSchemes.filter((q) => q.id !== schemeId), updatedAt: new Date().toISOString() }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'quote', `删除报价方案：${scheme?.name || '未命名'}`);
    saveToStorage({ ...get(), assets: newAssets });
  },

  addServiceCost: (assetId, schemeId, cost) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            quoteSchemes: a.quoteSchemes.map((q) => {
              if (q.id !== schemeId) return q;
              const newCosts = [...q.serviceCosts, { ...cost, id: uuidv4() }];
              return {
                ...q,
                serviceCosts: newCosts,
                totalPrice: q.basePrice + newCosts.reduce((s, c) => s + c.amount, 0),
              };
            }),
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    get().recordModification(assetId, 'quote', `添加服务成本：${cost.name}`);
    saveToStorage({ ...get(), assets: newAssets });
  },

  removeServiceCost: (assetId, schemeId, costId) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            quoteSchemes: a.quoteSchemes.map((q) => {
              if (q.id !== schemeId) return q;
              const newCosts = q.serviceCosts.filter((c) => c.id !== costId);
              return {
                ...q,
                serviceCosts: newCosts,
                totalPrice: q.basePrice + newCosts.reduce((s, c) => s + c.amount, 0),
              };
            }),
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    saveToStorage({ ...get(), assets: newAssets });
  },

  selectQuoteScheme: (assetId, schemeId) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId ? { ...a, selectedQuoteId: schemeId, updatedAt: new Date().toISOString() } : a
    );
    set({ assets: newAssets });
    const asset = newAssets.find((a) => a.id === assetId);
    const scheme = asset?.quoteSchemes.find((q) => q.id === schemeId);
    if (scheme) {
      get().recordModification(assetId, 'quote', `选用报价方案：${scheme.name}`);
    }
    saveToStorage({ ...get(), assets: newAssets });
  },

  addApprovalRecord: (assetId, record) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            approvalRecords: [...a.approvalRecords, { ...record, id: uuidv4(), timestamp: new Date().toISOString() }],
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    saveToStorage({ ...get(), assets: newAssets });
  },

  submitForReview: (assetId, comment, submitter) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) return;
    const snapshot = JSON.parse(JSON.stringify(asset));
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            status: 'pending' as AssetStatus,
            currentApprover: '风控审核员',
            approvalRecords: [
              ...a.approvalRecords,
              {
                id: uuidv4(),
                assetId,
                approver: submitter,
                role: '数据产品经理',
                action: 'submit',
                comment,
                timestamp: new Date().toISOString(),
                previousSnapshot: snapshot,
              },
            ],
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    saveToStorage({ ...get(), assets: newAssets });
  },

  recordModification: (assetId, module, description) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) return;

    const lastRecord = asset.approvalRecords[asset.approvalRecords.length - 1];
    const now = new Date();
    if (
      lastRecord &&
      lastRecord.action === 'modify' &&
      lastRecord.role === '系统记录' &&
      now.getTime() - new Date(lastRecord.timestamp).getTime() < 3000 &&
      lastRecord.comment.startsWith(description.substring(0, 8))
    ) {
      return;
    }

    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            approvalRecords: [
              ...a.approvalRecords,
              {
                id: uuidv4(),
                assetId,
                approver: '产品经理',
                role: '系统记录',
                action: 'modify',
                comment: description,
                timestamp: new Date().toISOString(),
                previousSnapshot: undefined,
              },
            ],
          }
        : a
    );
    set({ assets: newAssets });
  },
}));
