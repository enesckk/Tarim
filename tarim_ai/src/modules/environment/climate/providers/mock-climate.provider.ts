import type { ClimateProvider } from './climate-provider.interface.js';
import type { ClimateProfile, ClimateProviderInput, MonthlyClimateStats } from '../types/climate.types.js';

/**
 * Representative climatology for Gaziantep-like SE Anatolia conditions.
 * Explicitly mock — not official measurements.
 */
export class MockClimateProvider implements ClimateProvider {
  readonly name = 'mock';

  async getProfile(input: ClimateProviderInput): Promise<ClimateProfile> {
    return {
      provider: 'mock',
      location: input.centroid,
      period: {
        years: input.years,
        type: 'climatology',
      },
      temperature: {
        annualMeanC: 18.4,
        growingSeasonMeanC: 24.1,
        summerMeanC: 30.6,
        winterMeanC: 7.2,
        annualMinC: -4.5,
        annualMaxC: 42.0,
        frostRisk: 'medium',
        extremeHeatRisk: 'high',
      },
      precipitation: {
        annualTotalMm: 540,
        growingSeasonTotalMm: 220,
        summerTotalMm: 35,
        seasonality: 'high',
      },
      water: {
        estimatedIrrigationNeed: 'high',
        droughtRisk: 'medium',
      },
      confidence: 'low',
      limitations: ['Bu iklim profili geliştirme amaçlı temsili veridir.'],
      metadata: {
        source: 'mock-climate-provider',
        provider: 'mock',
        generatedAt: new Date().toISOString(),
        isMock: true,
        isEstimated: true,
      },
      climatology: {
        monthly: buildMockMonthly(),
      },
    };
  }
}

/** Gaziantep-like synthetic monthly climatology for phenology tests. */
function buildMockMonthly(): MonthlyClimateStats[] {
  const means = [5.5, 7.0, 11.0, 16.0, 21.5, 27.0, 31.0, 30.5, 26.0, 19.5, 12.0, 7.0];
  const mins = [-4, -3, 0, 5, 10, 15, 20, 19, 14, 8, 2, -2];
  const maxs = [14, 16, 22, 28, 34, 38, 42, 41, 36, 30, 22, 15];
  const precip = [70, 60, 55, 45, 30, 10, 5, 5, 10, 35, 55, 60];
  const frost = [12, 8, 3, 0.5, 0, 0, 0, 0, 0, 0, 2, 8];
  const heat = [0, 0, 0, 1, 5, 15, 22, 20, 8, 1, 0, 0];
  const rainy = [10, 9, 9, 7, 5, 2, 1, 1, 2, 5, 8, 9];

  return means.map((temperatureMeanC, index) => ({
    month: index + 1,
    temperatureMeanC,
    temperatureMinC: mins[index],
    temperatureMaxC: maxs[index],
    precipitationMm: precip[index],
    frostDays: frost[index],
    extremeHeatDays: heat[index],
    rainyDays: rainy[index],
  }));
}
