import type { RecommendationInputSnapshot } from '../types/recommendation.types.js';
import type { CategoryBreakdown, ScoreFactor } from '../types/suitability.types.js';
import type { RiskLevel } from '../../environment/shared/types/provider-metadata.types.js';
import { SCORING_WEIGHTS } from '../rules/scoring-weights.js';
import { roundScore } from '../rules/range-scoring.js';
import { computeAverageValidPixelRatio } from './sentinel-suitability.service.js';

export class RecommendationConfidenceService {
  scoreReliability(snapshot: RecommendationInputSnapshot): CategoryBreakdown {
    const maxScore = SCORING_WEIGHTS.reliability.total;
    const factors: ScoreFactor[] = [];
    let points = 0;

    const sentinelConf = snapshot.analysis.interpretation.confidence;
    const sentinelPts = sentinelConf === 'high' ? 2.5 : sentinelConf === 'medium' ? 1.5 : 0.5;
    points += sentinelPts;
    factors.push({
      code: 'SENTINEL_CONFIDENCE',
      score: roundScore(sentinelPts),
      maxScore: 2.5,
      observed: sentinelConf,
      message: `Sentinel güven düzeyi: ${sentinelConf}.`,
    });

    const success = snapshot.timeSeries.summary.successfulAcquisitionCount;
    const tsPts = success >= 8 ? 2.5 : success >= 4 ? 1.5 : 0.5;
    points += tsPts;
    factors.push({
      code: 'TIME_SERIES_COVERAGE',
      score: roundScore(tsPts),
      maxScore: 2.5,
      observed: success,
      message: `Başarılı zaman serisi alım sayısı: ${success}.`,
    });

    const validRatio = computeAverageValidPixelRatio(snapshot.analysis, snapshot.timeSeries);
    const validPts =
      validRatio == null ? 0.5 : validRatio >= 0.6 ? 1.5 : validRatio >= 0.4 ? 1 : 0.4;
    points += validPts;
    factors.push({
      code: 'VALID_PIXEL_RATIO',
      score: roundScore(validPts),
      maxScore: 1.5,
      observed: validRatio,
      message:
        validRatio == null
          ? 'Ortalama geçerli piksel oranı hesaplanamadı.'
          : `Ortalama geçerli piksel oranı: ${validRatio.toFixed(2)}.`,
    });

    const climateMock = snapshot.climate.metadata.isMock;
    const climateEstimated = snapshot.climate.metadata.isEstimated === true;
    const climatePts = climateMock
      ? 0.3
      : climateEstimated
        ? snapshot.climate.confidence === 'high'
          ? 1.2
          : snapshot.climate.confidence === 'medium'
            ? 0.9
            : 0.5
        : snapshot.climate.confidence === 'high'
          ? 1.5
          : snapshot.climate.confidence === 'medium'
            ? 1
            : 0.5;
    points += climatePts;
    factors.push({
      code: 'CLIMATE_DATA_RELIABILITY',
      score: roundScore(climatePts),
      maxScore: 1.5,
      observed: climateMock ? 'mock' : String(snapshot.climate.metadata.provider ?? snapshot.climate.provider),
      message: climateReliabilityMessage(snapshot),
    });

    const soilMock = snapshot.soil.metadata.isMock;
    const soilEstimated = snapshot.soil.metadata.isEstimated === true;
    const soilPts = soilMock
      ? 0.3
      : soilEstimated
        ? snapshot.soil.confidence === 'high'
          ? 1.4
          : snapshot.soil.confidence === 'medium'
            ? 1
            : 0.6
        : snapshot.soil.confidence === 'high'
          ? 2
          : snapshot.soil.confidence === 'medium'
            ? 1.2
            : 0.5;
    points += soilPts;
    factors.push({
      code: 'SOIL_DATA_RELIABILITY',
      score: roundScore(soilPts),
      maxScore: 2,
      observed: soilMock ? 'mock' : String(snapshot.soil.metadata.provider ?? snapshot.soil.provider),
      message: soilReliabilityMessage(snapshot),
    });

    return {
      score: roundScore(Math.min(maxScore, points)),
      maxScore,
      factors,
    };
  }

  /**
   * Recommendation confidence is separate from crop score.
   * Mock → low.
   * Grid-estimated (NASA POWER / SoilGrids) + strong Sentinel → at most medium.
   * High reserved for station climate + lab soil (non-estimated) + strong Sentinel.
   */
  resolveRecommendationConfidence(snapshot: RecommendationInputSnapshot): RiskLevel {
    const usesMock =
      snapshot.climate.metadata.isMock || snapshot.soil.metadata.isMock;
    if (usesMock) {
      return 'low';
    }

    const success = snapshot.timeSeries.summary.successfulAcquisitionCount;
    const sentinelHigh = snapshot.analysis.interpretation.confidence === 'high';
    const climateEstimated = snapshot.climate.metadata.isEstimated !== false;
    const soilEstimated = snapshot.soil.metadata.isEstimated !== false;
    const climateOk = snapshot.climate.confidence !== 'low';
    const soilOk = snapshot.soil.confidence !== 'low';

    if (climateEstimated || soilEstimated) {
      if (sentinelHigh && success >= 8 && climateOk && soilOk) {
        return 'medium';
      }
      if (success >= 3) {
        return 'medium';
      }
      return 'low';
    }

    if (sentinelHigh && success >= 8 && climateOk && soilOk) {
      return 'high';
    }
    if (success >= 3 && (climateOk || soilOk)) {
      return 'medium';
    }
    return 'low';
  }
}

function climateReliabilityMessage(snapshot: RecommendationInputSnapshot): string {
  if (snapshot.climate.metadata.isMock) {
    return 'İklim verisi temsili (mock) kaynaktan gelmektedir.';
  }
  const provider = String(snapshot.climate.metadata.provider ?? snapshot.climate.provider);
  if (provider === 'nasa-power') {
    return 'İklim profili uzun dönemli grid tabanlı meteorolojik veriden üretilmiştir.';
  }
  return `İklim veri güveni: ${snapshot.climate.confidence}.`;
}

function soilReliabilityMessage(snapshot: RecommendationInputSnapshot): string {
  if (snapshot.soil.metadata.isMock) {
    return 'Toprak verisi temsili (mock) kaynaktan gelmektedir; laboratuvar analizi değildir.';
  }
  const provider = String(snapshot.soil.metadata.provider ?? snapshot.soil.provider);
  if (provider === 'soilgrids') {
    return 'Toprak profili 250 metre çözünürlüklü tahmini toprak katmanlarından üretilmiştir.';
  }
  return `Toprak veri güveni: ${snapshot.soil.confidence}.`;
}
