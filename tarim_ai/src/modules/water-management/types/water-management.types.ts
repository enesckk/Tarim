export type WaterSourceType =
  | 'Groundwater Well'
  | 'DSİ Well'
  | 'Shared Well'
  | 'Irrigation Canal'
  | 'Pond'
  | 'Dam'
  | 'Spring'
  | 'River'
  | 'Municipal Water'
  | 'Rainwater Storage'
  | 'Other';

export type WaterLabStatus =
  | 'Draft'
  | 'Uploaded'
  | 'Parsed'
  | 'Verified'
  | 'Approved'
  | 'Rejected'
  | 'Archived';

export interface WmWaterSource {
  id: string;
  parcelId: string;
  name: string;
  sourceType: WaterSourceType;
  active: boolean;
  owner: string | null;
  shared: boolean;
  distanceToParcel: number | null;
  available: boolean;
  seasonal: boolean;
  estimatedCapacity: number | null;
  flowRate: number | null;
  pumpAvailable: boolean;
  electricityAvailable: boolean;
  licenseNumber: string | null;
  notes: string | null;
  dataConfidence: string | null;
  sourceQuality: string | null;
  reviewStatus: string | null;
  approvalStatus: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WmWaterQuantity {
  id: string;
  sourceId: string;
  estimatedFlow: number | null;
  measuredFlow: number | null;
  dailyCapacity: number | null;
  seasonalCapacity: number | null;
  reliability: string | null;
  measurementDate: string | null;
  measurementSource: string | null;
  createdAt: string;
}

export interface WmAnalysisResult {
  id: string;
  reportId: string;
  parameterName: string;
  value: number;
  unit: string | null;
  sourceUnit: string | null;
  createdAt: string;
}

export interface WmLaboratoryReport {
  id: string;
  sourceId: string;
  status: WaterLabStatus;
  analysisDate: string | null;
  samplingDate: string | null;
  reportNumber: string | null;
  analyst: string | null;
  notes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;

  results?: WmAnalysisResult[];
}

export interface WmWaterSourceAggregate extends WmWaterSource {
  quantity?: WmWaterQuantity;
  latestReport?: WmLaboratoryReport;
}
