export type SoilLabStatus =
  | 'Draft'
  | 'Uploaded'
  | 'Parsed'
  | 'Verified'
  | 'Approved'
  | 'Rejected'
  | 'Archived';

export interface SoilAnalysisResult {
  id: string;
  reportId: string;
  parameterName: string;
  value: number;
  unit: string | null;
  sourceUnit: string | null;
  createdAt: string;
}

export interface SoilQualityControl {
  id: string;
  reportId: string;
  completeness: number;
  missingFields: string[];
  suspiciousValues: string[];
  duplicateReport: boolean;
  createdAt: string;
}

export interface SoilAnalysisReport {
  id: string;
  parcelId: string;
  status: SoilLabStatus;
  sampleNumber: string | null;
  labName: string | null;
  labAccreditation: string | null;
  analysisDate: string | null;
  samplingDate: string | null;
  sampleDepth: string | null;
  sampleLocation: string | null;
  reportNumber: string | null;
  analyst: string | null;
  notes: string | null;
  version: number;
  reviewStatus: string | null;
  approvalStatus: string | null;
  createdAt: string;
  updatedAt: string;
  
  results?: SoilAnalysisResult[];
  qualityControl?: SoilQualityControl;
}
