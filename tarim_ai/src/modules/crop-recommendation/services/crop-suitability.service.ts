import type { CropKnowledge } from '../types/crop.types.js';
import type { RecommendationInputSnapshot } from '../types/recommendation.types.js';
import type { SuitabilityScoreResult } from '../types/suitability.types.js';
import { clampScore, roundScore } from '../rules/range-scoring.js';
import {
  ClimateSuitabilityService,
  type ClimateScoreOptions,
} from './climate-suitability.service.js';
import { SoilSuitabilityService } from './soil-suitability.service.js';
import { SentinelSuitabilityService } from './sentinel-suitability.service.js';
import { RecommendationConfidenceService } from './recommendation-confidence.service.js';
import { ConstraintEvaluationService } from './constraint-evaluation.service.js';
import { ScoreCalibrationService } from '../calibration/score-calibration.service.js';
import type { PhenologyEvaluationResult } from '../phenology/phenology.types.js';

export type SuitabilityEvaluateOptions = ClimateScoreOptions;

export interface ExtendedSuitabilityScoreResult extends SuitabilityScoreResult {
  phenology?: PhenologyEvaluationResult;
  scoreBeforeClamp: number;
}

export class CropSuitabilityService {
  constructor(
    private readonly climateSuitability = new ClimateSuitabilityService(),
    private readonly soilSuitability = new SoilSuitabilityService(),
    private readonly sentinelSuitability = new SentinelSuitabilityService(),
    private readonly reliabilityService = new RecommendationConfidenceService(),
    private readonly constraintService = new ConstraintEvaluationService(),
    private readonly calibration = new ScoreCalibrationService(),
  ) {}

  evaluate(
    crop: CropKnowledge,
    snapshot: RecommendationInputSnapshot,
    options: SuitabilityEvaluateOptions = {},
  ): ExtendedSuitabilityScoreResult {
    const climate = this.climateSuitability.score(crop, snapshot.climate, options);
    const soil = this.soilSuitability.score(crop, snapshot.soil);
    const sentinel = this.sentinelSuitability.score(
      crop,
      snapshot.analysis,
      snapshot.timeSeries,
    );
    const reliability = this.reliabilityService.scoreReliability(snapshot);

    const gross = roundScore(
      climate.score + soil.score + sentinel.score + reliability.score,
    );
    const { constraints, totalPenalty } = this.constraintService.evaluate(crop, snapshot);
    const beforeClamp = gross - totalPenalty;
    const final = roundScore(clampScore(beforeClamp));
    const { classification, label } = this.calibration.classify(final);

    return {
      gross,
      constraintPenalty: totalPenalty,
      final,
      classification,
      label,
      breakdown: { climate, soil, sentinel, reliability },
      constraints,
      phenology: climate.phenology,
      scoreBeforeClamp: roundScore(beforeClamp),
    };
  }
}
