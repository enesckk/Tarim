import type { 
  CropSuitabilityResult 
} from '../../physical-suitability/types/decision-engine.types.js';

export interface RankedPerennialCropResult extends CropSuitabilityResult {
  rank: number;
  explainabilitySummary: string;
}

export interface PerennialCropRankingResponse {
  parcelId: string;
  totalPerennialCropsEvaluated: number;
  results: RankedPerennialCropResult[];
}
