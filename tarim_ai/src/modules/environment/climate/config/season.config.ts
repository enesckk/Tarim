/** Northern Hemisphere / Türkiye default season definitions. */
export const SEASON_MONTHS = {
  winter: [12, 1, 2] as const,
  spring: [3, 4, 5] as const,
  summer: [6, 7, 8] as const,
  autumn: [9, 10, 11] as const,
  growingSeason: [4, 5, 6, 7, 8, 9, 10] as const,
} as const;

export type SeasonName = keyof typeof SEASON_MONTHS;

export function isMonthInSeason(month: number, season: SeasonName): boolean {
  return (SEASON_MONTHS[season] as readonly number[]).includes(month);
}

export const NASA_POWER_REQUIRED_PARAMETERS = [
  'T2M',
  'T2M_MIN',
  'T2M_MAX',
  'PRECTOTCORR',
] as const;

export const NASA_POWER_OPTIONAL_PARAMETERS = [
  'RH2M',
  'WS2M',
  'ALLSKY_SFC_SW_DWN',
] as const;

export const NASA_POWER_REQUEST_PARAMETERS = [
  ...NASA_POWER_REQUIRED_PARAMETERS,
  ...NASA_POWER_OPTIONAL_PARAMETERS,
] as const;

export const FROST_TEMPERATURE_C = 0;
export const EXTREME_HEAT_TEMPERATURE_C = 35;

export const FROST_RISK_THRESHOLDS = {
  lowMaxDaysPerYear: 5,
  mediumMaxDaysPerYear: 20,
} as const;

export const EXTREME_HEAT_RISK_THRESHOLDS = {
  lowMaxDaysPerYear: 10,
  mediumMaxDaysPerYear: 30,
} as const;

export const CLIMATE_COMPLETENESS_THRESHOLDS = {
  mediumMaxIfBelow: 0.85,
  lowMaxIfBelow: 0.6,
  insufficientBelow: 0.4,
} as const;
