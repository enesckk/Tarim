import type { CropRecommendationResponse } from '../../crop-recommendation/types/recommendation.types.js';
import type {
  ComponentSuitabilityClassification,
  ComponentSuitabilityResult,
} from '../types/seasonal-crop-analysis.types.js';

function bucketClassification(
  classification: string | undefined,
): ComponentSuitabilityClassification {
  switch (classification) {
    case 'very_high':
    case 'high':
      return 'suitable';
    case 'moderate':
      return 'moderately_suitable';
    case 'low':
      return 'marginally_suitable';
    case 'very_low':
      return 'unsuitable';
    default:
      return 'preliminary';
  }
}

export interface CropRecommendationLookup {
  score: number;
  classification: string;
  riskCodes: string[];
}

/** Builds a { cropId -> item } lookup from a single evaluate() response, covering both ranked and not-recommended crops. */
export function buildCropRecommendationLookup(
  response: CropRecommendationResponse | null,
): Map<string, CropRecommendationLookup> {
  const map = new Map<string, CropRecommendationLookup>();
  if (!response) return map;
  for (const item of response.recommendations) {
    map.set(item.crop.id, {
      score: item.score.final,
      classification: item.score.classification,
      riskCodes: item.risks.map((r) => r.code),
    });
  }
  for (const item of response.notRecommended) {
    if (map.has(item.cropId)) continue;
    map.set(item.cropId, {
      score: item.score,
      classification: 'very_low',
      riskCodes: item.primaryConstraints,
    });
  }
  return map;
}

/**
 * Component suitability is only ever derived from an approved scoring source
 * (the crop-recommendation engine's calibrated model). When that source has
 * no knowledge of a crop, or the engine could not be reached, the score is
 * left null — never invented — and the crop is marked insufficient_data.
 */
export class SeasonalComponentSuitabilityService {
  build(
    catalogCropCode: string,
    lookup: Map<string, CropRecommendationLookup>,
  ): ComponentSuitabilityResult[] {
    const match = lookup.get(catalogCropCode);
    if (!match) {
      return [
        {
          component: 'overall_recommendation_engine',
          score: null,
          classification: 'insufficient_data',
          limitations: ['approved_scoring_rules_missing'],
        },
      ];
    }
    return [
      {
        component: 'overall_recommendation_engine',
        score: match.score,
        classification: bucketClassification(match.classification),
        limitations: match.riskCodes,
      },
    ];
  }
}
