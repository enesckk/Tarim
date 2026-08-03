import type { CalibrationProfile } from './calibration.types.js';
import { getSharedCalibrationRepository } from './calibration-profile.repository.js';
import type { SuitabilityClassification } from '../rules/scoring-thresholds.js';

export class ScoreCalibrationService {
  constructor(
    private readonly repository = getSharedCalibrationRepository(),
  ) {}

  getProfile(): CalibrationProfile {
    return this.repository.get();
  }

  classify(finalScore: number): {
    classification: SuitabilityClassification;
    label: string;
  } {
    const t = this.getProfile().classificationThresholds;
    const score = Math.min(100, Math.max(0, finalScore));
    if (score >= t.veryHigh) {
      return {
        classification: 'very_high',
        label: 'Mevcut verilere göre çok yüksek uygunluk sinyali',
      };
    }
    if (score >= t.high) {
      return {
        classification: 'high',
        label: 'Mevcut verilere göre yüksek uygunluk sinyali',
      };
    }
    if (score >= t.moderate) {
      return {
        classification: 'moderate',
        label: 'Mevcut verilere göre orta düzey uygunluk sinyali',
      };
    }
    if (score >= t.low) {
      return {
        classification: 'low',
        label: 'Mevcut verilere göre düşük uygunluk sinyali',
      };
    }
    return {
      classification: 'very_low',
      label: 'Mevcut verilere göre çok düşük uygunluk sinyali',
    };
  }

  penalty(severity: 'critical' | 'major' | 'moderate'): number {
    return this.getProfile().constraintPenalties[severity];
  }

  maxManagementImprovement(): number {
    return this.getProfile().scenarioLimits.maximumManagementImprovement;
  }

  getTerrainCalibration() {
    return this.getProfile().terrain;
  }
}
