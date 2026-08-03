import type { CropKnowledge } from '../types/crop.types.js';
import type { ClimateProfile } from '../../environment/climate/types/climate.types.js';
import type {
  PhenologyEvaluationResult,
  PlantingScenarioType,
  StageEvaluationResult,
} from './phenology.types.js';
import { CropCalendarService } from './crop-calendar.service.js';
import { PhenologyWindowService } from './phenology-window.service.js';

export class CropPhenologyService {
  constructor(
    private readonly calendar = new CropCalendarService(),
    private readonly windows = new PhenologyWindowService(),
  ) {}

  evaluate(input: {
    crop: CropKnowledge;
    climate: ClimateProfile;
    plantingScenario: PlantingScenarioType;
    customPlantingDate?: string;
    referenceYear?: number;
  }): PhenologyEvaluationResult {
    const phenology = input.crop.phenology;
    const monthly = input.climate.climatology?.monthly ?? [];
    const year = input.referenceYear ?? new Date().getUTCFullYear();

    let selected = this.calendar.resolvePlantingDate({
      windows: phenology.plantingWindows,
      scenario: input.plantingScenario,
      customPlantingDate: input.customPlantingDate,
      referenceYear: year,
    });

    let stageResults: StageEvaluationResult[] = [];

    if (input.plantingScenario === 'automatic' && monthly.length > 0) {
      let bestScore = -1;
      for (const candidate of this.calendar.candidateDatesForAutomatic(
        phenology.plantingWindows,
        year,
      )) {
        const stages = this.evaluateStages(
          phenology.growthStages,
          candidate.date,
          monthly,
        );
        const weighted = stages.reduce(
          (sum, stage, index) =>
            sum + stage.score * phenology.growthStages[index].weight,
          0,
        );
        if (weighted > bestScore) {
          bestScore = weighted;
          selected = {
            type: 'automatic',
            selectedDate: candidate.date.toISOString().slice(0, 10),
            windowLabel: candidate.window.label,
            withinRecommendedWindow: true,
            warnings: [],
          };
          stageResults = stages;
        }
      }
    } else {
      const plantingDate = new Date(`${selected.selectedDate}T00:00:00Z`);
      stageResults = this.evaluateStages(
        phenology.growthStages,
        plantingDate,
        monthly,
      );
    }

    const criticalStageRisks = stageResults
      .filter((stage) => stage.riskLevel === 'high')
      .map((stage) => ({
        stage: stage.stage,
        message: stage.messages[0] ?? `${stage.label} döneminde yüksek risk sinyali.`,
        riskLevel: stage.riskLevel,
      }));

    return {
      selectedPlantingDate: selected.selectedDate,
      selectedWindow: selected.windowLabel,
      selectedPlantingScenario: selected,
      stageResults,
      criticalStageRisks,
    };
  }

  private evaluateStages(
    stages: CropKnowledge['phenology']['growthStages'],
    plantingDate: Date,
    monthly: NonNullable<ClimateProfile['climatology']>['monthly'],
  ): StageEvaluationResult[] {
    return stages.map((stage) =>
      this.windows.evaluateStage({ stage, plantingDate, monthly }),
    );
  }
}
