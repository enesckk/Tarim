import type {
  RiskLevel,
  ProviderInputBase,
  ProviderMetadata,
  ProviderLocation,
} from '../../shared/types/provider-metadata.types.js';

export type ClimateProviderInput = ProviderInputBase & {
  years: number;
};

export interface MonthlyClimateStats {
  month: number;
  temperatureMeanC: number;
  temperatureMinC: number;
  temperatureMaxC: number;
  precipitationMm: number;
  frostDays: number;
  extremeHeatDays: number;
  rainyDays: number;
}

export interface ClimateProfile {
  provider: string;
  location: ProviderLocation;
  period: {
    years: number;
    type: 'climatology';
  };
  temperature: {
    annualMeanC: number;
    growingSeasonMeanC: number;
    summerMeanC: number;
    winterMeanC: number;
    annualMinC: number;
    annualMaxC: number;
    frostRisk: RiskLevel;
    extremeHeatRisk: RiskLevel;
  };
  precipitation: {
    annualTotalMm: number;
    growingSeasonTotalMm: number;
    summerTotalMm: number;
    seasonality: RiskLevel;
  };
  water: {
    estimatedIrrigationNeed: RiskLevel;
    droughtRisk: RiskLevel;
  };
  confidence: RiskLevel;
  limitations: string[];
  metadata: ProviderMetadata;
  /** Optional monthly climatology for phenology scoring (backward compatible). */
  climatology?: {
    monthly: MonthlyClimateStats[];
  };
}
