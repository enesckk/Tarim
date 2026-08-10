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

/** Calendar-year summary derived from the same NASA POWER daily series. */
export interface YearlyClimateStats {
  year: number;
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
    /** Per-year annual totals/means for year picker UI. */
    yearly?: YearlyClimateStats[];
    /** Per-year monthly series (same shape as monthly climatology). */
    monthlyByYear?: Array<{
      year: number;
      monthly: MonthlyClimateStats[];
    }>;
  };
}
