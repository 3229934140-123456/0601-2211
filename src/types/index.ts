export type AssetStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type ValuationLevel = 'S' | 'A' | 'B' | 'C' | 'D';
export type RiskLevel = 'high' | 'medium' | 'low';
export type UpdateFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface DataSource {
  id: string;
  name: string;
  type: string;
  reliability: number;
  description?: string;
}

export interface CoverageScope {
  regions: string[];
  industries: string[];
  population?: number;
  enterprises?: number;
  description?: string;
}

export interface ApplicationScenario {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface HistoricalPrice {
  id: string;
  date: string;
  price: number;
  buyer: string;
  transactionType: string;
  notes?: string;
}

export interface RiskItem {
  id: string;
  type: 'ownership' | 'compliance' | 'quality' | 'security';
  level: RiskLevel;
  title: string;
  description: string;
  mitigation?: string;
}

export interface ScoringCriterion {
  id: string;
  name: string;
  category: string;
  weight: number;
  score: number;
  description?: string;
}

export interface ServiceCost {
  id: string;
  name: string;
  amount: number;
  description?: string;
}

export interface QuoteScheme {
  id: string;
  name: string;
  basePrice: number;
  serviceCosts: ServiceCost[];
  totalPrice: number;
  pricingModel: string;
  description?: string;
  isRecommended?: boolean;
}

export interface ApprovalRecord {
  id: string;
  assetId: string;
  approver: string;
  role: string;
  action: 'submit' | 'approve' | 'reject' | 'review' | 'modify';
  comment: string;
  timestamp: string;
  previousSnapshot?: Partial<DataAsset>;
}

export interface DataAsset {
  id: string;
  name: string;
  code: string;
  category: string;
  industry: string;
  description: string;
  owner: string;
  department: string;
  status: AssetStatus;
  createdAt: string;
  updatedAt: string;

  dataSources: DataSource[];
  updateFrequency: UpdateFrequency;
  lastUpdated: string;
  dataVolume: string;
  coverageScope: CoverageScope;
  applicationScenarios: ApplicationScenario[];
  historicalPrices: HistoricalPrice[];

  scoringCriteria: ScoringCriterion[];
  totalScore: number;
  valuationLevel: ValuationLevel;
  estimatedValue: number;

  risks: RiskItem[];

  quoteSchemes: QuoteScheme[];
  selectedQuoteId?: string;

  approvalRecords: ApprovalRecord[];
  currentApprover?: string;
}

export interface AppState {
  assets: DataAsset[];
  selectedAssetId: string | null;
  industryFilter: string;
  industries: string[];
}
