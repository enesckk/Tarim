import type { SurfaceCalibration } from './surface-calibration.js';
import type {
  SignalLevel,
  SuccessfulObservation,
  SurfacePersistenceResult,
} from './surface-analysis.types.js';
import { levelFromShare, share } from './observation.utils.js';

export class SurfacePersistenceService {
  analyze(
    observations: SuccessfulObservation[],
    calibration: SurfaceCalibration,
  ): SurfacePersistenceResult {
    if (observations.length === 0) {
      return {
        persistentVegetationSignal: 'unknown',
        persistentBareSurfaceSignal: 'unknown',
        lowNdviShare: 0,
        highBsiShare: 0,
        vegetatedShare: 0,
        crossSeasonBareConsistency: 0,
        messages: ['Yüzey sürekliliği için yeterli gözlem yoktur.'],
      };
    }

    const t = calibration.thresholds;
    const lowNdviShare = share(observations, (o) => o.ndviMean < t.ndviBareMax);
    const highBsiShare = share(observations, (o) => o.bsiMean >= t.bsiBareMin);
    const vegetatedShare = share(
      observations,
      (o) => o.ndviMean >= t.ndviVegetatedMin,
    );

    const seasons = new Set(observations.map((o) => o.season));
    let bareSeasonCount = 0;
    for (const season of seasons) {
      const subset = observations.filter((o) => o.season === season);
      const bareShare = share(subset, (o) => o.ndviMean < t.ndviBareMax);
      if (bareShare >= 0.5) {
        bareSeasonCount += 1;
      }
    }
    const crossSeasonBareConsistency =
      seasons.size === 0 ? 0 : bareSeasonCount / seasons.size;

    const persistentBareSurfaceSignal = combineSignals(
      levelFromShare(lowNdviShare),
      levelFromShare(highBsiShare),
      levelFromShare(crossSeasonBareConsistency, 0.4, 0.7),
    );
    const persistentVegetationSignal = levelFromShare(vegetatedShare, 0.3, 0.55);

    const messages: string[] = [];
    if (persistentBareSurfaceSignal === 'high') {
      messages.push(
        'Gözlem döneminde düşük NDVI ve yüksek BSI sinyali sık tekrar etmektedir.',
      );
    }
    if (persistentVegetationSignal === 'high') {
      messages.push(
        'Gözlem döneminde bitki aktivitesi sinyali birden fazla dönemde süreklilik göstermektedir.',
      );
    }
    if (messages.length === 0) {
      messages.push(
        'Yüzey sürekliliği sinyali orta veya düşük düzeydedir; tek başına arazi kararı için yeterli değildir.',
      );
    }

    return {
      persistentVegetationSignal,
      persistentBareSurfaceSignal,
      lowNdviShare,
      highBsiShare,
      vegetatedShare,
      crossSeasonBareConsistency: Math.round(crossSeasonBareConsistency * 1000) / 1000,
      messages,
    };
  }
}

function combineSignals(
  a: SignalLevel,
  b: SignalLevel,
  c: SignalLevel,
): SignalLevel {
  const rank = { unknown: 0, low: 1, medium: 2, high: 3 } as const;
  const values = [a, b, c].filter((v): v is Exclude<SignalLevel, 'unknown'> => v !== 'unknown');
  if (values.length === 0) return 'unknown';
  const avg = values.reduce((sum, v) => sum + rank[v], 0) / values.length;
  if (avg >= 2.5) return 'high';
  if (avg >= 1.5) return 'medium';
  return 'low';
}
