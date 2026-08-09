import type { 
  CropSuitabilityResult 
} from '../../physical-suitability/types/decision-engine.types.js';

export interface RankedCropResult extends CropSuitabilityResult {
  rank: number;
  explainabilitySummary: string; // The natural language explanation
}

export interface SeasonalCropRankingResponse {
  parcelId: string;
  totalSeasonalCropsEvaluated: number;
  results: RankedCropResult[];
}
