import type { RankedCropResult } from '../../seasonal-crop-ranking/types/ranking.types.js';
import type { RankedPerennialCropResult } from '../../perennial-crop-ranking/types/ranking.types.js';

export interface ReportExecutiveSummary {
  overallStatus: string;
  totalCropsEvaluated: number;
  recommendedSeasonalCrops: number;
  recommendedPerennialCrops: number;
  overallConfidence: string;
  criticalMissingData: number;
  limitations: string[];
}

export interface ParcelInfo {
  parcelId: string;
  province?: string;
  district?: string;
  neighborhood?: string;
  block?: string;
  parcel?: string;
  areaSqm?: number;
  coordinates?: any;
  analysisDate: string;
}

export interface DataSourceTrace {
  sourceName: string;
  status: 'Active' | 'Inactive' | 'Missing';
  version: string;
  retrievedAt: string;
  confidence: string;
}

export interface EnvironmentSection {
  usedSources: string[];
  missingParameters: string[];
  limitations: string[];
  confidence: string;
  summary: string;
}

export interface MissingDataSummary {
  missingSources: string[];
  missingParameters: string[];
  confidenceImpact: string;
}

export interface FinalAnalysisReport {
  reportVersion: string;
  reportId: string;
  parcelId: string;
  generatedAt: string;
  generatedBy: string;
  analysisVersion: string;

  executiveSummary: ReportExecutiveSummary;
  parcelInfo: ParcelInfo;
  dataSources: DataSourceTrace[];
  
  climateAnalysis: EnvironmentSection;
  soilAnalysis: EnvironmentSection;
  waterAnalysis: EnvironmentSection;
  terrainAnalysis: EnvironmentSection;

  seasonalRanking: RankedCropResult[];
  perennialRanking: RankedPerennialCropResult[];

  criticalConstraints: string[];
  majorConstraints: string[];
  warnings: string[];
  
  missingData: MissingDataSummary;
}
