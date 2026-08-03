import type { CropAnalysisResult, ConfidenceLevel } from '../types/seasonal-crop-analysis.types.js';

const CONFIDENCE_WEIGHT: Record<ConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Deterministic ranking: only crops eligible for ranking receive a rank.
 * Sort order: score desc, confidence desc, cropCode asc (stable tiebreak).
 */
export class SeasonalRankingService {
  rank(crops: CropAnalysisResult[]): CropAnalysisResult[] {
    const eligible = crops.filter((c) => c.overall.eligibleForRanking && c.overall.score != null);
    const ineligible = crops.filter((c) => !(c.overall.eligibleForRanking && c.overall.score != null));

    eligible.sort((a, b) => {
      const scoreDiff = (b.overall.score ?? 0) - (a.overall.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      const confDiff = CONFIDENCE_WEIGHT[b.confidence.level] - CONFIDENCE_WEIGHT[a.confidence.level];
      if (confDiff !== 0) return confDiff;
      return a.requestedCropCode.localeCompare(b.requestedCropCode);
    });

    eligible.forEach((crop, index) => {
      crop.rank = index + 1;
    });
    for (const crop of ineligible) {
      crop.rank = null;
    }

    return [...eligible, ...ineligible];
  }
}
