import type { SurfaceCalibration } from './surface-calibration.js';
import type {
  SeasonName,
  SeasonVegetationStats,
  SeasonalVegetationResult,
  SuccessfulObservation,
} from './surface-analysis.types.js';
import { meanOf, share } from './observation.utils.js';

const SEASONS: SeasonName[] = ['winter', 'spring', 'summer', 'autumn'];

export class SeasonalVegetationService {
  analyze(
    observations: SuccessfulObservation[],
    calibration: SurfaceCalibration,
  ): SeasonalVegetationResult {
    const bySeason = {} as Record<SeasonName, SeasonVegetationStats>;
    const t = calibration.thresholds;

    for (const season of SEASONS) {
      const subset = observations.filter((o) => o.season === season);
      bySeason[season] = {
        observationCount: subset.length,
        ndviMean: meanOf(subset.map((o) => o.ndviMean)),
        ndmiMean: meanOf(subset.map((o) => o.ndmiMean)),
        bsiMean: meanOf(subset.map((o) => o.bsiMean)),
        lowNdviShare:
          subset.length === 0
            ? null
            : share(subset, (o) => o.ndviMean < t.ndviBareMax),
        highBsiShare:
          subset.length === 0
            ? null
            : share(subset, (o) => o.bsiMean >= t.bsiBareMin),
      };
    }

    const seasonMeans = SEASONS.map((season) => ({
      season,
      mean: bySeason[season].ndviMean,
      count: bySeason[season].observationCount,
    })).filter((row) => row.mean != null && row.count > 0) as Array<{
      season: SeasonName;
      mean: number;
      count: number;
    }>;

    let peakSeason: SeasonName | 'unknown' = 'unknown';
    if (seasonMeans.length > 0) {
      peakSeason = seasonMeans.reduce((best, row) =>
        row.mean > best.mean ? row : best,
      ).season;
    }

    const means = seasonMeans.map((row) => row.mean);
    const seasonalAmplitudeNdvi =
      means.length >= 2 ? Math.max(...means) - Math.min(...means) : null;

    let activityLevel: SeasonalVegetationResult['activityLevel'] = 'unknown';
    if (seasonMeans.length > 0) {
      const peak = Math.max(...means);
      if (peak >= t.ndviVegetatedMin + 0.1) activityLevel = 'high';
      else if (peak >= t.ndviVegetatedMin) activityLevel = 'medium';
      else activityLevel = 'low';
    }

    const messages: string[] = [];
    if (peakSeason !== 'unknown') {
      messages.push(`En yüksek ortalama NDVI sinyali ${peakSeason} döneminde gözlenmiştir.`);
    }
    if (seasonalAmplitudeNdvi != null && seasonalAmplitudeNdvi >= t.seasonalAmplitudeMin) {
      messages.push('Mevsimler arasında belirgin NDVI genliği vardır.');
    } else if (seasonalAmplitudeNdvi != null) {
      messages.push('Mevsimsel NDVI genliği sınırlıdır.');
    } else {
      messages.push('Mevsimsel bitki aktivitesi için yeterli dönem kapsamı yoktur.');
    }

    return {
      bySeason,
      peakSeason,
      activityLevel,
      seasonalAmplitudeNdvi:
        seasonalAmplitudeNdvi == null
          ? null
          : Math.round(seasonalAmplitudeNdvi * 10000) / 10000,
      messages,
    };
  }
}
