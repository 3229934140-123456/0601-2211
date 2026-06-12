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

interface StoreActions {
  setSelectedAsset: (id: string | null) => void;
  setIndustryFilter: (industry: string) => void;
  addAsset: (asset: Partial<DataAsset>) => DataAsset;
  updateAsset: (id: string, updates: Partial<DataAsset>) => void;
  deleteAsset: (id: string) => void;
  importAssets: (assets: Partial<DataAsset>[]) => void;

  addDataSource: (assetId: string, source: Omit<DataSource, 'id'>) => void;
  updateDataSource: (assetId: string, sourceId: string, updates: Partial<DataSource>) => void;
  removeDataSource: (assetId: string, sourceId: string) => void;

  updateCoverageScope: (assetId: string, scope: Partial<CoverageScope>) => void;
  setUpdateFrequency: (assetId: string, freq: UpdateFrequency) => void;

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
}

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
  const avgPrice = historicalPrices.length > 0
    ? historicalPrices.reduce((sum, p) => sum + p.price, 0) / historicalPrices.length
    : 0;
  const baseValue = avgPrice || 500000;
  const multiplier = 0.5 + (score / 100) * 1.5;
  return Math.round(baseValue * multiplier);
};

export const useAppStore = create<AppState & StoreActions>((set, get) => ({
  assets: mockAssets,
  selectedAssetId: mockAssets.length > 0 ? mockAssets[0].id : null,
  industryFilter: 'all',
  industries: defaultIndustries,

  setSelectedAsset: (id) => set({ selectedAssetId: id }),
  setIndustryFilter: (industry) => set({ industryFilter: industry }),

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
    set((state) => ({ assets: [...state.assets, newAsset], selectedAssetId: newAsset.id }));
    return newAsset;
  },

  updateAsset: (id, updates) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      ),
    })),

  deleteAsset: (id) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
      selectedAssetId: state.selectedAssetId === id ? null : state.selectedAssetId,
    })),

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
    set((state) => ({ assets: [...state.assets, ...newAssets] }));
  },

  addDataSource: (assetId, source) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? { ...a, dataSources: [...a.dataSources, { ...source, id: uuidv4() }], updatedAt: new Date().toISOString() }
          : a
      ),
    })),

  updateDataSource: (assetId, sourceId, updates) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              dataSources: a.dataSources.map((s) => (s.id === sourceId ? { ...s, ...updates } : s)),
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    })),

  removeDataSource: (assetId, sourceId) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? { ...a, dataSources: a.dataSources.filter((s) => s.id !== sourceId), updatedAt: new Date().toISOString() }
          : a
      ),
    })),

  updateCoverageScope: (assetId, scope) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? { ...a, coverageScope: { ...a.coverageScope, ...scope }, updatedAt: new Date().toISOString() }
          : a
      ),
    })),

  setUpdateFrequency: (assetId, freq) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId ? { ...a, updateFrequency: freq, updatedAt: new Date().toISOString() } : a
      ),
    })),

  addApplicationScenario: (assetId, scenario) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              applicationScenarios: [...a.applicationScenarios, { ...scenario, id: uuidv4() }],
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    })),

  removeApplicationScenario: (assetId, scenarioId) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              applicationScenarios: a.applicationScenarios.filter((s) => s.id !== scenarioId),
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    })),

  addHistoricalPrice: (assetId, price) =>
    set((state) => {
      const newAssets = state.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              historicalPrices: [...a.historicalPrices, { ...price, id: uuidv4() }],
              updatedAt: new Date().toISOString(),
            }
          : a
      );
      return { assets: newAssets };
    }),

  removeHistoricalPrice: (assetId, priceId) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? { ...a, historicalPrices: a.historicalPrices.filter((p) => p.id !== priceId), updatedAt: new Date().toISOString() }
          : a
      ),
    })),

  updateScoringCriteria: (assetId, criteria) =>
    set((state) => {
      const totalScore = calculateTotalScore(criteria);
      const level = calculateValuationLevel(totalScore);
      const asset = state.assets.find((a) => a.id === assetId);
      const estimatedValue = asset ? calculateEstimatedValue(totalScore, asset.historicalPrices) : 0;
      return {
        assets: state.assets.map((a) =>
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
        ),
      };
    }),

  recalculateScore: (assetId) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) return;
    const totalScore = calculateTotalScore(asset.scoringCriteria);
    const level = calculateValuationLevel(totalScore);
    const estimatedValue = calculateEstimatedValue(totalScore, asset.historicalPrices);
    set((s) => ({
      assets: s.assets.map((a) =>
        a.id === assetId
          ? { ...a, totalScore, valuationLevel: level, estimatedValue, updatedAt: new Date().toISOString() }
          : a
      ),
    }));
  },

  addRisk: (assetId, risk) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? { ...a, risks: [...a.risks, { ...risk, id: uuidv4() }], updatedAt: new Date().toISOString() }
          : a
      ),
    })),

  updateRisk: (assetId, riskId, updates) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              risks: a.risks.map((r) => (r.id === riskId ? { ...r, ...updates } : r)),
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    })),

  removeRisk: (assetId, riskId) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? { ...a, risks: a.risks.filter((r) => r.id !== riskId), updatedAt: new Date().toISOString() }
          : a
      ),
    })),

  addQuoteScheme: (assetId, scheme) => {
    const totalPrice = scheme.basePrice + scheme.serviceCosts.reduce((s, c) => s + c.amount, 0);
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              quoteSchemes: [...a.quoteSchemes, { ...scheme, id: uuidv4(), totalPrice }],
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    }));
  },

  updateQuoteScheme: (assetId, schemeId, updates) =>
    set((state) => ({
      assets: state.assets.map((a) =>
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
      ),
    })),

  removeQuoteScheme: (assetId, schemeId) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? { ...a, quoteSchemes: a.quoteSchemes.filter((q) => q.id !== schemeId), updatedAt: new Date().toISOString() }
          : a
      ),
    })),

  addServiceCost: (assetId, schemeId, cost) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              quoteSchemes: a.quoteSchemes.map((q) => {
                if (q.id !== schemeId) return q;
                const newCosts = [...q.serviceCosts, { ...cost, id: uuidv4() }];
                return { ...q, serviceCosts: newCosts, totalPrice: q.basePrice + newCosts.reduce((s, c) => s + c.amount, 0) };
              }),
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    })),

  removeServiceCost: (assetId, schemeId, costId) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              quoteSchemes: a.quoteSchemes.map((q) => {
                if (q.id !== schemeId) return q;
                const newCosts = q.serviceCosts.filter((c) => c.id !== costId);
                return { ...q, serviceCosts: newCosts, totalPrice: q.basePrice + newCosts.reduce((s, c) => s + c.amount, 0) };
              }),
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    })),

  selectQuoteScheme: (assetId, schemeId) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId ? { ...a, selectedQuoteId: schemeId, updatedAt: new Date().toISOString() } : a
      ),
    })),

  addApprovalRecord: (assetId, record) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              approvalRecords: [...a.approvalRecords, { ...record, id: uuidv4(), timestamp: new Date().toISOString() }],
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    })),

  submitForReview: (assetId, comment, submitter) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === assetId);
    if (!asset) return;
    const snapshot = JSON.parse(JSON.stringify(asset));
    set((s) => ({
      assets: s.assets.map((a) =>
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
      ),
    }));
  },
}));
