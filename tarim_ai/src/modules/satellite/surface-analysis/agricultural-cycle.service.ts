import type { ConfidenceLevel } from '../../../utils/trend.utils.js';
import type { SurfaceCalibration } from './surface-calibration.js';
import type {
  AgriculturalCycleResult,
  SeasonName,
  SeasonalVegetationResult,
  SurfacePersistenceResult,
  SuccessfulObservation,
} from './surface-analysis.types.js';
import { share } from './observation.utils.js';

const SEASONS: SeasonName[] = ['winter', 'spring', 'summer', 'autumn'];

export class AgriculturalCycleService {
  analyze(input: {
    observations: SuccessfulObservation[];
    seasonal: SeasonalVegetationResult;
    persistence: SurfacePersistenceResult;
    calibration: SurfaceCalibration;
    dataConfidence: ConfidenceLevel;
  }): AgriculturalCycleResult {
    const { observations, seasonal, persistence, calibration, dataConfidence } = input;
    const evidence: AgriculturalCycleResult['evidence'] = [];
    const messages: string[] = [];

    if (observations.length < calibration.minimumSuccessfulAcquisitions.lowConfidence) {
      return {
        signal: 'insufficient_data',
        confidence: 'low',
        evidence: [
          {
            code: 'INSUFFICIENT_OBSERVATIONS',
            message: 'Tarımsal döngü sinyali için gözlem sayısı yetersizdir.',
            value: observations.length,
          },
        ],
        messages: ['Tarımsal üretim döngüsü sinyali üretilemedi.'],
      };
    }

    const amplitude = seasonal.seasonalAmplitudeNdvi ?? 0;
    const vegetatedShare = persistence.vegetatedShare;
    const bareShare = persistence.lowNdviShare;
    const t = calibration.thresholds;

    const seasonMeans = SEASONS.map((season) => ({
      season,
      mean: seasonal.bySeason[season].ndviMean,
      count: seasonal.bySeason[season].observationCount,
    })).filter(
      (row): row is { season: SeasonName; mean: number; count: number } =>
        row.mean != null && row.count > 0,
    );

    const trough =
      seasonMeans.length > 0
        ? seasonMeans.reduce((best, row) => (row.mean < best.mean ? row : best))
        : null;
    const peak =
      seasonal.peakSeason !== 'unknown'
        ? (seasonMeans.find((row) => row.season === seasonal.peakSeason) ?? null)
        : null;

    // Peak–trough difference is phenology-agnostic (covers winter cereals and summer crops).
    const peakTroughDiff =
      peak != null && trough != null ? peak.mean - trough.mean : null;

    if (amplitude >= t.seasonalAmplitudeMin && peakTroughDiff != null) {
      evidence.push({
        code: 'SEASONAL_NDVI_AMPLITUDE',
        message:
          'Mevsimsel NDVI tepe–dip farkı belirgindir (sabit yaz büyüme / kış dinlenme varsayımı kullanılmaz).',
        value: amplitude,
      });
    }

    let signal: AgriculturalCycleResult['signal'] = 'mixed';

    const hasClearSeasonalCycle =
      amplitude >= t.seasonalAmplitudeMin &&
      seasonal.peakSeason !== 'unknown' &&
      trough != null &&
      trough.mean < t.ndviVegetatedMin &&
      peakTroughDiff != null &&
      peakTroughDiff >= t.seasonalAmplitudeMin * 0.8;

    if (hasClearSeasonalCycle) {
      signal = 'likely_annual_cycle';
      messages.push(
        'Mevsimsel yeşerme / gerileme örüntüsü yıllık tarımsal döngü ile uyumlu görünebilir.',
      );
    } else if (
      vegetatedShare >= 0.55 &&
      amplitude < t.seasonalAmplitudeMin &&
      persistence.persistentVegetationSignal !== 'low'
    ) {
      signal = 'likely_perennial';
      messages.push(
        'Bitki aktivitesi birden fazla mevsimde süreklilik göstermektedir; çok yıllık örtü sinyali olabilir.',
      );
    } else if (
      bareShare >= 0.55 &&
      persistence.persistentBareSurfaceSignal !== 'low' &&
      share(observations, (o) => o.bsiMean >= t.bsiBareMin) >= 0.45
    ) {
      signal = 'likely_fallow_or_bare';
      messages.push(
        'Düşük bitki aktivitesi ve yüksek çıplak yüzey sinyali nadas / açık yüzey ile uyumlu görünebilir.',
      );
    } else {
      signal = 'mixed';
      messages.push('Tarımsal döngü sinyali karışıktır; ek doğrulama gerekir.');
    }

    const confidence: ConfidenceLevel =
      dataConfidence === 'high' && seasonal.peakSeason !== 'unknown'
        ? 'medium'
        : dataConfidence === 'low'
          ? 'low'
          : 'medium';

    return { signal, confidence, evidence, messages };
  }
}
