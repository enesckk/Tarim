import type { SurfaceCalibration } from './surface-calibration.js';
import type {
  AgriculturalCycleSignal,
  ContinuousBareSurfaceResult,
  ProbableRockOrShallowSoilResult,
  SeasonalVegetationResult,
  SuccessfulObservation,
  SurfacePersistenceResult,
} from './surface-analysis.types.js';
import { share } from './observation.utils.js';

/**
 * Informational risk signal only — never a rock percentage or soil depth estimate.
 * Terrain is intentionally not an input (mock DEM must not shift this score).
 */
export class ProbableRockSignalService {
  analyze(input: {
    observations: SuccessfulObservation[];
    persistence: SurfacePersistenceResult;
    seasonal: SeasonalVegetationResult;
    bare: ContinuousBareSurfaceResult;
    calibration: SurfaceCalibration;
    agriculturalCycleSignal?: AgriculturalCycleSignal;
  }): ProbableRockOrShallowSoilResult {
    const {
      observations,
      persistence,
      seasonal,
      bare,
      calibration,
      agriculturalCycleSignal,
    } = input;
    const disclaimer =
      'Bu çıktı kesin kaya yüzdesi, jeoloji sınıfı veya gerçek toprak derinliği değildir; yalnızca uzaktan algılama tabanlı bilgilendirici bir risk sinyalidir.';

    if (observations.length === 0) {
      return {
        riskLevel: 'unknown',
        informationalScore: 0,
        evidence: [
          {
            code: 'INSUFFICIENT_OBSERVATIONS',
            message: 'Muhtemel kayalık / sığ yüzey sinyali için gözlem yoktur.',
          },
        ],
        counterEvidence: [],
        disclaimer,
      };
    }

    const t = calibration.thresholds;
    const rock = calibration.probableRock;
    const evidence: ProbableRockOrShallowSoilResult['evidence'] = [];
    const counterEvidence: ProbableRockOrShallowSoilResult['evidence'] = [];

    const dryShare = share(observations, (o) => o.ndmiMean <= t.ndmiDryMax);
    const amplitude = seasonal.seasonalAmplitudeNdvi ?? 0;
    let score = 0;

    if (persistence.lowNdviShare >= rock.bareShareMin) {
      score += 25;
      evidence.push({
        code: 'PERSISTENT_LOW_NDVI',
        message: 'Düşük NDVI gözlem payı yüksektir.',
        value: persistence.lowNdviShare,
      });
    }
    if (persistence.highBsiShare >= rock.highBsiShareMin) {
      score += 25;
      evidence.push({
        code: 'PERSISTENT_HIGH_BSI',
        message: 'Yüksek BSI gözlem payı yüksektir.',
        value: persistence.highBsiShare,
      });
    }
    if (dryShare >= rock.lowNdmiShareMin) {
      score += 20;
      evidence.push({
        code: 'PERSISTENT_LOW_NDMI',
        message: 'Düşük nem (NDMI) sinyali sık görülmektedir.',
        value: dryShare,
      });
    }
    if (amplitude <= rock.weakCycleAmplitudeMax) {
      score += 15;
      evidence.push({
        code: 'WEAK_SEASONAL_CYCLE',
        message: 'Mevsimsel bitki döngüsü genliği zayıftır.',
        value: amplitude,
      });
    }

    // Post-harvest bare runs are common in annual cycles; do not treat as rock-like alone.
    const annualCycle =
      agriculturalCycleSignal === 'likely_annual_cycle' ||
      amplitude >= t.seasonalAmplitudeMin;
    if (
      !annualCycle &&
      (bare.signal === 'high' || bare.consecutiveBareHint)
    ) {
      score += 15;
      evidence.push({
        code: 'CONTINUOUS_BARE_HINT',
        message: 'Sürekli açık yüzey sinyali destekleyicidir.',
      });
    }

    if (amplitude >= t.seasonalAmplitudeMin) {
      score -= 25;
      counterEvidence.push({
        code: 'STRONG_SEASONAL_AMPLITUDE',
        message: 'Belirgin mevsimsel NDVI genliği kayalık / sürekli çıplak yüzey aleyhine kanıttır.',
        value: amplitude,
      });
    }
    if (agriculturalCycleSignal === 'likely_annual_cycle') {
      score -= 15;
      counterEvidence.push({
        code: 'ANNUAL_AGRICULTURAL_CYCLE',
        message: 'Yıllık tarımsal döngü sinyali muhtemel kayalık skorunu düşürür.',
        value: 15,
      });
    }

    score = Math.max(0, Math.min(100, score));
    let riskLevel: ProbableRockOrShallowSoilResult['riskLevel'] = 'low';
    if (score >= rock.highScoreMin) riskLevel = 'high';
    else if (score >= rock.mediumScoreMin) riskLevel = 'medium';

    if (evidence.length === 0) {
      evidence.push({
        code: 'NO_STRONG_ROCK_LIKE_SIGNAL',
        message: 'Kayalık / çok sığ yüzey benzeri güçlü bir birleşik sinyal oluşmamıştır.',
      });
    }

    return {
      riskLevel,
      informationalScore: score,
      evidence,
      counterEvidence,
      disclaimer,
    };
  }
}
