import type { SurfaceCalibration } from './surface-calibration.js';
import type {
  ContinuousBareSurfaceResult,
  SuccessfulObservation,
  SurfacePersistenceResult,
} from './surface-analysis.types.js';
import { levelFromShare, share } from './observation.utils.js';

export class ContinuousBareSurfaceService {
  analyze(
    observations: SuccessfulObservation[],
    persistence: SurfacePersistenceResult,
    calibration: SurfaceCalibration,
  ): ContinuousBareSurfaceResult {
    if (observations.length === 0) {
      return {
        signal: 'unknown',
        bareObservationShare: 0,
        consecutiveBareHint: false,
        messages: ['Sürekli açık yüzey sinyali için gözlem yoktur.'],
      };
    }

    const t = calibration.thresholds;
    const bareObservationShare = share(
      observations,
      (o) => o.ndviMean < t.ndviBareMax && o.bsiMean >= t.bsiBareMin * 0.8,
    );

    let maxRun = 0;
    let run = 0;
    for (const obs of observations) {
      const bare = obs.ndviMean < t.ndviBareMax;
      if (bare) {
        run += 1;
        maxRun = Math.max(maxRun, run);
      } else {
        run = 0;
      }
    }
    const consecutiveBareHint = maxRun >= 3;

    const signal = levelFromShare(
      Math.max(bareObservationShare, persistence.lowNdviShare * 0.8),
      0.35,
      0.6,
    );

    const messages: string[] = [];
    if (signal === 'high') {
      messages.push(
        'Açık yüzey sinyali gözlem döneminde sık ve tekrarlı biçimde görülmektedir.',
      );
    } else if (signal === 'medium') {
      messages.push('Açık yüzey sinyali kısmi süreklilik göstermektedir.');
    } else {
      messages.push('Sürekli açık yüzey sinyali zayıftır veya sınırlıdır.');
    }
    if (consecutiveBareHint) {
      messages.push(
        'Ardışık düşük NDVI gözlemleri açık yüzey sürekliliğine işaret edebilir.',
      );
    }

    return {
      signal,
      bareObservationShare,
      consecutiveBareHint,
      messages,
    };
  }
}
