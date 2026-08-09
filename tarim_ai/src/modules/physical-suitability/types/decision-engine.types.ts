export type SuitabilityClass =
  | 'Highly Suitable'
  | 'Suitable'
  | 'Moderately Suitable'
  | 'Marginal'
  | 'Unsuitable'
  | 'Data Insufficient';

export type ConfidenceLevel = 'Very High' | 'High' | 'Medium' | 'Low' | 'Very Low';

export type AnalysisStatus =
  | 'Completed'
  | 'Completed With Missing Data'
  | 'Completed With Limitations'
  | 'Partial'
  | 'Failed';

export interface ExplainabilityRecord {
  category: string;
  criterion: string;
  source: string;
  rule: string;
  result: string;
  explanation: string;
}

export interface SourceSummary {
  laboratoryCount: number;
  modelCount: number;
  expertCount: number;
  missingCount: number;
}

export interface CropSuitabilityResult {
  cropId: string;
  cropName: string;
  cropCode: string;
  suitability: SuitabilityClass;
  confidence: ConfidenceLevel;
  missingData: string[];
  limitations: string[];
  criticalConstraints: string[];
  warnings: string[];
  explainability: ExplainabilityRecord[];
  sourceSummary: SourceSummary;
  analysisStatus: AnalysisStatus;
}

export interface PhysicalSuitabilityAnalysisResponse {
  parcelId: string;
  results: CropSuitabilityResult[];
  summary: {
    totalEvaluated: number;
    suitable: number;
    marginal: number;
    unsuitable: number;
    dataInsufficient: number;
  };
}
