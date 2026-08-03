export type IrrigationScenario = 'unknown' | 'rainfed' | 'limited' | 'full';

export interface SoilManagementOptions {
  drainageImprovement: boolean;
  organicMatterImprovement: boolean;
  phCorrection: boolean;
}

export interface ScenarioDefinition {
  id: string;
  label: string;
  irrigationScenario?: IrrigationScenario;
  plantingScenario?: 'automatic' | 'earliest' | 'latest' | 'custom';
  customPlantingDate?: string;
  soilManagement?: Partial<SoilManagementOptions>;
}

export interface ScenarioScoreResult {
  scenarioId: string;
  score: number;
  classification: string;
  differenceFromBaseline: number;
  primaryRisks: string[];
}

export interface ManagementNeed {
  code: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

export interface ScenarioBlock {
  current: {
    score: number;
    classification: string;
  };
  withSelectedManagement: {
    score: number;
    classification: string;
    estimatedImprovement: number;
  };
}
