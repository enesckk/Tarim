import type { CropKnowledge } from '../types/crop.types.js';
import type { AnalysisSummaryResponse } from '../../../services/agricultural-analysis.service.js';
import type { TimeSeriesResponse } from '../../../services/time-series.service.js';
import type { CategoryBreakdown, ScoreFactor } from '../types/suitability.types.js';
import { SCORING_WEIGHTS } from '../rules/scoring-weights.js';
import { roundScore } from '../rules/range-scoring.js';

export class SentinelSuitabilityService {
  score(
    crop: CropKnowledge,
    analysis: AnalysisSummaryResponse,
    timeSeries: TimeSeriesResponse,
  ): CategoryBreakdown {
    const w = SCORING_WEIGHTS.sentinel;
    const factors: ScoreFactor[] = [];

    const validRatio = computeAverageValidPixelRatio(analysis, timeSeries);
    const qualityRatio = acquisitionQualityRatio(
      analysis.interpretation.confidence,
      validRatio,
      analysis.product.cloudCoverage,
    );
    factors.push({
      code: 'ACQUISITION_QUALITY',
      score: roundScore(qualityRatio * w.acquisitionQuality),
      maxScore: w.acquisitionQuality,
      observed: validRatio,
      message: qualityMessage(qualityRatio, validRatio),
    });

    const ndviMean = analysis.indices.ndvi.mean;
    const vegetationRatio = vegetationActivityRatio(crop, ndviMean, timeSeries.trends.ndvi.direction);
    factors.push({
      code: 'VEGETATION_ACTIVITY',
      score: roundScore(vegetationRatio * w.vegetationActivity),
      maxScore: w.vegetationActivity,
      observed: ndviMean,
      message: vegetationMessage(crop, ndviMean, timeSeries.trends.ndvi.direction),
    });

    const ndmiMean = analysis.indices.ndmi.mean;
    const moistureRatio = moistureSignalRatio(ndmiMean, timeSeries.trends.ndmi.direction);
    factors.push({
      code: 'MOISTURE_SIGNAL',
      score: roundScore(moistureRatio * w.moistureSignal),
      maxScore: w.moistureSignal,
      observed: ndmiMean,
      message: moistureMessage(ndmiMean, timeSeries.trends.ndmi.direction),
    });

    const temporalRatio = temporalConsistencyRatio(timeSeries);
    factors.push({
      code: 'TEMPORAL_CONSISTENCY',
      score: roundScore(temporalRatio * w.temporalConsistency),
      maxScore: w.temporalConsistency,
      observed: timeSeries.summary.successfulAcquisitionCount,
      message: temporalMessage(timeSeries),
    });

    const bsiMean = analysis.indices.bsi.mean;
    const bareRatio = bareSoilInterpretationRatio(
      crop,
      bsiMean,
      timeSeries.trends.bsi.direction,
    );
    factors.push({
      code: 'BARE_SOIL_INTERPRETATION',
      score: roundScore(bareRatio * w.bareSoilInterpretation),
      maxScore: w.bareSoilInterpretation,
      observed: bsiMean,
      message: bareSoilMessage(crop, bsiMean, timeSeries.trends.bsi.direction),
    });

    const score = roundScore(factors.reduce((sum, factor) => sum + factor.score, 0));
    return { score, maxScore: w.total, factors };
  }
}

export function computeAverageValidPixelRatio(
  analysis: AnalysisSummaryResponse,
  timeSeries: TimeSeriesResponse,
): number | null {
  const seriesRatios = timeSeries.series
    .filter((point) => point.status === 'success' && point.validPixelRatio != null)
    .map((point) => point.validPixelRatio as number);

  if (seriesRatios.length === 0) {
    const ndvi = analysis.indices.ndvi;
    if (ndvi.totalPixelCount <= 0) {
      return null;
    }
    return ndvi.validPixelCount / ndvi.totalPixelCount;
  }

  return seriesRatios.reduce((a, b) => a + b, 0) / seriesRatios.length;
}

function acquisitionQualityRatio(
  confidence: string,
  validRatio: number | null,
  cloudCoverage: number | null,
): number {
  let ratio = confidence === 'high' ? 1 : confidence === 'medium' ? 0.7 : 0.4;
  if (validRatio != null) {
    if (validRatio < 0.3) {
      ratio *= 0.45;
    } else if (validRatio < 0.5) {
      ratio *= 0.7;
    }
  }
  if (cloudCoverage != null && cloudCoverage > 30) {
    ratio *= 0.75;
  }
  return Math.min(1, ratio);
}

/**
 * Annual crops: low NDVI is not heavily penalized (fallow/post-harvest possible).
 * Perennials needing persistent vegetation: low NDVI reduces score more.
 */
export function vegetationActivityRatio(
  crop: CropKnowledge,
  ndviMean: number,
  trend: string,
): number {
  const requiresPersistent =
    crop.remoteSensing.seasonalInterpretation.requiresPersistentVegetation ||
    crop.growingType === 'perennial';

  if (requiresPersistent) {
    if (ndviMean >= 0.45) {
      return trend === 'decreasing' ? 0.75 : 1;
    }
    if (ndviMean >= 0.3) {
      return 0.55;
    }
    return 0.25;
  }

  // annual / non-persistent
  if (ndviMean >= 0.45) {
    return 0.9;
  }
  if (ndviMean >= 0.25) {
    return 0.8;
  }
  // low NDVI acceptable for annual off-season
  return trend === 'decreasing' ? 0.7 : 0.75;
}

function moistureSignalRatio(ndmiMean: number, trend: string): number {
  if (ndmiMean >= 0.1) {
    return 1;
  }
  if (ndmiMean >= 0) {
    return 0.75;
  }
  if (ndmiMean >= -0.1) {
    return trend === 'decreasing' ? 0.45 : 0.55;
  }
  return 0.35;
}

function temporalConsistencyRatio(timeSeries: TimeSeriesResponse): number {
  const success = timeSeries.summary.successfulAcquisitionCount;
  const selected = timeSeries.summary.selectedAcquisitionCount;
  if (selected <= 0) {
    return 0.2;
  }
  const successRate = success / selected;
  let ratio = successRate;
  if (success >= 8) {
    ratio = Math.min(1, ratio + 0.1);
  } else if (success < 3) {
    ratio *= 0.5;
  }
  return Math.min(1, Math.max(0.15, ratio));
}

function bareSoilInterpretationRatio(
  crop: CropKnowledge,
  bsiMean: number,
  trend: string,
): number {
  const bareOk = crop.remoteSensing.seasonalInterpretation.bareSoilBeforePlantingAcceptable;
  if (bareOk) {
    if (bsiMean <= 0.25) {
      return 1;
    }
    // higher BSI may be pre-planting / tillage
    return trend === 'increasing' ? 0.85 : 0.75;
  }
  if (bsiMean <= 0.15) {
    return 1;
  }
  if (bsiMean <= 0.25) {
    return 0.55;
  }
  return 0.3;
}

function qualityMessage(ratio: number, validRatio: number | null): string {
  if (validRatio != null && validRatio < 0.5) {
    return `Geçerli piksel oranı (${validRatio.toFixed(2)}) veri kalitesini sınırlandırmaktadır.`;
  }
  if (ratio >= 0.8) {
    return 'Uydu alım kalitesi ön değerlendirme için yeterlidir.';
  }
  return 'Uydu alım kalitesinde belirsizlik vardır; yorumlar ihtiyatlı yapılmalıdır.';
}

function vegetationMessage(crop: CropKnowledge, ndvi: number, trend: string): string {
  const annual = crop.growingType === 'annual';
  if (annual && ndvi < 0.35) {
    return 'Parselde yakın dönemde aktif bitki örtüsü sinyali sınırlıdır; bu durum sezon dışı veya hasat sonrası dönemle ilişkili olabilir.';
  }
  if (!annual && ndvi < 0.35) {
    return 'Çok yıllık ürün açısından süreğen bitki örtüsü sinyali sınırlı görünmektedir.';
  }
  if (trend === 'decreasing') {
    return 'Altı aylık seride bitki örtüsü sinyali azalmaktadır.';
  }
  if (trend === 'increasing') {
    return 'Altı aylık seride bitki örtüsü sinyali artış eğilimindedir.';
  }
  return 'Bitki örtüsü sinyali mevcut yüzey durumu hakkında bağlam sağlar.';
}

function moistureMessage(ndmi: number, trend: string): string {
  if (ndmi < 0 || trend === 'decreasing') {
    return 'Nem sinyali sulama ihtiyacı açısından saha kontrolü gerektirebilir.';
  }
  return 'Nem sinyali mevcut yüzey nem durumu hakkında bağlam sağlar.';
}

function temporalMessage(timeSeries: TimeSeriesResponse): string {
  const n = timeSeries.summary.successfulAcquisitionCount;
  if (n >= 8) {
    return `${n} başarılı zaman serisi alımı zamansal tutarlılık için yeterli bağlam sağlar.`;
  }
  if (n >= 3) {
    return `${n} başarılı zaman serisi alımı sınırlı zamansal bağlam sağlar.`;
  }
  return 'Zaman serisi alım sayısı düşüktür; zamansal yorum belirsizdir.';
}

function bareSoilMessage(crop: CropKnowledge, bsi: number, trend: string): string {
  if (
    crop.remoteSensing.seasonalInterpretation.bareSoilBeforePlantingAcceptable &&
    (bsi > 0.15 || trend === 'increasing')
  ) {
    return 'Çıplak toprak sinyalindeki artış hasat, sürüm veya ekim öncesi durumla ilişkili olabilir.';
  }
  if (bsi > 0.2) {
    return 'Çıplak toprak sinyali yüksektir; yüzey örtüsü sınırlı görünmektedir.';
  }
  return 'Çıplak toprak sinyali mevcut yüzey durumu bağlamında değerlendirilmiştir.';
}
