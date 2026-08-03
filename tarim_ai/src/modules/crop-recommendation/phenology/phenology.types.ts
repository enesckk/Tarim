export type PlantingScenarioType = 'automatic' | 'earliest' | 'latest' | 'custom';
export type IrrigationScenarioType = 'unknown' | 'rainfed' | 'limited' | 'full';

export interface SelectedPlantingScenario {
  type: PlantingScenarioType;
  selectedDate: string;
  windowLabel: string;
  withinRecommendedWindow: boolean;
  warnings: string[];
}

export interface StagePeriod {
  start: string;
  end: string;
}

export interface StageEvaluationResult {
  stage: string;
  label: string;
  period: StagePeriod;
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  messages: string[];
  temperatureMeanC: number | null;
  precipitationMm: number | null;
  frostDays: number;
  extremeHeatDays: number;
  components: {
    temperature: number;
    precipitation: number;
    frost: number;
    heat: number;
  };
}

export interface PhenologyEvaluationResult {
  selectedPlantingDate: string;
  selectedWindow: string;
  selectedPlantingScenario: SelectedPlantingScenario;
  stageResults: StageEvaluationResult[];
  criticalStageRisks: Array<{ stage: string; message: string; riskLevel: string }>;
}
