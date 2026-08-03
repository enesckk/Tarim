import type { GrowthStageDef } from '../knowledge/schemas/crop-knowledge.schema.js';
import type { MonthlyClimateStats } from '../../environment/climate/types/climate.types.js';
import type { StageEvaluationResult } from './phenology.types.js';
import { scoreTemperatureRange } from '../rules/range-scoring.js';
import { RISK_COMPATIBILITY_TABLE } from '../rules/scoring-thresholds.js';

export class PhenologyWindowService {
  resolveStagePeriod(
    plantingDate: Date,
    stage: GrowthStageDef,
  ): { start: Date; end: Date } {
    const start = addDays(plantingDate, stage.startOffsetDays);
    const end = addDays(plantingDate, stage.endOffsetDays);
    return { start, end };
  }

  aggregateMonthsForPeriod(
    monthly: MonthlyClimateStats[],
    start: Date,
    end: Date,
  ): {
    temperatureMeanC: number | null;
    temperatureMinC: number | null;
    temperatureMaxC: number | null;
    precipitationMm: number;
    frostDays: number;
    extremeHeatDays: number;
    rainyDays: number;
  } {
    const months = monthsCovered(start, end);
    const selected = monthly.filter((row) => months.has(row.month));
    if (selected.length === 0) {
      return {
        temperatureMeanC: null,
        temperatureMinC: null,
        temperatureMaxC: null,
        precipitationMm: 0,
        frostDays: 0,
        extremeHeatDays: 0,
        rainyDays: 0,
      };
    }

    const temperatureMeanC =
      selected.reduce((sum, row) => sum + row.temperatureMeanC, 0) / selected.length;
    const temperatureMinC = Math.min(...selected.map((row) => row.temperatureMinC));
    const temperatureMaxC = Math.max(...selected.map((row) => row.temperatureMaxC));
    const precipitationMm = selected.reduce((sum, row) => sum + row.precipitationMm, 0);
    const frostDays = selected.reduce((sum, row) => sum + row.frostDays, 0);
    const extremeHeatDays = selected.reduce((sum, row) => sum + row.extremeHeatDays, 0);
    const rainyDays = selected.reduce((sum, row) => sum + row.rainyDays, 0);

    return {
      temperatureMeanC,
      temperatureMinC,
      temperatureMaxC,
      precipitationMm,
      frostDays,
      extremeHeatDays,
      rainyDays,
    };
  }

  evaluateStage(input: {
    stage: GrowthStageDef;
    plantingDate: Date;
    monthly: MonthlyClimateStats[];
  }): StageEvaluationResult {
    const period = this.resolveStagePeriod(input.plantingDate, input.stage);
    const agg = this.aggregateMonthsForPeriod(input.monthly, period.start, period.end);

    const messages: string[] = [];
    let tempScore = 0.5;
    if (agg.temperatureMeanC != null) {
      tempScore = scoreTemperatureRange(agg.temperatureMeanC, input.stage.temperature);
      if (tempScore < 0.5) {
        messages.push(
          `${input.stage.label} döneminde sıcaklık ürün için sınırlı uyum göstermektedir.`,
        );
      }
    }

    const frostSensitivity = input.stage.frostSensitivity ?? 'medium';
    const frostRisk =
      agg.frostDays <= 2 ? 'low' : agg.frostDays <= 8 ? 'medium' : 'high';
    const frostScore = RISK_COMPATIBILITY_TABLE[frostSensitivity][frostRisk];
    if (frostRisk !== 'low' && frostSensitivity !== 'low') {
      messages.push(
        `${input.stage.label} döneminde don riski (${frostRisk}) dikkat gerektirir.`,
      );
    }

    const heatSensitivity = input.stage.heatSensitivity ?? 'medium';
    const heatRisk =
      agg.extremeHeatDays <= 5 ? 'low' : agg.extremeHeatDays <= 15 ? 'medium' : 'high';
    const heatScore = RISK_COMPATIBILITY_TABLE[heatSensitivity][heatRisk];
    if (heatRisk === 'high') {
      messages.push(
        `${input.stage.label} döneminde aşırı sıcaklık stresi sinyali vardır.`,
      );
    }

    // precipitation compatibility: sensitive stages need more rain
    const waterNeed =
      input.stage.waterSensitivity === 'high'
        ? 80
        : input.stage.waterSensitivity === 'medium'
          ? 45
          : 20;
    const precipScore =
      agg.precipitationMm >= waterNeed
        ? 1
        : agg.precipitationMm <= 0
          ? 0.15
          : Math.max(0.2, agg.precipitationMm / waterNeed);
    if (precipScore < 0.55 && input.stage.waterSensitivity !== 'low') {
      messages.push(
        `${input.stage.label} döneminde yağış / nem sinyali ürün su hassasiyetine göre sınırlıdır.`,
      );
    }

    const score =
      tempScore * 0.4 + precipScore * 0.3 + frostScore * 0.15 + heatScore * 0.15;
    const riskLevel =
      score >= 0.7 ? 'low' : score >= 0.45 ? 'medium' : 'high';

    return {
      stage: input.stage.id,
      label: input.stage.label,
      period: {
        start: period.start.toISOString().slice(0, 10),
        end: period.end.toISOString().slice(0, 10),
      },
      score: Math.round(score * 1000) / 1000,
      riskLevel,
      messages,
      temperatureMeanC: agg.temperatureMeanC,
      precipitationMm: agg.precipitationMm,
      frostDays: agg.frostDays,
      extremeHeatDays: agg.extremeHeatDays,
      components: {
        temperature: Math.round(tempScore * 1000) / 1000,
        precipitation: Math.round(precipScore * 1000) / 1000,
        frost: Math.round(frostScore * 1000) / 1000,
        heat: Math.round(heatScore * 1000) / 1000,
      },
    };
  }
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function monthsCovered(start: Date, end: Date): Set<number> {
  const months = new Set<number>();
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  let guard = 0;
  while (cursor <= endMonth && guard < 24) {
    months.add(cursor.getUTCMonth() + 1);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    guard += 1;
  }
  return months;
}
