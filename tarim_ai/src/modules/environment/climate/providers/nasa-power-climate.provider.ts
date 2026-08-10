import type { Env } from '../../../../config/env.js';
import { ApiError } from '../../../../utils/api-error.js';
import { axiosGetWithRetry } from '../../shared/utils/http-retry.js';
import type { ClimateProvider } from './climate-provider.interface.js';
import type { ClimateProviderInput, ClimateProfile } from '../types/climate.types.js';
import {
  NASA_POWER_REQUEST_PARAMETERS,
  NASA_POWER_REQUIRED_PARAMETERS,
} from '../config/season.config.js';
import {
  clampHistoryYears,
  resolveCompletedClimatologyPeriod,
  toIsoDate,
} from '../utils/climate-date.utils.js';
import { ClimateAggregationService } from '../services/climate-aggregation.service.js';

export interface NasaPowerClimateConfig {
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  historyYearsDefault: number;
}

export function nasaPowerConfigFromEnv(env: Env): NasaPowerClimateConfig {
  return {
    baseUrl: env.NASA_POWER_BASE_URL.replace(/\/$/, ''),
    timeoutMs: env.NASA_POWER_TIMEOUT_MS,
    maxRetries: env.NASA_POWER_MAX_RETRIES,
    historyYearsDefault: env.NASA_POWER_HISTORY_YEARS,
  };
}

interface NasaPowerDailyResponse {
  properties?: {
    parameter?: Record<string, Record<string, number | null | undefined>>;
  };
  messages?: unknown;
}

export class NasaPowerClimateProvider implements ClimateProvider {
  readonly name = 'nasa-power';

  constructor(
    private readonly config: NasaPowerClimateConfig,
    private readonly aggregation = new ClimateAggregationService(),
    private readonly fetchJson: typeof axiosGetWithRetry = axiosGetWithRetry,
  ) {}

  async getProfile(input: ClimateProviderInput): Promise<ClimateProfile> {
    const years = clampHistoryYears(
      input.years ?? this.config.historyYearsDefault,
      3,
      30,
      this.config.historyYearsDefault,
    );
    const period = resolveCompletedClimatologyPeriod(years);
    const url = this.buildUrl({
      longitude: input.centroid.longitude,
      latitude: input.centroid.latitude,
      start: period.start,
      end: period.end,
      parameters: [...NASA_POWER_REQUEST_PARAMETERS],
    });

    let payload: NasaPowerDailyResponse;
    try {
      const { traceExternalProviderCall } = await import(
        '../../../operations/tracing/provider-tracing.js'
      );
      payload = await traceExternalProviderCall({
        provider: 'nasa-power',
        operation: 'daily-climatology',
        attempt: 1,
        fn: () =>
          this.fetchJson<NasaPowerDailyResponse>(
            url,
            {
              timeout: this.config.timeoutMs,
              headers: { Accept: 'application/json' },
            },
            {
              maxRetries: this.config.maxRetries,
              providerLabel: 'NASA POWER',
            },
          ),
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(502, 'NASA POWER is unavailable.');
    }

    const parameterMap = payload.properties?.parameter;
    if (!parameterMap || typeof parameterMap !== 'object') {
      throw new ApiError(502, 'NASA POWER returned an invalid response.');
    }

    for (const required of NASA_POWER_REQUIRED_PARAMETERS) {
      if (!parameterMap[required]) {
        throw new ApiError(502, 'NASA POWER returned an invalid response.');
      }
    }

    let metrics;
    try {
      metrics = this.aggregation.aggregate(
        parameterMap,
        NASA_POWER_REQUIRED_PARAMETERS,
        period.yearsUsed,
      );
    } catch {
      throw new ApiError(502, 'NASA POWER returned an invalid response.');
    }

    return {
      provider: this.name,
      location: {
        longitude: input.centroid.longitude,
        latitude: input.centroid.latitude,
      },
      period: {
        years: period.yearsUsed,
        type: 'climatology',
      },
      temperature: {
        annualMeanC: metrics.annualMeanC,
        growingSeasonMeanC: metrics.growingSeasonMeanC,
        summerMeanC: metrics.summerMeanC,
        winterMeanC: metrics.winterMeanC,
        annualMinC: metrics.annualMinC,
        annualMaxC: metrics.annualMaxC,
        frostRisk: metrics.frostRisk,
        extremeHeatRisk: metrics.extremeHeatRisk,
      },
      precipitation: {
        annualTotalMm: metrics.annualTotalMm,
        growingSeasonTotalMm: metrics.growingSeasonTotalMm,
        summerTotalMm: metrics.summerTotalMm,
        seasonality: metrics.seasonality,
      },
      water: {
        estimatedIrrigationNeed: metrics.estimatedIrrigationNeed,
        droughtRisk: metrics.droughtRisk,
      },
      confidence: metrics.confidence,
      limitations: [
        'Veriler meteoroloji istasyonu ölçümü değil, NASA POWER grid tabanlı tahmini veridir.',
        'Parsel içi mikroiklim farklılıklarını temsil etmeyebilir.',
        'Sulama ve ürün kararı için yerel istasyon ve saha kontrolü gereklidir.',
      ],
      metadata: {
        source: 'NASA POWER',
        provider: this.name,
        generatedAt: new Date().toISOString(),
        isMock: false,
        isEstimated: true,
        spatialResolution: 'source-grid',
        temporalResolution: 'daily',
        periodStart: toIsoDate(period.startDate),
        periodEnd: toIsoDate(period.endDate),
        yearsRequested: years,
        yearsUsed: period.yearsUsed,
        parameters: [...NASA_POWER_REQUEST_PARAMETERS],
        dataCompleteness: metrics.completeness,
        frostDaysPerYear: metrics.frostDaysPerYear,
        extremeHeatDaysPerYear: metrics.extremeHeatDaysPerYear,
      },
      climatology: {
        monthly: metrics.monthly,
        yearly: metrics.yearly,
        monthlyByYear: metrics.monthlyByYear,
      },
    };
  }

  buildUrl(input: {
    longitude: number;
    latitude: number;
    start: string;
    end: string;
    parameters: string[];
  }): string {
    if (input.parameters.length > 20) {
      throw new Error('NASA POWER parameter limit is 20');
    }
    const query = new URLSearchParams({
      parameters: input.parameters.join(','),
      community: 'AG',
      longitude: String(input.longitude),
      latitude: String(input.latitude),
      start: input.start,
      end: input.end,
      format: 'JSON',
      'time-standard': 'UTC',
    });
    return `${this.config.baseUrl}/api/temporal/daily/point?${query.toString()}`;
  }
}
