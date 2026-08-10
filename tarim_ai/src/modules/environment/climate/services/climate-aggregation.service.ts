import type { RiskLevel } from '../../shared/types/provider-metadata.types.js';
import type { MonthlyClimateStats, YearlyClimateStats } from '../types/climate.types.js';
import { isMonthInSeason } from '../config/season.config.js';
import { CLIMATE_COMPLETENESS_THRESHOLDS } from '../config/season.config.js';
import { parseNasaDateKey } from '../utils/climate-date.utils.js';
import {
  computeCompleteness,
  isMissingClimateValue,
  max,
  mean,
  min,
  populationStdDev,
  round1,
  round2,
  sum,
  type ParameterCompleteness,
} from '../utils/climate-statistics.utils.js';
import { ClimateRiskClassificationService } from './climate-risk-classification.service.js';

export interface NasaDailyParameterMap {
  [parameter: string]: Record<string, number | null | undefined>;
}

export interface AggregatedClimateMetrics {
  annualMeanC: number;
  growingSeasonMeanC: number;
  summerMeanC: number;
  winterMeanC: number;
  annualMinC: number;
  annualMaxC: number;
  frostRisk: RiskLevel;
  extremeHeatRisk: RiskLevel;
  annualTotalMm: number;
  growingSeasonTotalMm: number;
  summerTotalMm: number;
  seasonality: RiskLevel;
  estimatedIrrigationNeed: RiskLevel;
  droughtRisk: RiskLevel;
  frostDaysPerYear: number;
  extremeHeatDaysPerYear: number;
  wetDaysPerYear: number;
  completeness: {
    overallValidRatio: number;
    byParameter: Record<string, ParameterCompleteness>;
  };
  confidence: RiskLevel;
  monthly: MonthlyClimateStats[];
  yearly: YearlyClimateStats[];
  monthlyByYear: Array<{ year: number; monthly: MonthlyClimateStats[] }>;
}

export class ClimateAggregationService {
  constructor(private readonly risk = new ClimateRiskClassificationService()) {}

  aggregate(
    parameters: NasaDailyParameterMap,
    requiredParameters: readonly string[],
    yearsUsed: number,
  ): AggregatedClimateMetrics {
    const byParameter: Record<string, ParameterCompleteness> = {};
    const series: Record<string, Array<{ date: Date; value: number }>> = {};

    for (const parameter of Object.keys(parameters)) {
      const daily = parameters[parameter] ?? {};
      const keys = Object.keys(daily);
      const valid: Array<{ date: Date; value: number }> = [];
      for (const key of keys) {
        const date = parseNasaDateKey(key);
        const raw = daily[key];
        if (!date || isMissingClimateValue(raw)) {
          continue;
        }
        valid.push({ date, value: Number(raw) });
      }
      series[parameter] = valid;
      byParameter[parameter] = computeCompleteness(keys.length, valid.length);
    }

    for (const required of requiredParameters) {
      const completeness = byParameter[required];
      if (!completeness || completeness.validRatio < CLIMATE_COMPLETENESS_THRESHOLDS.insufficientBelow) {
        throw new Error(
          `Insufficient climate data for required parameter ${required}`,
        );
      }
    }

    const t2m = series.T2M ?? [];
    const t2mMin = series.T2M_MIN ?? [];
    const t2mMax = series.T2M_MAX ?? [];
    const precip = series.PRECTOTCORR ?? [];

    const annualMeanC = requireMean(t2m.map((d) => d.value), 'T2M');
    const growingSeasonMeanC = requireMean(
      t2m.filter((d) => isMonthInSeason(d.date.getUTCMonth() + 1, 'growingSeason')).map((d) => d.value),
      'growingSeason T2M',
    );
    const summerMeanC = requireMean(
      t2m.filter((d) => isMonthInSeason(d.date.getUTCMonth() + 1, 'summer')).map((d) => d.value),
      'summer T2M',
    );
    const winterMeanC = requireMean(
      t2m.filter((d) => isMonthInSeason(d.date.getUTCMonth() + 1, 'winter')).map((d) => d.value),
      'winter T2M',
    );

    const annualMinC = min(t2mMin.map((d) => d.value));
    const annualMaxC = max(t2mMax.map((d) => d.value));
    if (annualMinC == null || annualMaxC == null) {
      throw new Error('Insufficient temperature extremes');
    }

    const frostDays = t2mMin.filter((d) => this.risk.isFrostDay(d.value)).length;
    const heatDays = t2mMax.filter((d) => this.risk.isExtremeHeatDay(d.value)).length;
    const frostDaysPerYear = frostDays / yearsUsed;
    const extremeHeatDaysPerYear = heatDays / yearsUsed;

    const annualTotalsByYear = groupAnnualPrecipitation(precip);
    const annualTotals = Object.values(annualTotalsByYear);
    const annualTotalMm = mean(annualTotals) ?? 0;

    const growingSeasonTotalMm =
      mean(
        Object.values(
          groupSeasonPrecipitation(precip, (month) =>
            isMonthInSeason(month, 'growingSeason'),
          ),
        ),
      ) ?? 0;
    const summerTotalMm =
      mean(
        Object.values(
          groupSeasonPrecipitation(precip, (month) => isMonthInSeason(month, 'summer')),
        ),
      ) ?? 0;

    const monthlyTotals = groupMonthlyPrecipitation(precip);
    const monthlyValues = Object.values(monthlyTotals);
    const monthlyCv =
      monthlyValues.length > 0 && mean(monthlyValues)! > 0
        ? (populationStdDev(monthlyValues) ?? 0) / mean(monthlyValues)!
        : 0;

    const annualCv =
      annualTotals.length > 0 && mean(annualTotals)! > 0
        ? (populationStdDev(annualTotals) ?? 0) / mean(annualTotals)!
        : 0;

    const wetDays = precip.filter((d) => d.value > 1).length;
    const wetDaysPerYear = wetDays / yearsUsed;

    const frostRisk = this.risk.classifyFrostRisk(frostDaysPerYear);
    const extremeHeatRisk = this.risk.classifyExtremeHeatRisk(extremeHeatDaysPerYear);
    const seasonality = this.risk.classifySeasonality(monthlyCv);
    const droughtRisk = this.risk.classifyDroughtRisk({
      annualTotalMm,
      growingSeasonTotalMm,
      summerTotalMm,
      wetDaysPerYear,
      annualPrecipitationCv: annualCv,
    });
    const estimatedIrrigationNeed = this.risk.classifyIrrigationNeed({
      summerTotalMm,
      growingSeasonTotalMm,
      extremeHeatDaysPerYear,
    });

    const requiredRatios = requiredParameters.map(
      (parameter) => byParameter[parameter]?.validRatio ?? 0,
    );
    const overallValidRatio =
      requiredRatios.length === 0
        ? 0
        : requiredRatios.reduce((a, b) => a + b, 0) / requiredRatios.length;

    let confidence: RiskLevel = 'high';
    if (overallValidRatio < CLIMATE_COMPLETENESS_THRESHOLDS.lowMaxIfBelow) {
      confidence = 'low';
    } else if (overallValidRatio < CLIMATE_COMPLETENESS_THRESHOLDS.mediumMaxIfBelow) {
      confidence = 'medium';
    }

    const monthly = buildMonthlyClimatology(t2m, t2mMin, t2mMax, precip, yearsUsed, this.risk);
    const { yearly, monthlyByYear } = buildYearlySeries(t2m, t2mMin, t2mMax, precip, this.risk);

    return {
      annualMeanC: round1(annualMeanC),
      growingSeasonMeanC: round1(growingSeasonMeanC),
      summerMeanC: round1(summerMeanC),
      winterMeanC: round1(winterMeanC),
      annualMinC: round1(annualMinC),
      annualMaxC: round1(annualMaxC),
      frostRisk,
      extremeHeatRisk,
      annualTotalMm: round1(annualTotalMm),
      growingSeasonTotalMm: round1(growingSeasonTotalMm),
      summerTotalMm: round1(summerTotalMm),
      seasonality,
      estimatedIrrigationNeed,
      droughtRisk,
      frostDaysPerYear: round1(frostDaysPerYear),
      extremeHeatDaysPerYear: round1(extremeHeatDaysPerYear),
      wetDaysPerYear: round1(wetDaysPerYear),
      completeness: {
        overallValidRatio: round2(overallValidRatio),
        byParameter,
      },
      confidence,
      monthly,
      yearly,
      monthlyByYear,
    };
  }
}

function requireMean(values: number[], label: string): number {
  const value = mean(values);
  if (value == null) {
    throw new Error(`Insufficient data for ${label}`);
  }
  return value;
}

function groupAnnualPrecipitation(
  precip: Array<{ date: Date; value: number }>,
): Record<number, number> {
  const byYear: Record<number, number[]> = {};
  for (const point of precip) {
    const year = point.date.getUTCFullYear();
    byYear[year] ??= [];
    byYear[year].push(point.value);
  }
  return Object.fromEntries(
    Object.entries(byYear).map(([year, values]) => [Number(year), sum(values)]),
  );
}

function groupSeasonPrecipitation(
  precip: Array<{ date: Date; value: number }>,
  includeMonth: (month: number) => boolean,
): Record<number, number> {
  const byYear: Record<number, number[]> = {};
  for (const point of precip) {
    const month = point.date.getUTCMonth() + 1;
    if (!includeMonth(month)) {
      continue;
    }
    const year = point.date.getUTCFullYear();
    byYear[year] ??= [];
    byYear[year].push(point.value);
  }
  return Object.fromEntries(
    Object.entries(byYear).map(([year, values]) => [Number(year), sum(values)]),
  );
}

function groupMonthlyPrecipitation(
  precip: Array<{ date: Date; value: number }>,
): Record<string, number> {
  const byMonth: Record<string, number[]> = {};
  for (const point of precip) {
    const key = `${point.date.getUTCFullYear()}-${point.date.getUTCMonth() + 1}`;
    byMonth[key] ??= [];
    byMonth[key].push(point.value);
  }
  return Object.fromEntries(
    Object.entries(byMonth).map(([key, values]) => [key, sum(values)]),
  );
}

function buildMonthlyClimatology(
  t2m: Array<{ date: Date; value: number }>,
  t2mMin: Array<{ date: Date; value: number }>,
  t2mMax: Array<{ date: Date; value: number }>,
  precip: Array<{ date: Date; value: number }>,
  yearsUsed: number,
  risk: ClimateRiskClassificationService,
): MonthlyClimateStats[] {
  const months: MonthlyClimateStats[] = [];
  for (let month = 1; month <= 12; month++) {
    const means = t2m.filter((d) => d.date.getUTCMonth() + 1 === month).map((d) => d.value);
    const mins = t2mMin.filter((d) => d.date.getUTCMonth() + 1 === month).map((d) => d.value);
    const maxs = t2mMax.filter((d) => d.date.getUTCMonth() + 1 === month).map((d) => d.value);
    const precipByYear: Record<number, number> = {};
    for (const point of precip.filter((d) => d.date.getUTCMonth() + 1 === month)) {
      const year = point.date.getUTCFullYear();
      precipByYear[year] = (precipByYear[year] ?? 0) + point.value;
    }
    const annualMonthTotals = Object.values(precipByYear);
    const precipitationMm = mean(annualMonthTotals) ?? 0;

    const frostDays =
      (t2mMin.filter(
        (d) => d.date.getUTCMonth() + 1 === month && risk.isFrostDay(d.value),
      ).length) / Math.max(1, yearsUsed);
    const extremeHeatDays =
      (t2mMax.filter(
        (d) => d.date.getUTCMonth() + 1 === month && risk.isExtremeHeatDay(d.value),
      ).length) / Math.max(1, yearsUsed);
    const rainyDays =
      (precip.filter(
        (d) => d.date.getUTCMonth() + 1 === month && d.value > 1,
      ).length) / Math.max(1, yearsUsed);

    months.push({
      month,
      temperatureMeanC: round1(mean(means) ?? 0),
      temperatureMinC: round1(min(mins) ?? 0),
      temperatureMaxC: round1(max(maxs) ?? 0),
      precipitationMm: round1(precipitationMm),
      frostDays: round1(frostDays),
      extremeHeatDays: round1(extremeHeatDays),
      rainyDays: round1(rainyDays),
    });
  }
  return months;
}

function buildYearlySeries(
  t2m: Array<{ date: Date; value: number }>,
  t2mMin: Array<{ date: Date; value: number }>,
  t2mMax: Array<{ date: Date; value: number }>,
  precip: Array<{ date: Date; value: number }>,
  risk: ClimateRiskClassificationService,
): {
  yearly: YearlyClimateStats[];
  monthlyByYear: Array<{ year: number; monthly: MonthlyClimateStats[] }>;
} {
  const years = new Set<number>();
  for (const point of t2m) years.add(point.date.getUTCFullYear());
  for (const point of precip) years.add(point.date.getUTCFullYear());
  const sortedYears = [...years].sort((a, b) => a - b);

  const yearly: YearlyClimateStats[] = [];
  const monthlyByYear: Array<{ year: number; monthly: MonthlyClimateStats[] }> = [];

  for (const year of sortedYears) {
    const means = t2m.filter((d) => d.date.getUTCFullYear() === year).map((d) => d.value);
    const mins = t2mMin.filter((d) => d.date.getUTCFullYear() === year).map((d) => d.value);
    const maxs = t2mMax.filter((d) => d.date.getUTCFullYear() === year).map((d) => d.value);
    const precipYear = precip.filter((d) => d.date.getUTCFullYear() === year);
    const precipValues = precipYear.map((d) => d.value);
    if (means.length === 0 && precipValues.length === 0) continue;

    yearly.push({
      year,
      temperatureMeanC: round1(mean(means) ?? 0),
      temperatureMinC: round1(min(mins) ?? 0),
      temperatureMaxC: round1(max(maxs) ?? 0),
      precipitationMm: round1(sum(precipValues)),
      frostDays: round1(mins.filter((v) => risk.isFrostDay(v)).length),
      extremeHeatDays: round1(maxs.filter((v) => risk.isExtremeHeatDay(v)).length),
      rainyDays: round1(precipValues.filter((v) => v > 1).length),
    });

    const monthly: MonthlyClimateStats[] = [];
    for (let month = 1; month <= 12; month++) {
      const mMeans = t2m
        .filter((d) => d.date.getUTCFullYear() === year && d.date.getUTCMonth() + 1 === month)
        .map((d) => d.value);
      const mMins = t2mMin
        .filter((d) => d.date.getUTCFullYear() === year && d.date.getUTCMonth() + 1 === month)
        .map((d) => d.value);
      const mMaxs = t2mMax
        .filter((d) => d.date.getUTCFullYear() === year && d.date.getUTCMonth() + 1 === month)
        .map((d) => d.value);
      const mPrecip = precip
        .filter((d) => d.date.getUTCFullYear() === year && d.date.getUTCMonth() + 1 === month)
        .map((d) => d.value);
      monthly.push({
        month,
        temperatureMeanC: round1(mean(mMeans) ?? 0),
        temperatureMinC: round1(min(mMins) ?? 0),
        temperatureMaxC: round1(max(mMaxs) ?? 0),
        precipitationMm: round1(sum(mPrecip)),
        frostDays: round1(mMins.filter((v) => risk.isFrostDay(v)).length),
        extremeHeatDays: round1(mMaxs.filter((v) => risk.isExtremeHeatDay(v)).length),
        rainyDays: round1(mPrecip.filter((v) => v > 1).length),
      });
    }
    monthlyByYear.push({ year, monthly });
  }

  return { yearly, monthlyByYear };
}
