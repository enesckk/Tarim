import type { ScenarioDefinition, ScenarioScoreResult } from './scenario.types.js';
import type { CropRecommendationService } from '../services/crop-recommendation.service.js';
import type { CropKnowledgeService } from '../services/crop-knowledge.service.js';
import type { ParcelQuery } from '../../parcel/types/parcel.types.js';
import type { GeoJsonInput } from '../../../types/geojson.types.js';
import { ApiError } from '../../../utils/api-error.js';
import { ScoreCalibrationService } from '../calibration/score-calibration.service.js';

export class ScenarioComparisonService {
  constructor(
    private readonly recommendationService: CropRecommendationService,
    private readonly cropKnowledgeService: CropKnowledgeService,
    private readonly calibration = new ScoreCalibrationService(),
  ) {}

  async compare(input: {
    geometry?: GeoJsonInput;
    parcelQuery?: ParcelQuery;
    cropIds: string[];
    scenarios: ScenarioDefinition[];
    baselineIrrigation?: 'unknown' | 'rainfed' | 'limited' | 'full';
  }) {
    if (input.cropIds.length === 0 || input.cropIds.length > 10) {
      throw new ApiError(400, 'cropIds must contain between 1 and 10 crops');
    }
    if (input.scenarios.length === 0 || input.scenarios.length > 5) {
      throw new ApiError(400, 'scenarios must contain between 1 and 5 items');
    }

    for (const cropId of input.cropIds) {
      this.cropKnowledgeService.getById(cropId);
    }

    const baselineIrrigation = input.baselineIrrigation ?? 'unknown';
    const cropCount = this.cropKnowledgeService.listAll().length;

    const scenarioEvaluations: Array<{
      scenario: ScenarioDefinition;
      byCropId: Map<
        string,
        { score: number; classification: string; risks: string[]; name: string }
      >;
      parcel: unknown;
      landUsability?: unknown;
    }> = [];

    for (const scenario of input.scenarios) {
      const result = await this.recommendationService.evaluate({
        geometry: input.geometry,
        parcelQuery: input.parcelQuery,
        options: {
          timeSeriesMonths: 6,
          topN: cropCount,
          climateYears: 10,
          analysisDays: 30,
          maxCloudCoverage: 20,
          plantingScenario: scenario.plantingScenario ?? 'automatic',
          customPlantingDate: scenario.customPlantingDate,
          irrigationScenario: scenario.irrigationScenario ?? 'unknown',
          soilManagement: {
            drainageImprovement: scenario.soilManagement?.drainageImprovement ?? false,
            organicMatterImprovement:
              scenario.soilManagement?.organicMatterImprovement ?? false,
            phCorrection: scenario.soilManagement?.phCorrection ?? false,
          },
        },
      });

      const byCropId = new Map<
        string,
        { score: number; classification: string; risks: string[]; name: string }
      >();
      for (const item of result.recommendations) {
        byCropId.set(item.crop.id, {
          score: item.score.final,
          classification: item.score.classification,
          risks: item.risks.slice(0, 2).map((r) => r.message),
          name: item.crop.name,
        });
      }
      for (const item of result.notRecommended) {
        if (!byCropId.has(item.cropId)) {
          byCropId.set(item.cropId, {
            score: item.score,
            classification: this.calibration.classify(item.score).classification,
            risks: item.primaryConstraints.slice(0, 2),
            name: item.name,
          });
        }
      }
      scenarioEvaluations.push({
        scenario,
        byCropId,
        parcel: result.parcel,
        ...(result.landUsability ? { landUsability: result.landUsability } : {}),
      });
    }

    const baselineEval =
      scenarioEvaluations.find(
        (item) => (item.scenario.irrigationScenario ?? 'unknown') === baselineIrrigation,
      ) ?? scenarioEvaluations[0];

    const crops = [];
    for (const cropId of input.cropIds) {
      const knowledge = this.cropKnowledgeService.getById(cropId);
      const scenarioResults: ScenarioScoreResult[] = scenarioEvaluations.map((evaluation) => {
        const row = evaluation.byCropId.get(cropId);
        const baseline = baselineEval.byCropId.get(cropId)?.score ?? 0;
        const score = row?.score ?? 0;
        return {
          scenarioId: evaluation.scenario.id,
          score,
          classification:
            row?.classification ?? this.calibration.classify(score).classification,
          differenceFromBaseline: Math.round((score - baseline) * 100) / 100,
          primaryRisks: row?.risks ?? [],
        };
      });

      crops.push({
        crop: {
          id: cropId,
          name: knowledge.name,
        },
        scenarioResults,
      });
    }

    const bestByScenario: Array<{ scenarioId: string; cropId: string; score: number }> =
      [];
    for (const evaluation of scenarioEvaluations) {
      let bestCropId = input.cropIds[0];
      let bestScore = -1;
      for (const cropId of input.cropIds) {
        const score = evaluation.byCropId.get(cropId)?.score ?? -1;
        if (score > bestScore) {
          bestScore = score;
          bestCropId = cropId;
        }
      }
      bestByScenario.push({
        scenarioId: evaluation.scenario.id,
        cropId: bestCropId,
        score: bestScore,
      });
    }

    return {
      parcel: scenarioEvaluations[0]?.parcel ?? null,
      crops,
      bestByScenario,
      ...(scenarioEvaluations[0]?.landUsability
        ? { landUsability: scenarioEvaluations[0].landUsability }
        : {}),
    };
  }
}
