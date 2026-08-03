import type { RecommendationInputSnapshot } from '../types/recommendation.types.js';
import type { CropKnowledge } from '../types/crop.types.js';
import type { ExtendedSuitabilityScoreResult } from '../services/crop-suitability.service.js';
import { ScoreCalibrationService } from '../calibration/score-calibration.service.js';

export interface RecommendationAudit {
  modelVersion: string;
  knowledgeVersion: string;
  calibrationVersion: string;
  inputsUsed: string[];
  missingInputs: string[];
  penaltiesApplied: Array<{ code: string; penalty: number }>;
  scoreBeforeClamp: number;
  scoreAfterClamp: number;
}

export class RecommendationAuditService {
  constructor(private readonly calibration = new ScoreCalibrationService()) {}

  build(input: {
    crop: CropKnowledge;
    snapshot: RecommendationInputSnapshot;
    suitability: ExtendedSuitabilityScoreResult;
    knowledgeVersion: string;
  }): RecommendationAudit {
    const inputsUsed: string[] = ['sentinel'];
    if (!input.snapshot.climate.metadata.isMock) {
      inputsUsed.push(String(input.snapshot.climate.metadata.provider ?? 'climate'));
    } else {
      inputsUsed.push('mock-climate');
    }
    if (!input.snapshot.soil.metadata.isMock) {
      inputsUsed.push(String(input.snapshot.soil.metadata.provider ?? 'soil'));
    } else {
      inputsUsed.push('mock-soil');
    }

    const missingInputs: string[] = [];
    if (input.snapshot.soil.soil.electricalConductivityDsM == null) {
      missingInputs.push('soil_ec');
    }
    if (input.snapshot.soil.soil.drainage === 'unknown') {
      missingInputs.push('soil_drainage');
    }
    if (input.snapshot.soil.soil.depthCm == null) {
      missingInputs.push('rooting_depth');
    }
    if (input.snapshot.soil.soil.calciumCarbonatePercent == null) {
      missingInputs.push('calcium_carbonate');
    }

    return {
      modelVersion: '1.1',
      knowledgeVersion: input.knowledgeVersion,
      calibrationVersion: this.calibration.getProfile().version,
      inputsUsed,
      missingInputs,
      penaltiesApplied: input.suitability.constraints.map((c) => ({
        code: c.code,
        penalty: c.penalty,
      })),
      scoreBeforeClamp: input.suitability.scoreBeforeClamp,
      scoreAfterClamp: input.suitability.final,
    };
  }
}
