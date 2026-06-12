import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import {
  UpdateFrequency,
  ValuationLevel,
  RiskLevel,
  AssetStatus,
  DataAsset,
  FieldChange,
  VersionDiff,
  ScenarioConfig,
  HistoricalPrice,
  ScoringCriterion,
  ScenarioType,
  ModificationTrace,
  QuoteScheme,
  RiskItem,
  DataSource,
  CoverageScope,
  ApplicationScenario,
} from '../types';

export const formatMoney = (amount: number): string => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatDate = (dateStr: string, format = 'YYYY-MM-DD'): string => {
  return dayjs(dateStr).format(format);
};

export const formatDateTime = (dateStr: string): string => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss');
};

export const frequencyLabel: Record<UpdateFrequency, string> = {
  realtime: '实时',
  hourly: '每小时',
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  quarterly: '每季度',
  yearly: '每年',
};

export const scenarioLabels: Record<ScenarioType, { label: string; color: string; desc: string }> = {
  conservative: { label: '保守', color: '#52c41a', desc: '按历史均价下限、评分下调10%测算' },
  base: { label: '基准', color: '#1677ff', desc: '按当前评分和历史均价测算' },
  optimistic: { label: '乐观', color: '#fa8c16', desc: '按历史均价上限、评分上调10%测算' },
};

export const levelColorMap: Record<ValuationLevel, { bg: string; text: string; border: string }> = {
  S: { bg: '#fff1f0', text: '#cf1322', border: '#ffa39e' },
  A: { bg: '#fff7e6', text: '#d46b08', border: '#ffd591' },
  B: { bg: '#e6f4ff', text: '#0958d9', border: '#91caff' },
  C: { bg: '#f6ffed', text: '#389e0d', border: '#b7eb8f' },
  D: { bg: '#f5f5f5', text: '#595959', border: '#d9d9d9' },
};

export const levelDescription: Record<ValuationLevel, string> = {
  S: '极高价值资产，市场稀缺性强，应用场景广泛，数据质量优秀',
  A: '高价值资产，具有较强的市场竞争力和应用价值',
  B: '中等价值资产，具备基本的市场价值和应用场景',
  C: '较低价值资产，价值有限，需结合特定场景使用',
  D: '低价值资产，建议谨慎评估使用场景',
};

export const riskLevelLabel: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

export const riskTypeLabel: Record<string, string> = {
  ownership: '权属风险',
  compliance: '合规风险',
  quality: '质量风险',
  security: '安全风险',
};

export const statusLabel: Record<AssetStatus, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

export const statusColor: Record<AssetStatus, string> = {
  draft: 'default',
  pending: 'processing',
  approved: 'success',
  rejected: 'error',
};

export const approvalActionLabel: Record<string, string> = {
  submit: '提交审核',
  approve: '审核通过',
  reject: '审核驳回',
  review: '评审意见',
  modify: '修改记录',
};

export const moduleLabels: Record<string, string> = {
  basic: '基础信息',
  metrics: '指标数据',
  valuation: '价值评估',
  risk: '风险提示',
  quote: '报价方案',
  approval: '审批记录',
};

export const actionLabels: Record<string, string> = {
  add: '新增',
  update: '更新',
  delete: '删除',
  modify: '修改',
};

export const getLevelProgressColor = (score: number): string => {
  if (score >= 90) return '#cf1322';
  if (score >= 80) return '#d46b08';
  if (score >= 70) return '#0958d9';
  if (score >= 60) return '#389e0d';
  return '#8c8c8c';
};

export const calculateValuationLevel = (score: number): ValuationLevel => {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
};

export const calculateTotalScore = (criteria: ScoringCriterion[]): number => {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = criteria.reduce((sum, c) => sum + c.score * c.weight, 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10;
};

export const calculateScenarioValue = (
  type: ScenarioType,
  criteria: ScoringCriterion[],
  historicalPrices: HistoricalPrice[],
  customMultipliers?: { priceMultiplier?: number; scoreMultiplier?: number }
): { totalScore: number; valuationLevel: ValuationLevel; estimatedValue: number; priceMultiplier: number; scoreMultiplier: number } => {
  const baseScore = calculateTotalScore(criteria);
  const avgPrice =
    historicalPrices.length > 0
      ? historicalPrices.reduce((sum, p) => sum + p.price, 0) / historicalPrices.length
      : 500000;

  const defaultMultipliers: Record<ScenarioType, { price: number; score: number }> = {
    conservative: { price: 0.8, score: 0.9 },
    base: { price: 1.0, score: 1.0 },
    optimistic: { price: 1.2, score: 1.1 },
  };

  const priceMultiplier = customMultipliers?.priceMultiplier ?? defaultMultipliers[type].price;
  const scoreMultiplier = customMultipliers?.scoreMultiplier ?? defaultMultipliers[type].score;

  const adjustedScore = Math.min(100, Math.max(0, Math.round(baseScore * scoreMultiplier * 10) / 10));
  const level = calculateValuationLevel(adjustedScore);
  const baseValue = avgPrice * priceMultiplier;
  const valueFactor = 0.5 + (adjustedScore / 100) * 1.5;
  const estimatedValue = Math.round(baseValue * valueFactor);

  return {
    totalScore: adjustedScore,
    valuationLevel: level,
    estimatedValue,
    priceMultiplier,
    scoreMultiplier,
  };
};

export const getDefaultScenarioConfig = (
  criteria: ScoringCriterion[],
  historicalPrices: HistoricalPrice[]
): ScenarioConfig => {
  return {
    conservative: {
      type: 'conservative',
      name: '保守情景',
      ...calculateScenarioValue('conservative', criteria, historicalPrices),
      note: '谨慎原则，考虑市场下行风险',
    },
    base: {
      type: 'base',
      name: '基准情景',
      ...calculateScenarioValue('base', criteria, historicalPrices),
      note: '当前数据下的中性估值',
    },
    optimistic: {
      type: 'optimistic',
      name: '乐观情景',
      ...calculateScenarioValue('optimistic', criteria, historicalPrices),
      note: '考虑市场上行和业务拓展潜力',
    },
    updatedAt: new Date().toISOString(),
  };
};

const formatValue = (val: unknown): string => {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') {
    if (val >= 10000) return formatMoney(val);
    return val.toString();
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '空';
    return val.join('、');
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
};

interface CompareFieldConfig {
  field: string;
  label: string;
  category: 'basic' | 'metrics' | 'valuation' | 'risk' | 'quote';
  getValue?: (asset: Partial<DataAsset>) => unknown;
  format?: (val: unknown) => string;
}

const compareConfig: CompareFieldConfig[] = [
  { field: 'name', label: '资产名称', category: 'basic' },
  { field: 'code', label: '资产编号', category: 'basic' },
  { field: 'category', label: '资产分类', category: 'basic' },
  { field: 'industry', label: '所属行业', category: 'basic' },
  { field: 'owner', label: '负责人', category: 'basic' },
  { field: 'department', label: '所属部门', category: 'basic' },
  { field: 'description', label: '资产描述', category: 'basic' },
  { field: 'status', label: '资产状态', category: 'basic', format: (v) => statusLabel[v as AssetStatus] || String(v) },
  { field: 'dataVolume', label: '数据规模', category: 'metrics' },
  {
    field: 'updateFrequency',
    label: '更新频率',
    category: 'metrics',
    format: (v) => frequencyLabel[v as UpdateFrequency] || String(v),
  },
  {
    field: 'dataSources',
    label: '数据来源',
    category: 'metrics',
    getValue: (a) => (a.dataSources || []).map((s: DataSource) => s.name).join('、'),
  },
  {
    field: 'coverageRegions',
    label: '覆盖地区',
    category: 'metrics',
    getValue: (a) => (a.coverageScope?.regions || []).join('、'),
  },
  {
    field: 'coverageIndustries',
    label: '覆盖行业',
    category: 'metrics',
    getValue: (a) => (a.coverageScope?.industries || []).join('、'),
  },
  {
    field: 'coveragePopulation',
    label: '覆盖人口',
    category: 'metrics',
    getValue: (a) => a.coverageScope?.population,
    format: (v) => (v ? (v as number).toLocaleString() + ' 人' : '-'),
  },
  {
    field: 'coverageEnterprises',
    label: '覆盖企业',
    category: 'metrics',
    getValue: (a) => a.coverageScope?.enterprises,
    format: (v) => (v ? (v as number).toLocaleString() + ' 家' : '-'),
  },
  {
    field: 'applicationScenarios',
    label: '应用场景',
    category: 'metrics',
    getValue: (a) => (a.applicationScenarios || []).map((s: ApplicationScenario) => `${s.name}(${s.category})`).join('、'),
  },
  {
    field: 'historicalPricesCount',
    label: '历史交易数',
    category: 'metrics',
    getValue: (a) => (a.historicalPrices || []).length,
  },
  {
    field: 'historicalPricesAvg',
    label: '历史均价',
    category: 'metrics',
    getValue: (a) => {
      const prices = a.historicalPrices || [];
      return prices.length > 0 ? Math.round(prices.reduce((s: number, p: HistoricalPrice) => s + p.price, 0) / prices.length) : 0;
    },
    format: (v) => formatMoney(v as number),
  },
  {
    field: 'totalScore',
    label: '综合评分',
    category: 'valuation',
    format: (v) => `${v} 分`,
  },
  {
    field: 'valuationLevel',
    label: '估值等级',
    category: 'valuation',
  },
  {
    field: 'estimatedValue',
    label: '预估价值',
    category: 'valuation',
    format: (v) => formatMoney(v as number),
  },
  {
    field: 'criteria',
    label: '评分配置',
    category: 'valuation',
    getValue: (a) => {
      const arr = a.scoringCriteria || [];
      return arr.map((c: ScoringCriterion) => `${c.name}:${c.score}分(${c.weight}%)`).join(' | ');
    },
  },
  {
    field: 'risksCount',
    label: '风险项数',
    category: 'risk',
    getValue: (a) => (a.risks || []).length,
  },
  {
    field: 'risks',
    label: '风险清单',
    category: 'risk',
    getValue: (a) => (a.risks || []).map((r: RiskItem) => `${r.title}(${riskLevelLabel[r.level]})`).join('、'),
  },
  {
    field: 'quoteSchemesCount',
    label: '报价方案数',
    category: 'quote',
    getValue: (a) => (a.quoteSchemes || []).length,
  },
  {
    field: 'quoteSchemes',
    label: '报价方案',
    category: 'quote',
    getValue: (a) => (a.quoteSchemes || []).map((q: QuoteScheme) => `${q.name}:${formatMoney(q.totalPrice)}`).join(' | '),
  },
];

export const calculateVersionDiff = (
  assetId: string,
  fromRecordId: string,
  toRecordId: string,
  oldAsset: Partial<DataAsset>,
  newAsset: Partial<DataAsset>
): VersionDiff => {
  const changes: FieldChange[] = [];

  for (const config of compareConfig) {
    const oldVal = config.getValue ? config.getValue(oldAsset) : oldAsset[config.field as keyof DataAsset];
    const newVal = config.getValue ? config.getValue(newAsset) : newAsset[config.field as keyof DataAsset];

    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);

    if (oldStr !== newStr) {
      changes.push({
        field: config.field,
        label: config.label,
        category: config.category,
        oldValue: oldVal,
        newValue: newVal,
        oldDisplay: config.format ? config.format(oldVal) : formatValue(oldVal),
        newDisplay: config.format ? config.format(newVal) : formatValue(newVal),
      });
    }
  }

  return {
    id: uuidv4(),
    assetId,
    fromRecordId,
    toRecordId,
    changes,
    calculatedAt: new Date().toISOString(),
  };
};

export const createModificationTrace = (
  assetId: string,
  module: ModificationTrace['module'],
  action: ModificationTrace['action'],
  options: {
    fieldName?: string;
    fieldLabel?: string;
    itemName?: string;
    oldValue?: string;
    newValue?: string;
    operator?: string;
  } = {}
): ModificationTrace => ({
  id: uuidv4(),
  assetId,
  module,
  action,
  fieldName: options.fieldName,
  fieldLabel: options.fieldLabel,
  itemName: options.itemName,
  oldValue: options.oldValue,
  newValue: options.newValue,
  operator: options.operator || '产品经理',
  timestamp: new Date().toISOString(),
});

export const traceToDisplay = (trace: ModificationTrace): string => {
  const moduleName = moduleLabels[trace.module] || trace.module;
  const actionName = actionLabels[trace.action] || trace.action;

  if (trace.fieldLabel && trace.itemName) {
    if (trace.oldValue && trace.newValue) {
      return `${moduleName}·${trace.itemName}·${trace.fieldLabel}：${trace.oldValue} → ${trace.newValue}`;
    }
    if (trace.newValue) {
      return `${moduleName}·${trace.itemName}·${trace.fieldLabel}：${trace.newValue}`;
    }
    return `${moduleName}·${actionName}·${trace.itemName}·${trace.fieldLabel}`;
  }

  if (trace.itemName) {
    return `${actionName}${moduleName}·${trace.itemName}`;
  }

  if (trace.fieldLabel) {
    if (trace.oldValue && trace.newValue) {
      return `${moduleName}·${trace.fieldLabel}：${trace.oldValue} → ${trace.newValue}`;
    }
    return `${actionName}${moduleName}·${trace.fieldLabel}`;
  }

  return `${actionName}${moduleName}`;
};

export const exportToJSON = (data: unknown, filename: string) => {
  const content = JSON.stringify(data, null, 2);
  if ((window as any).electronAPI) {
    (window as any).electronAPI.saveFile(content, filename, 'json');
  } else {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};

export const importFromJSON = async (): Promise<unknown | null> => {
  if ((window as any).electronAPI) {
    const result = await (window as any).electronAPI.openFile([
      { name: 'JSON', extensions: ['json'] },
    ]);
    if (result.success) {
      return JSON.parse(result.content);
    }
    return null;
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            resolve(JSON.parse(evt.target?.result as string));
          } catch {
            resolve(null);
          }
        };
        reader.readAsText(file);
      } else {
        resolve(null);
      }
    };
    input.click();
  });
};

declare global {
  interface Window {
    electronAPI: {
      saveFile: (content: string, filename: string, type: string) => Promise<{ success: boolean; path?: string }>;
      openFile: (filters: { name: string; extensions: string[] }[]) => Promise<{ success: boolean; path?: string; content?: string }>;
      exportPdf: (buffer: ArrayBuffer, filename: string) => Promise<{ success: boolean; path?: string }>;
    };
  }
}
