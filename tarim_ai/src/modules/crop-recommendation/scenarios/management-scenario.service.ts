import type { SoilManagementOptions, ScenarioBlock } from './scenario.types.js';
import type { SuitabilityScoreResult } from '../types/suitability.types.js';
import { ScoreCalibrationService } from '../calibration/score-calibration.service.js';
import { roundScore, clampScore } from '../rules/range-scoring.js';

export class ManagementScenarioService {
  constructor(private readonly calibration = new ScoreCalibrationService()) {}

  /**
   * Estimates potential suitability under selected management improvements.
   * Does not mutate observed soil values; applies capped scenario uplift.
   */
  estimatePotential(
    current: SuitabilityScoreResult,
    soilManagement: SoilManagementOptions,
    soilContext: {
      drainage: string;
      ph: number;
      organicMatterPercent: number;
      hasCriticalConstraint: boolean;
    },
  ): ScenarioBlock {
    let uplift = 0;
    const max = this.calibration.maxManagementImprovement();

    if (soilManagement.drainageImprovement) {
      // unknown drainage: limited scenario boost only
      uplift += soilContext.drainage === 'unknown' ? 2 : soilContext.drainage === 'poor' ? 5 : 3;
    }
    if (soilManagement.organicMatterImprovement) {
      uplift += soilContext.organicMatterPercent < 2 ? 4 : 2;
    }
    if (soilManagement.phCorrection) {
      // only modest effect within reasonable correction range
      if (soilContext.ph < 6 || soilContext.ph > 7.8) {
        uplift += 4;
      } else {
        uplift += 1;
      }
    }

    if (soilContext.hasCriticalConstraint) {
      // critical hard constraints are not auto-cleared
      uplift = Math.min(uplift, 5);
    }

    uplift = Math.min(max, uplift);
    const potentialFinal = roundScore(clampScore(current.final + uplift));
    const currentClass = this.calibration.classify(current.final);
    const potentialClass = this.calibration.classify(potentialFinal);

    return {
      current: {
        score: current.final,
        classification: currentClass.classification,
      },
      withSelectedManagement: {
        score: Math.max(potentialFinal, current.final),
        classification: potentialClass.classification,
        estimatedImprovement: roundScore(
          Math.max(0, Math.max(potentialFinal, current.final) - current.final),
        ),
      },
    };
  }
}
