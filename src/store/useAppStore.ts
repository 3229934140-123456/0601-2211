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
  ScenarioType,
  ScenarioConfig,
  ModificationTrace,
} from '../types';
import { mockAssets, defaultIndustries, defaultScoringCriteria } from '../data/mockData';
import {
  getDefaultScenarioConfig,
  calculateScenarioValue,
  createModificationTrace,
  traceToDisplay,
  calculateVersionDiff,
  formatMoney,
  frequencyLabel,
  statusLabel,
} from '../utils';

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

const ensureModificationTraces = (assets: DataAsset[]): DataAsset[] => {
  return assets.map((a) => ({
    ...a,
    modificationTraces: a.modificationTraces || [],
    scenarioConfig: a.scenarioConfig || getDefaultScenarioConfig(a.scoringCriteria, a.historicalPrices),
  }));
};

const persisted = loadFromStorage();
const rawInitialAssets = persisted?.assets && persisted.assets.length > 0 ? persisted.assets : mockAssets;
const initialAssets = ensureModificationTraces(rawInitialAssets);
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

  updateScenarioConfig: (assetId: string, type: ScenarioType, updates: { priceMultiplier?: number; scoreMultiplier?: number; note?: string }) => void;
  recalculateScenarios: (assetId: string) => void;

  addRisk: (assetId: string, risk: Omit<RiskItem, 'id'>) => void;
  updateRisk: (assetId: string, riskId: string, updates: Partial<RiskItem>) => void;
  removeRisk: (assetId: string, riskId: string) => void;

  addQuoteScheme: (assetId: string, scheme: Omit<QuoteScheme, 'id' | 'totalPrice'>) => void;
  updateQuoteScheme: (assetId: string, schemeId: string, updates: Partial<QuoteScheme>) => void;
  removeQuoteScheme: (assetId: string, schemeId: string) => void;
  addServiceCost: (assetId: string, schemeId: string, cost: Omit<ServiceCost, 'id'>) => void;
  updateServiceCost: (assetId: string, schemeId: string, costId: string, updates: Partial<ServiceCost>) => void;
  removeServiceCost: (assetId: string, schemeId: string, costId: string) => void;
  selectQuoteScheme: (assetId: string, schemeId: string) => void;

  addApprovalRecord: (assetId: string, record: Omit<ApprovalRecord, 'id' | 'timestamp'>) => void;
  submitForReview: (assetId: string, comment: string, submitter: string) => void;
  approveReview: (assetId: string, recordId: string, comment: string, approver: string) => void;
  rejectReview: (assetId: string, recordId: string, comment: string, approver: string) => void;

  addModificationTrace: (assetId: string, trace: Omit<ModificationTrace, 'id' | 'timestamp' | 'assetId'>) => void;
  recordFieldChange: (
    assetId: string,
    module: ModuleType,
    action: 'add' | 'update' | 'delete' | 'modify',
    options: {
      fieldName?: string;
      fieldLabel?: string;
      itemName?: string;
      oldValue?: string;
      newValue?: string;
      operator?: string;
    }
  ) => void;

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
    const scoringCriteria = asset.scoringCriteria || JSON.parse(JSON.stringify(defaultScoringCriteria));
    const historicalPrices = asset.historicalPrices || [];

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
      historicalPrices,
      scoringCriteria,
      totalScore: calculateTotalScore(scoringCriteria),
      valuationLevel: 'D',
      estimatedValue: 0,
      scenarioConfig: getDefaultScenarioConfig(scoringCriteria, historicalPrices),
      risks: [],
      quoteSchemes: [],
      approvalRecords: [],
      modificationTraces: [],
      ...asset,
    };

    const state = get();
    const newAssets = [...state.assets, newAsset];
    set({ assets: newAssets, selectedAssetId: newAsset.id });

    get().addModificationTrace(newAsset.id, {
      module: 'basic',
      action: 'add',
      itemName: newAsset.name,
      operator: newAsset.owner || '产品经理',
    });

    get().recalculateAllDerived(newAsset.id);
    saveToStorage({ ...get(), assets: get().assets, selectedAssetId: newAsset.id });
    return newAsset;
  },

  updateAsset: (id, updates, module = 'basic') => {
    const state = get();
    const oldAsset = state.assets.find((a) => a.id === id);
    if (!oldAsset) return;

    if (updates.dataVolume && updates.dataVolume !== oldAsset.dataVolume) {
      get().addModificationTrace(id, {
        module: 'metrics',
        action: 'update',
        fieldName: 'dataVolume',
        fieldLabel: '数据规模',
        oldValue: oldAsset.dataVolume,
        newValue: updates.dataVolume,
      });
    }

    if (updates.name && updates.name !== oldAsset.name) {
      get().addModificationTrace(id, {
        module: 'basic',
        action: 'update',
        fieldName: 'name',
        fieldLabel: '资产名称',
        oldValue: oldAsset.name,
        newValue: updates.name,
      });
    }

    if (updates.owner && updates.owner !== oldAsset.owner) {
      get().addModificationTrace(id, {
        module: 'basic',
        action: 'update',
        fieldName: 'owner',
        fieldLabel: '负责人',
        oldValue: oldAsset.owner,
        newValue: updates.owner,
      });
    }

    if (updates.status && updates.status !== oldAsset.status) {
      get().addModificationTrace(id, {
        module: 'basic',
        action: 'update',
        fieldName: 'status',
        fieldLabel: '资产状态',
        oldValue: statusLabel[oldAsset.status],
        newValue: statusLabel[updates.status as AssetStatus],
      });
    }

    const newAssets = state.assets.map((a) =>
      a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
    );
    set({ assets: newAssets });
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
    const newAssets: DataAsset[] = imported.map((asset) => {
      const scoringCriteria = asset.scoringCriteria || JSON.parse(JSON.stringify(defaultScoringCriteria));
      const historicalPrices = asset.historicalPrices || [];
      return {
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
        historicalPrices,
        scoringCriteria,
        totalScore: calculateTotalScore(scoringCriteria),
        valuationLevel: 'D',
        estimatedValue: 0,
        scenarioConfig: getDefaultScenarioConfig(scoringCriteria, historicalPrices),
        risks: [],
        quoteSchemes: [],
        approvalRecords: [],
        modificationTraces: [],
        ...asset,
      };
    });

    const state = get();
    const result = [...state.assets, ...newAssets];
    set({ assets: result });

    newAssets.forEach((a) => {
      get().addModificationTrace(a.id, {
        module: 'basic',
        action: 'add',
        itemName: a.name,
        operator: a.owner || '产品经理',
      });
      get().recalculateAllDerived(a.id);
    });

    saveToStorage({ ...get(), assets: get().assets });
  },

  addDataSource: (assetId, source) => {
    const state = get();
    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? { ...a, dataSources: [...a.dataSources, { ...source, id: uuidv4() }], updatedAt: new Date().toISOString() }
        : a
    );
    set({ assets: newAssets });

    get().addModificationTrace(assetId, {
      module: 'metrics',
      action: 'add',
      itemName: source.name,
      fieldLabel: '数据来源',
      newValue: `${source.type}，可靠性${source.reliability}%`,
    });

    saveToStorage({ ...get(), assets: newAssets });
  },

  updateDataSource: (assetId, sourceId, updates) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    const oldSource = asset?.dataSources.find((s) => s.id === sourceId);
    if (!oldSource) return;

    if (updates.name && updates.name !== oldSource.name) {
      get().addModificationTrace(assetId, {
        module: 'metrics',
        action: 'update',
        itemName: oldSource.name,
        fieldLabel: '数据来源名称',
        oldValue: oldSource.name,
        newValue: updates.name,
      });
    }

    if (updates.reliability !== undefined && updates.reliability !== oldSource.reliability) {
      get().addModificationTrace(assetId, {
        module: 'metrics',
        action: 'update',
        itemName: oldSource.name,
        fieldLabel: '数据可靠性',
        oldValue: `${oldSource.reliability}%`,
        newValue: `${updates.reliability}%`,
      });
    }

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

    get().addModificationTrace(assetId, {
      module: 'metrics',
      action: 'delete',
      itemName: source?.name || '未命名',
      fieldLabel: '数据来源',
      oldValue: source?.type,
    });

    saveToStorage({ ...get(), assets: newAssets });
  },

  updateCoverageScope: (assetId, scope) => {
    const state = get();
    const oldAsset = state.assets.find((a) => a.id === assetId);
    if (!oldAsset) return;

    if (scope.regions && JSON.stringify(scope.regions) !== JSON.stringify(oldAsset.coverageScope.regions)) {
      get().addModificationTrace(assetId, {
        module: 'metrics',
        action: 'update',
        fieldName: 'coverageRegions',
        fieldLabel: '覆盖地区',
        oldValue: oldAsset.coverageScope.regions.join('、') || '空',
        newValue: scope.regions.join('、') || '空',
      });
    }

    if (scope.industries && JSON.stringify(scope.industries) !== JSON.stringify(oldAsset.coverageScope.industries)) {
      get().addModificationTrace(assetId, {
        module: 'metrics',
        action: 'update',
        fieldName: 'coverageIndustries',
        fieldLabel: '覆盖行业',
        oldValue: oldAsset.coverageScope.industries.join('、') || '空',
        newValue: scope.industries.join('、') || '空',
      });
    }

    if (scope.population !== undefined && scope.population !== oldAsset.coverageScope.population && scope.population !== null) {
      get().addModificationTrace(assetId, {
        module: 'metrics',
        action: 'update',
        fieldName: 'coveragePopulation',
        fieldLabel: '覆盖人口',
        oldValue: oldAsset.coverageScope.population !== undefined ? `${oldAsset.coverageScope.population.toLocaleString()}人` : '空',
        newValue: `${scope.population.toLocaleString()}人`,
      });
    }

    if (scope.enterprises !== undefined && scope.enterprises !== oldAsset.coverageScope.enterprises && scope.enterprises !== null) {
      get().addModificationTrace(assetId, {
        module: 'metrics',
        action: 'update',
        fieldName: 'coverageEnterprises',
        fieldLabel: '覆盖企业',
        oldValue: oldAsset.coverageScope.enterprises !== undefined ? `${oldAsset.coverageScope.enterprises.toLocaleString()}家` : '空',
        newValue: `${scope.enterprises.toLocaleString()}家`,
      });
    }

    if (scope.description !== undefined && scope.description !== oldAsset.coverageScope.description) {
      get().addModificationTrace(assetId, {
        module: 'metrics',
        action: 'update',
        fieldName: 'coverageDescription',
        fieldLabel: '覆盖范围说明',
        oldValue: oldAsset.coverageScope.description || '空',
        newValue: scope.description || '空',
      });
    }

    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? { ...a, coverageScope: { ...a.coverageScope, ...scope }, updatedAt: new Date().toISOString() }
        : a
    );
    set({ assets: newAssets });
    saveToStorage({ ...get(), assets: newAssets });
  },

  setUpdateFrequency: (assetId, freq) => {
    const state = get();
    const oldAsset = state.assets.find((a) => a.id === assetId);
    if (!oldAsset || oldAsset.updateFrequency === freq) return;

    get().addModificationTrace(assetId, {
      module: 'metrics',
      action: 'update',
      fieldName: 'updateFrequency',
      fieldLabel: '更新频率',
      oldValue: frequencyLabel[oldAsset.updateFrequency],
      newValue: frequencyLabel[freq],
    });

    const newAssets = state.assets.map((a) =>
      a.id === assetId ? { ...a, updateFrequency: freq, updatedAt: new Date().toISOString() } : a
    );
    set({ assets: newAssets });
    saveToStorage({ ...get(), assets: newAssets });
  },

  setDataVolume: (assetId, volume) => {
    const state = get();
    const oldAsset = state.assets.find((a) => a.id === assetId);
    if (!oldAsset || oldAsset.dataVolume === volume) return;

    get().addModificationTrace(assetId, {
      module: 'metrics',
      action: 'update',
      fieldName: 'dataVolume',
      fieldLabel: '数据规模',
      oldValue: oldAsset.dataVolume || '空',
      newValue: volume || '空',
    });

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

    get().addModificationTrace(assetId, {
      module: 'metrics',
      action: 'add',
      itemName: scenario.name,
      fieldLabel: '应用场景',
      newValue: scenario.category,
    });

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

    get().addModificationTrace(assetId, {
      module: 'metrics',
      action: 'delete',
      itemName: scenario?.name || '未命名',
      fieldLabel: '应用场景',
      oldValue: scenario?.category,
    });

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

    get().addModificationTrace(assetId, {
      module: 'metrics',
      action: 'add',
      itemName: price.buyer,
      fieldLabel: '历史交易价格',
      newValue: formatMoney(price.price),
    });

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

    get().addModificationTrace(assetId, {
      module: 'metrics',
      action: 'delete',
      itemName: price?.buyer || '未命名',
      fieldLabel: '历史交易价格',
      oldValue: price ? formatMoney(price.price) : undefined,
    });

    get().recalculateAllDerived(assetId);
    saveToStorage({ ...get(), assets: get().assets });
  },

  updateScoringCriteria: (assetId, criteria) => {
    const state = get();
    const oldAsset = state.assets.find((a) => a.id === assetId);
    if (!oldAsset) return;

    const totalScore = calculateTotalScore(criteria);
    const level = calculateValuationLevel(totalScore);
    const estimatedValue = calculateEstimatedValue(totalScore, oldAsset.historicalPrices);

    if (totalScore !== oldAsset.totalScore) {
      get().addModificationTrace(assetId, {
        module: 'valuation',
        action: 'update',
        fieldName: 'totalScore',
        fieldLabel: '综合评分',
        oldValue: `${oldAsset.totalScore} 分`,
        newValue: `${totalScore} 分`,
      });
    }

    if (level !== oldAsset.valuationLevel) {
      get().addModificationTrace(assetId, {
        module: 'valuation',
        action: 'update',
        fieldName: 'valuationLevel',
        fieldLabel: '估值等级',
        oldValue: oldAsset.valuationLevel,
        newValue: level,
      });
    }

    if (estimatedValue !== oldAsset.estimatedValue) {
      get().addModificationTrace(assetId, {
        module: 'valuation',
        action: 'update',
        fieldName: 'estimatedValue',
        fieldLabel: '预估价值',
        oldValue: formatMoney(oldAsset.estimatedValue),
        newValue: formatMoney(estimatedValue),
      });
    }

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

    get().recalculateScenarios(assetId);
    saveToStorage({ ...get(), assets: get().assets });
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
    get().recalculateScenarios(assetId);
    saveToStorage({ ...get(), assets: get().assets });
  },

  updateScenarioConfig: (assetId, type, updates) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset || !asset.scenarioConfig) return;

    const oldScenario = asset.scenarioConfig[type];
    const newScenario = { ...oldScenario, ...updates };

    const recalculated = calculateScenarioValue(type, asset.scoringCriteria, asset.historicalPrices, {
      priceMultiplier: newScenario.priceMultiplier,
      scoreMultiplier: newScenario.scoreMultiplier,
    });

    newScenario.totalScore = recalculated.totalScore;
    newScenario.valuationLevel = recalculated.valuationLevel;
    newScenario.estimatedValue = recalculated.estimatedValue;

    get().addModificationTrace(assetId, {
      module: 'valuation',
      action: 'update',
      itemName: newScenario.name,
      fieldLabel: '情景测算参数',
      oldValue: `价格系数${oldScenario.priceMultiplier}，评分系数${oldScenario.scoreMultiplier}`,
      newValue: `价格系数${newScenario.priceMultiplier}，评分系数${newScenario.scoreMultiplier}`,
    });

    const newConfig: ScenarioConfig = {
      ...asset.scenarioConfig,
      [type]: newScenario,
      updatedAt: new Date().toISOString(),
    };

    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? { ...a, scenarioConfig: newConfig, updatedAt: new Date().toISOString() }
        : a
    );
    set({ assets: newAssets });
    saveToStorage({ ...get(), assets: newAssets });
  },

  recalculateScenarios: (assetId) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) return;

    const currentConfig = asset.scenarioConfig || getDefaultScenarioConfig(asset.scoringCriteria, asset.historicalPrices);

    const newConfig: ScenarioConfig = {
      conservative: {
        ...currentConfig.conservative,
        ...calculateScenarioValue('conservative', asset.scoringCriteria, asset.historicalPrices, {
          priceMultiplier: currentConfig.conservative.priceMultiplier,
          scoreMultiplier: currentConfig.conservative.scoreMultiplier,
        }),
      },
      base: {
        ...currentConfig.base,
        ...calculateScenarioValue('base', asset.scoringCriteria, asset.historicalPrices, {
          priceMultiplier: currentConfig.base.priceMultiplier,
          scoreMultiplier: currentConfig.base.scoreMultiplier,
        }),
      },
      optimistic: {
        ...currentConfig.optimistic,
        ...calculateScenarioValue('optimistic', asset.scoringCriteria, asset.historicalPrices, {
          priceMultiplier: currentConfig.optimistic.priceMultiplier,
          scoreMultiplier: currentConfig.optimistic.scoreMultiplier,
        }),
      },
      updatedAt: new Date().toISOString(),
    };

    const newAssets = state.assets.map((a) =>
      a.id === assetId ? { ...a, scenarioConfig: newConfig } : a
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

    get().addModificationTrace(assetId, {
      module: 'risk',
      action: 'add',
      itemName: risk.title,
      fieldLabel: '风险项',
      newValue: risk.level === 'high' ? '高风险' : risk.level === 'medium' ? '中风险' : '低风险',
    });

    saveToStorage({ ...get(), assets: newAssets });
  },

  updateRisk: (assetId, riskId, updates) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    const oldRisk = asset?.risks.find((r) => r.id === riskId);
    if (!oldRisk) return;

    if (updates.level && updates.level !== oldRisk.level) {
      get().addModificationTrace(assetId, {
        module: 'risk',
        action: 'update',
        itemName: oldRisk.title,
        fieldLabel: '风险等级',
        oldValue: oldRisk.level === 'high' ? '高风险' : oldRisk.level === 'medium' ? '中风险' : '低风险',
        newValue: updates.level === 'high' ? '高风险' : updates.level === 'medium' ? '中风险' : '低风险',
      });
    }

    if (updates.title && updates.title !== oldRisk.title) {
      get().addModificationTrace(assetId, {
        module: 'risk',
        action: 'update',
        itemName: oldRisk.title,
        fieldLabel: '风险标题',
        oldValue: oldRisk.title,
        newValue: updates.title,
      });
    }

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

    get().addModificationTrace(assetId, {
      module: 'risk',
      action: 'delete',
      itemName: risk?.title || '未命名',
      fieldLabel: '风险项',
      oldValue: risk?.level === 'high' ? '高风险' : risk?.level === 'medium' ? '中风险' : '低风险',
    });

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

    get().addModificationTrace(assetId, {
      module: 'quote',
      action: 'add',
      itemName: scheme.name,
      fieldLabel: '报价方案',
      newValue: `${scheme.pricingModel}，总价${formatMoney(totalPrice)}`,
    });

    saveToStorage({ ...get(), assets: newAssets });
  },

  updateQuoteScheme: (assetId, schemeId, updates) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    const oldScheme = asset?.quoteSchemes.find((q) => q.id === schemeId);
    if (!oldScheme) return;

    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            quoteSchemes: a.quoteSchemes.map((q) => {
              if (q.id !== schemeId) return q;
              const merged = { ...q, ...updates };
              merged.totalPrice = merged.basePrice + merged.serviceCosts.reduce((s, c) => s + c.amount, 0);

              if (updates.basePrice !== undefined && updates.basePrice !== oldScheme.basePrice) {
                get().addModificationTrace(assetId, {
                  module: 'quote',
                  action: 'update',
                  itemName: oldScheme.name,
                  fieldLabel: '基础报价',
                  oldValue: formatMoney(oldScheme.basePrice),
                  newValue: formatMoney(merged.basePrice),
                });
              }

              if (merged.totalPrice !== oldScheme.totalPrice) {
                get().addModificationTrace(assetId, {
                  module: 'quote',
                  action: 'update',
                  itemName: oldScheme.name,
                  fieldLabel: '总价',
                  oldValue: formatMoney(oldScheme.totalPrice),
                  newValue: formatMoney(merged.totalPrice),
                });
              }

              return merged;
            }),
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
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

    get().addModificationTrace(assetId, {
      module: 'quote',
      action: 'delete',
      itemName: scheme?.name || '未命名',
      fieldLabel: '报价方案',
      oldValue: scheme ? formatMoney(scheme.totalPrice) : undefined,
    });

    saveToStorage({ ...get(), assets: newAssets });
  },

  addServiceCost: (assetId, schemeId, cost) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    const scheme = asset?.quoteSchemes.find((q) => q.id === schemeId);

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

    get().addModificationTrace(assetId, {
      module: 'quote',
      action: 'add',
      itemName: scheme?.name,
      fieldLabel: '附加服务成本',
      newValue: `${cost.name} - ${formatMoney(cost.amount)}`,
    });

    saveToStorage({ ...get(), assets: newAssets });
  },

  updateServiceCost: (assetId, schemeId, costId, updates) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    const scheme = asset?.quoteSchemes.find((q) => q.id === schemeId);
    const oldCost = scheme?.serviceCosts.find((c) => c.id === costId);
    if (!oldCost) return;

    if (updates.amount !== undefined && updates.amount !== oldCost.amount) {
      get().addModificationTrace(assetId, {
        module: 'quote',
        action: 'update',
        itemName: scheme?.name,
        fieldLabel: `服务成本·${oldCost.name}`,
        oldValue: formatMoney(oldCost.amount),
        newValue: formatMoney(updates.amount),
      });
    }

    if (updates.name && updates.name !== oldCost.name) {
      get().addModificationTrace(assetId, {
        module: 'quote',
        action: 'update',
        itemName: scheme?.name,
        fieldLabel: '服务成本名称',
        oldValue: oldCost.name,
        newValue: updates.name,
      });
    }

    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            quoteSchemes: a.quoteSchemes.map((q) => {
              if (q.id !== schemeId) return q;
              const newCosts = q.serviceCosts.map((c) =>
                c.id === costId ? { ...c, ...updates } : c
              );
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

  removeServiceCost: (assetId, schemeId, costId) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    const scheme = asset?.quoteSchemes.find((q) => q.id === schemeId);
    const cost = scheme?.serviceCosts.find((c) => c.id === costId);

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

    get().addModificationTrace(assetId, {
      module: 'quote',
      action: 'delete',
      itemName: scheme?.name,
      fieldLabel: '附加服务成本',
      oldValue: cost ? `${cost.name} - ${formatMoney(cost.amount)}` : undefined,
    });

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
      get().addModificationTrace(assetId, {
        module: 'quote',
        action: 'update',
        fieldName: 'selectedQuote',
        fieldLabel: '选用方案',
        newValue: `${scheme.name} - ${formatMoney(scheme.totalPrice)}`,
      });
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
    const lastSubmitRecord = [...asset.approvalRecords].reverse().find((r) => r.action === 'submit');
    const previousSnapshot = lastSubmitRecord?.nextSnapshot;

    let versionDiff = undefined;
    let traces = [...asset.modificationTraces];

    if (previousSnapshot) {
      versionDiff = calculateVersionDiff(
        assetId,
        lastSubmitRecord?.id || '',
        '',
        previousSnapshot as DataAsset,
        snapshot
      );
    }

    const lastSubmitTime = lastSubmitRecord?.timestamp || asset.createdAt;
    const newTraces = traces.filter((t) => new Date(t.timestamp) > new Date(lastSubmitTime));

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
                action: 'submit' as const,
                comment,
                timestamp: new Date().toISOString(),
                previousSnapshot,
                nextSnapshot: snapshot,
                versionDiff,
                traces: newTraces,
              },
            ],
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });
    saveToStorage({ ...get(), assets: newAssets });
  },

  approveReview: (assetId, recordId, comment, approver) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) return;

    const submitRecord = asset.approvalRecords.find((r) => r.id === recordId);
    const nextSnapshot = JSON.parse(JSON.stringify(asset));
    let versionDiff = undefined;

    if (submitRecord?.previousSnapshot) {
      versionDiff = calculateVersionDiff(
        assetId,
        recordId,
        '',
        submitRecord.previousSnapshot,
        nextSnapshot
      );
    }

    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            status: 'approved' as AssetStatus,
            currentApprover: undefined,
            approvalRecords: [
              ...a.approvalRecords,
              {
                id: uuidv4(),
                assetId,
                approver,
                role: '风控审核员',
                action: 'approve' as const,
                comment,
                timestamp: new Date().toISOString(),
                previousSnapshot: submitRecord?.previousSnapshot,
                nextSnapshot,
                versionDiff,
              },
            ],
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });

    get().addModificationTrace(assetId, {
      module: 'approval',
      action: 'update',
      fieldName: 'status',
      fieldLabel: '审批结果',
      oldValue: statusLabel[asset.status],
      newValue: '已通过',
      operator: approver,
    });

    saveToStorage({ ...get(), assets: get().assets });
  },

  rejectReview: (assetId, recordId, comment, approver) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) return;

    const submitRecord = asset.approvalRecords.find((r) => r.id === recordId);

    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            status: 'rejected' as AssetStatus,
            currentApprover: undefined,
            approvalRecords: [
              ...a.approvalRecords,
              {
                id: uuidv4(),
                assetId,
                approver,
                role: '风控审核员',
                action: 'reject' as const,
                comment,
                timestamp: new Date().toISOString(),
                previousSnapshot: submitRecord?.previousSnapshot,
              },
            ],
            updatedAt: new Date().toISOString(),
          }
        : a
    );
    set({ assets: newAssets });

    get().addModificationTrace(assetId, {
      module: 'approval',
      action: 'update',
      fieldName: 'status',
      fieldLabel: '审批结果',
      oldValue: statusLabel[asset.status],
      newValue: '已驳回',
      operator: approver,
    });

    saveToStorage({ ...get(), assets: get().assets });
  },

  addModificationTrace: (assetId, trace) => {
    const fullTrace: ModificationTrace = createModificationTrace(assetId, trace.module, trace.action, {
      fieldName: trace.fieldName,
      fieldLabel: trace.fieldLabel,
      itemName: trace.itemName,
      oldValue: trace.oldValue,
      newValue: trace.newValue,
      operator: trace.operator,
    });

    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) return;

    const lastTrace = asset.modificationTraces[asset.modificationTraces.length - 1];
    if (
      lastTrace &&
      lastTrace.module === fullTrace.module &&
      lastTrace.action === fullTrace.action &&
      lastTrace.fieldName === fullTrace.fieldName &&
      lastTrace.itemName === fullTrace.itemName &&
      new Date(fullTrace.timestamp).getTime() - new Date(lastTrace.timestamp).getTime() < 2000
    ) {
      return;
    }

    const newAssets = state.assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            modificationTraces: [...a.modificationTraces, fullTrace],
          }
        : a
    );
    set({ assets: newAssets });

    const displayDesc = traceToDisplay(fullTrace);
    const lastRecord = asset.approvalRecords[asset.approvalRecords.length - 1];
    const now = new Date();
    if (
      lastRecord &&
      lastRecord.action === 'modify' &&
      lastRecord.role === '系统记录' &&
      now.getTime() - new Date(lastRecord.timestamp).getTime() < 3000 &&
      lastRecord.comment.startsWith(displayDesc.substring(0, Math.min(8, displayDesc.length)))
    ) {
      return;
    }

    const finalAssets = get().assets.map((a) =>
      a.id === assetId
        ? {
            ...a,
            approvalRecords: [
              ...a.approvalRecords,
              {
                id: uuidv4(),
                assetId,
                approver: fullTrace.operator || '产品经理',
                role: '系统记录',
                action: 'modify' as const,
                comment: displayDesc,
                timestamp: fullTrace.timestamp,
              },
            ],
          }
        : a
    );
    set({ assets: finalAssets });
    saveToStorage({ ...get(), assets: finalAssets });
  },

  recordFieldChange: (assetId, module, action, options) => {
    get().addModificationTrace(assetId, {
      module,
      action,
      fieldName: options.fieldName,
      fieldLabel: options.fieldLabel,
      itemName: options.itemName,
      oldValue: options.oldValue,
      newValue: options.newValue,
      operator: options.operator,
    });
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
    get().recalculateScenarios(assetId);
  },
}));
