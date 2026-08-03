import type {
  ComponentSuitabilityResult,
  OverallSuitabilityResult,
} from '../types/seasonal-crop-analysis.types.js';

/**
 * Combines barrier outcomes with component suitability into a single overall
 * result. A crop is only `eligibleForRanking` when there is no blocking
 * barrier AND a numeric score exists from a verified/calibrated scoring
 * source. Otherwise it is reported as blocked or preliminary — never given a
 * fabricated numeric rank.
 */
export class SeasonalOverallSuitabilityService {
  build(input: {
    hasBlockingBarrier: boolean;
    blockingBarrierCodes: string[];
    componentSuitability: ComponentSuitabilityResult[];
  }): OverallSuitabilityResult {
    if (input.hasBlockingBarrier) {
      return {
        eligibleForRanking: false,
        score: null,
        classification: 'blocked_by_barrier',
        blockingBarrierCodes: input.blockingBarrierCodes,
      };
    }

    const engineComponent = input.componentSuitability.find(
      (c) => c.component === 'overall_recommendation_engine',
    );

    if (engineComponent && typeof engineComponent.score === 'number') {
      return {
        eligibleForRanking: true,
        score: engineComponent.score,
        classification: 'eligible',
        blockingBarrierCodes: [],
      };
    }

    return {
      eligibleForRanking: false,
      score: null,
      classification: 'preliminary_only',
      blockingBarrierCodes: [],
    };
  }
}
