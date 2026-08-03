import { randomUUID } from 'node:crypto';
import {
  buildAgroClimateIndicatorCatalog,
  AGROCLIMATE_INDICATOR_SEED,
} from '../catalogs/agroclimate-indicator.catalog.js';
import type { AgroClimateRepository } from '../repositories/agroclimate.repository.js';
import type {
  AgroClimateAnalysis,
  AgroClimateAnalysisRun,
  AgroClimateCalculationConfig,
  AgroClimateIndicatorResult,
  ClimateDataSource,
  ClimateObservation,
  ClimateSourceComparison,
  ConfidenceLevel,
  DailyClimateValue,
  IndicatorCalculationOutcome,
  ParameterCode,
  QualityStatus,
} from '../types/agroclimate.types.js';
import { calculateAllFrostIndicators } from './calculations/frost.calculation.js';
import { calculateAllGrowingSeasonIndicators } from './calculations/gdd.calculation.js';
import { calculateAllHeatwaveIndicators } from './calculations/heatwave.calculation.js';
import { calculateAllPrecipitationIndicators } from './calculations/precipitation.calculation.js';
import { calculateAllDroughtIndicators } from './calculations/drought.calculation.js';
import { calculateAllEt0WaterBalanceIndicators } from './calculations/et0-water-balance.calculation.js';
import {
  buildClimateSourceComparison,
  compareClimateSources,
} from './calculations/source-comparison.calculation.js';
import {
  AgroClimateValidationService,
  type CreateAnalysisRunInput,
  type CreateCalculationConfigInput,
  type CreateClimateDataSourceInput,
  type CreateClimateObservationInput,
  type CreateSourceComparisonInput,
  type UpdateCalculationConfigInput,
} from './agroclimate-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

function throwIfInvalid(issues: { severity: string }[], code: string, message: string) {
  const hard = issues.filter((i) => i.severity === 'error');
  if (hard.length > 0) throw httpError(422, code, message, { issues: hard });
}

/** Calculations use normalized values only — raw-only observations are skipped. */
function preferValue(obs: ClimateObservation): number | null {
  return obs.normalizedValue;
}

function toDailySeries(obs: ClimateObservation[], start: string, end: string): DailyClimateValue[] {
  const byDate = new Map<string, number | null>();
  for (const o of obs) {
    if (o.observationDate < start || o.observationDate > end) continue;
    // Prefer normalized; never invent zero for missing
    const v = preferValue(o);
    if (!byDate.has(o.observationDate) || (byDate.get(o.observationDate) == null && v != null)) {
      byDate.set(o.observationDate, v);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

function confidenceFromCoverage(pct: number | null): ConfidenceLevel {
  if (pct == null) return 'LOW';
  if (pct >= 95) return 'VERY_HIGH';
  if (pct >= 80) return 'HIGH';
  if (pct >= 50) return 'MEDIUM';
  return 'LOW';
}

/**
 * Phase 2.3A — AgroClimate Indicators Engine.
 * No suitability scoring, crop ranking, AI, irrigation scheduling, or yield estimates.
 */
export class AgroClimateService {
  readonly validation: AgroClimateValidationService;

  constructor(private readonly repo: AgroClimateRepository) {
    this.validation = new AgroClimateValidationService(repo);
  }

  // ---- Catalog ----
  listIndicators() {
    return this.repo.listIndicators();
  }
  getIndicator(id: string) {
    return this.repo.getIndicatorById(id);
  }
  getIndicatorByCode(code: string) {
    return this.repo.getIndicatorByCode(code as never);
  }

  // ---- Data sources ----
  listDataSources() {
    return this.repo.listDataSources();
  }

  async createDataSource(input: CreateClimateDataSourceInput): Promise<ClimateDataSource> {
    const now = new Date().toISOString();
    const row: ClimateDataSource = {
      id: newId(),
      code: input.code.trim(),
      name: input.name.trim(),
      provider: input.provider?.trim() || 'UNKNOWN',
      sourceType: input.sourceType,
      spatialResolution: input.spatialResolution ?? null,
      temporalResolution: input.temporalResolution ?? null,
      coverageStartDate: input.coverageStartDate ?? null,
      coverageEndDate: input.coverageEndDate ?? null,
      apiVersion: input.apiVersion ?? null,
      datasetVersion: input.datasetVersion ?? null,
      license: input.license ?? null,
      priority: input.priority ?? null,
      isPrimary: input.isPrimary ?? false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    throwIfInvalid(
      (await this.validation.validateDataSourceUnique(row)).issues,
      'CLIMATE_SOURCE_INVALID',
      'Climate data source invalid',
    );
    return this.repo.upsertDataSource(row);
  }

  // ---- Observations ----
  listObservations(filter?: {
    parcelId?: string;
    dataSourceId?: string;
    parameterCode?: ParameterCode;
    startDate?: string;
    endDate?: string;
  }) {
    return this.repo.listObservations(filter);
  }

  async createObservation(input: CreateClimateObservationInput): Promise<ClimateObservation> {
    const source = await this.repo.getDataSourceById(input.dataSourceId);
    if (!source || !source.isActive) {
      throw httpError(404, 'CLIMATE_SOURCE_NOT_FOUND', 'Climate data source not found');
    }
    // Reject calculation if only raw present without normalization for calc path —
    // storage allows raw-only; calculate() prefers normalized and skips nulls.
    const now = new Date().toISOString();
    const row: ClimateObservation = {
      id: newId(),
      parcelId: input.parcelId.trim(),
      zoneId: input.zoneId ?? null,
      dataSourceId: input.dataSourceId,
      observationDate: input.observationDate,
      observationTime: input.observationTime ?? null,
      parameterCode: input.parameterCode,
      rawValue: input.rawValue ?? null,
      rawUnit: input.rawUnit ?? null,
      normalizedValue: input.normalizedValue ?? null,
      normalizedUnitId: input.normalizedUnitId ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      spatialResolution: input.spatialResolution ?? null,
      temporalResolution: input.temporalResolution ?? null,
      qualityFlag: (input.qualityFlag as ClimateObservation['qualityFlag']) ?? 'RAW',
      missingReason: input.missingReason ?? null,
      sourceRecordId: input.sourceRecordId ?? null,
      datasetVersion: input.datasetVersion ?? null,
      retrievedAt: input.retrievedAt ?? now,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    throwIfInvalid(
      (await this.validation.validateObservation(row)).issues,
      'CLIMATE_OBSERVATION_INVALID',
      'Climate observation invalid',
    );
    return this.repo.upsertObservation(row);
  }

  // ---- Config ----
  listConfigurations(indicatorId?: string) {
    return this.repo.listCalculationConfigs(indicatorId);
  }

  async createConfiguration(
    input: CreateCalculationConfigInput,
  ): Promise<AgroClimateCalculationConfig> {
    const indicator = await this.repo.getIndicatorById(input.indicatorId);
    if (!indicator || !indicator.isActive) {
      throw httpError(404, 'INDICATOR_NOT_FOUND', 'Indicator not found');
    }
    const now = new Date().toISOString();
    const row: AgroClimateCalculationConfig = {
      id: newId(),
      indicatorId: input.indicatorId,
      regionId: input.regionId.trim(),
      cropId: input.cropId ?? null,
      baseTemperature: input.baseTemperature ?? null,
      upperTemperatureLimit: input.upperTemperatureLimit ?? null,
      frostThreshold: input.frostThreshold ?? null,
      severeFrostThreshold: input.severeFrostThreshold ?? null,
      extremeHeatThreshold: input.extremeHeatThreshold ?? null,
      heatwaveMinimumDuration: input.heatwaveMinimumDuration ?? null,
      rainyDayThreshold: input.rainyDayThreshold ?? null,
      heavyRainThreshold: input.heavyRainThreshold ?? null,
      dryDayThreshold: input.dryDayThreshold ?? null,
      calculationPeriodStart: input.calculationPeriodStart ?? null,
      calculationPeriodEnd: input.calculationPeriodEnd ?? null,
      formulaCode: input.formulaCode ?? null,
      formulaVersion: input.formulaVersion ?? indicator.formulaVersion,
      source: input.source ?? null,
      verificationStatus: 'Draft',
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    throwIfInvalid(this.validation.validateConfig(row).issues, 'CONFIG_INVALID', 'Config invalid');
    return this.repo.upsertCalculationConfig(row);
  }

  async updateConfiguration(
    id: string,
    input: UpdateCalculationConfigInput,
  ): Promise<AgroClimateCalculationConfig> {
    const existing = await this.repo.getCalculationConfigById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'CONFIG_NOT_FOUND', 'Configuration not found');
    }
    const next: AgroClimateCalculationConfig = {
      ...existing,
      ...input,
      cropId: input.cropId !== undefined ? input.cropId : existing.cropId,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    throwIfInvalid(this.validation.validateConfig(next).issues, 'CONFIG_INVALID', 'Config invalid');
    return this.repo.upsertCalculationConfig(next);
  }

  async deleteConfiguration(id: string): Promise<AgroClimateCalculationConfig> {
    const existing = await this.repo.getCalculationConfigById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'CONFIG_NOT_FOUND', 'Configuration not found');
    }
    return this.repo.upsertCalculationConfig({
      ...existing,
      isActive: false,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    });
  }

  // ---- Analysis ----
  getAnalysis(id: string) {
    return this.repo.getAgroClimateAnalysisAggregate(id);
  }

  listAnalyses(parcelId?: string) {
    return this.repo.listAnalysisRuns(parcelId);
  }

  async createAnalysis(input: CreateAnalysisRunInput): Promise<AgroClimateAnalysisRun> {
    const periodCheck = this.validation.validateAnalysisPeriod(
      input.analysisPeriodStart,
      input.analysisPeriodEnd,
    );
    throwIfInvalid(periodCheck.issues, 'ANALYSIS_INVALID', 'Analysis period invalid');
    const primary = await this.repo.getDataSourceById(input.primaryDataSourceId);
    if (!primary || !primary.isActive) {
      throw httpError(404, 'CLIMATE_SOURCE_NOT_FOUND', 'Primary data source not found');
    }
    const existing = await this.repo.getAnalysisRunByCode(input.analysisCode.trim());
    if (existing?.isActive) {
      throw httpError(409, 'ANALYSIS_CODE_EXISTS', `Analysis code exists: ${input.analysisCode}`);
    }
    const now = new Date().toISOString();
    const row: AgroClimateAnalysisRun = {
      id: newId(),
      parcelId: input.parcelId.trim(),
      zoneId: input.zoneId ?? null,
      analysisCode: input.analysisCode.trim(),
      analysisPeriodStart: input.analysisPeriodStart,
      analysisPeriodEnd: input.analysisPeriodEnd,
      baselinePeriodStart: input.baselinePeriodStart ?? null,
      baselinePeriodEnd: input.baselinePeriodEnd ?? null,
      primaryDataSourceId: input.primaryDataSourceId,
      secondaryDataSourceId: input.secondaryDataSourceId ?? null,
      status: 'CREATED',
      startedAt: null,
      completedAt: null,
      requestedBy: input.requestedBy ?? null,
      formulaSetVersion: input.formulaSetVersion ?? 'AGROCLIMATE_SET_v1',
      minimumCoverageRequirement: input.minimumCoverageRequirement ?? null,
      actualCoveragePercent: null,
      qualityStatus: null,
      failureReason: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    return this.repo.upsertAnalysisRun(row);
  }

  async validateAnalysis(id: string): Promise<AgroClimateAnalysisRun> {
    const run = await this.requireRun(id);
    const obs = await this.repo.listObservations({
      parcelId: run.parcelId,
      dataSourceId: run.primaryDataSourceId,
      startDate: run.analysisPeriodStart,
      endDate: run.analysisPeriodEnd,
    });
    const now = new Date().toISOString();
    return this.repo.upsertAnalysisRun({
      ...run,
      status: obs.length === 0 ? 'REQUIRES_REVIEW' : 'VALIDATING',
      failureReason: obs.length === 0 ? 'No observations in analysis period' : null,
      updatedAt: now,
      version: run.version + 1,
    });
  }

  async calculateAnalysis(id: string): Promise<AgroClimateAnalysis> {
    return this.runCalculations(id, false);
  }

  async recalculateAnalysis(id: string): Promise<AgroClimateAnalysis> {
    return this.runCalculations(id, true);
  }

  private async runCalculations(id: string, isRecalc: boolean): Promise<AgroClimateAnalysis> {
    let run = await this.requireRun(id);
    const now = new Date().toISOString();
    run = await this.repo.upsertAnalysisRun({
      ...run,
      status: 'CALCULATING',
      startedAt: run.startedAt ?? now,
      updatedAt: now,
      version: run.version + 1,
    });

    const start = run.analysisPeriodStart;
    const end = run.analysisPeriodEnd;
    const allObs = await this.repo.listObservations({
      parcelId: run.parcelId,
      dataSourceId: run.primaryDataSourceId,
      startDate: start,
      endDate: end,
    });

    // Prefer normalized values for calculation; skip days without any numeric value
    const usable = allObs.filter((o) => preferValue(o) != null);
    const tmin = toDailySeries(
      usable.filter((o) => o.parameterCode === 'T2M_MIN'),
      start,
      end,
    );
    const tmax = toDailySeries(
      usable.filter((o) => o.parameterCode === 'T2M_MAX'),
      start,
      end,
    );
    const precip = toDailySeries(
      usable.filter((o) => o.parameterCode === 'PRECIPITATION'),
      start,
      end,
    );
    const et0 = toDailySeries(
      usable.filter((o) => o.parameterCode === 'REFERENCE_ET'),
      start,
      end,
    );

    const configs = await this.repo.listCalculationConfigs(undefined, true);
    const cfg = configs[0] ?? null;

    const frostCfg = {
      frostThreshold: cfg?.frostThreshold ?? null,
      severeFrostThreshold: cfg?.severeFrostThreshold ?? null,
      periodStartDate: start,
      periodEndDate: end,
    };
    const heatCfg = {
      extremeHeatThreshold: cfg?.extremeHeatThreshold ?? null,
      heatwaveMinimumDurationDays: cfg?.heatwaveMinimumDuration ?? null,
      highNightTemperatureThreshold: null,
      periodStartDate: start,
      periodEndDate: end,
    };
    const gddCfg = {
      baseTemperatureC: cfg?.baseTemperature ?? null,
      upperThresholdC: cfg?.upperTemperatureLimit ?? null,
      method: 'SIMPLE_AVERAGE' as const,
      periodStartDate: start,
      periodEndDate: end,
    };
    const precipCfg = {
      rainyDayThreshold: cfg?.rainyDayThreshold ?? null,
      heavyRainThreshold: cfg?.heavyRainThreshold ?? null,
      periodStartDate: start,
      periodEndDate: end,
    };
    const droughtCfg = {
      dryDayThreshold: cfg?.dryDayThreshold ?? null,
      periodStartDate: start,
      periodEndDate: end,
    };
    const et0Cfg = {
      method: (et0.some((d) => d.value != null)
        ? 'SOURCE_PROVIDED'
        : 'NOT_CONFIGURED') as 'SOURCE_PROVIDED' | 'NOT_CONFIGURED',
      latitudeDegrees: null,
      periodStartDate: start,
      periodEndDate: end,
    };

    const outcomes: IndicatorCalculationOutcome[] = [
      ...calculateAllFrostIndicators(tmin, frostCfg),
      ...calculateAllHeatwaveIndicators(tmax, tmin, heatCfg),
      ...calculateAllGrowingSeasonIndicators(tmin, tmax, gddCfg),
      ...calculateAllPrecipitationIndicators(precip, precipCfg),
      ...calculateAllDroughtIndicators(precip, droughtCfg),
      ...calculateAllEt0WaterBalanceIndicators(precip, tmin, tmax, et0, et0Cfg),
    ];

    // Data quality summary
    const expectedDays =
      Math.round(
        (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000,
      ) + 1;
    const knownTmin = tmin.filter((d) => d.value != null).length;
    const coveragePct =
      expectedDays > 0 ? Math.round((knownTmin / expectedDays) * 1000) / 10 : null;

    const indicators = await this.repo.listIndicators(false);
    const byCode = new Map(indicators.map((i) => [i.code, i]));

    for (const outcome of outcomes) {
      const indicator = byCode.get(outcome.indicatorCode);
      if (!indicator) continue;
      const previous = await this.repo.getLatestIndicatorResult(run.id, indicator.id);
      const coveragePctOutcome =
        outcome.coverage?.coverageRatio != null
          ? Math.round(outcome.coverage.coverageRatio * 1000) / 10
          : null;
      const row: AgroClimateIndicatorResult = {
        id: newId(),
        analysisRunId: run.id,
        indicatorId: indicator.id,
        parcelId: run.parcelId,
        zoneId: run.zoneId,
        periodStart: start,
        periodEnd: end,
        calculatedValue: outcome.calculatedValue,
        unitId: outcome.unitId,
        calculationStatus: outcome.calculationStatus,
        formulaCode: outcome.formulaCode,
        formulaVersion: outcome.formulaVersion,
        configurationId: cfg?.id ?? null,
        inputDataCount: outcome.coverage?.knownDays ?? null,
        expectedDataCount: outcome.coverage?.expectedDays ?? null,
        dataCoveragePercent: coveragePctOutcome,
        primarySourceId: run.primaryDataSourceId,
        secondarySourceId: run.secondaryDataSourceId,
        sourceDifferencePercent: null,
        confidenceLevel: confidenceFromCoverage(coveragePctOutcome),
        qualityFlag: null,
        calculationMessage: outcome.calculationMessage,
        inputSummaryJson: JSON.stringify(outcome.inputSummary),
        calculatedAt: now,
        createdAt: now,
        updatedAt: now,
        version: previous ? previous.version + 1 : 1,
        isActive: true,
      };
      // Versioning: always create new row (never overwrite)
      await this.repo.createIndicatorResultVersion(row);
      void isRecalc;
    }

    // Temperature means when data present
    await this.persistSimpleAggregates(run, byCode, tmin, tmax, start, end, now, cfg?.id ?? null);

    let qualityStatus: QualityStatus = 'VALID';
    if (coveragePct == null || coveragePct < 30) qualityStatus = 'INSUFFICIENT';
    else if (coveragePct < 70) qualityStatus = 'LIMITED';
    if (run.minimumCoverageRequirement != null && coveragePct != null) {
      if (coveragePct < run.minimumCoverageRequirement) qualityStatus = 'INSUFFICIENT';
    }

    const calculatedCount = outcomes.filter((o) => o.calculationStatus === 'CALCULATED').length;
    const status =
      calculatedCount === 0
        ? 'FAILED'
        : calculatedCount < outcomes.length
          ? 'PARTIALLY_COMPLETED'
          : 'COMPLETED';

    run = await this.repo.upsertAnalysisRun({
      ...run,
      status,
      completedAt: new Date().toISOString(),
      actualCoveragePercent: coveragePct,
      qualityStatus,
      failureReason: calculatedCount === 0 ? 'No indicators could be calculated' : null,
      updatedAt: new Date().toISOString(),
      version: run.version + 1,
    });

    const aggregate = await this.repo.getAgroClimateAnalysisAggregate(run.id);
    if (!aggregate) throw httpError(500, 'AGGREGATE_MISSING', 'Failed to load analysis aggregate');
    return aggregate;
  }

  private async persistSimpleAggregates(
    run: AgroClimateAnalysisRun,
    byCode: Map<string, { id: string; code: string; formulaVersion: string }>,
    tmin: DailyClimateValue[],
    tmax: DailyClimateValue[],
    start: string,
    end: string,
    now: string,
    configurationId: string | null,
  ) {
    const knownMin = tmin.filter((d) => d.value != null);
    const knownMax = tmax.filter((d) => d.value != null);
    const specs: Array<{ code: string; value: number | null; status: AgroClimateIndicatorResult['calculationStatus']; msg: string | null; known: number; expected: number }> = [];
    const expected =
      Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) +
      1;

    if (knownMin.length && knownMax.length) {
      const paired = knownMin
        .map((mn) => {
          const mx = knownMax.find((x) => x.date === mn.date);
          return mx?.value != null && mn.value != null
            ? { mean: (mn.value + mx.value) / 2, range: mx.value - mn.value }
            : null;
        })
        .filter((x): x is { mean: number; range: number } => x != null);
      if (paired.length) {
        specs.push({
          code: 'MEAN_TEMPERATURE',
          value: paired.reduce((s, p) => s + p.mean, 0) / paired.length,
          status: 'CALCULATED',
          msg: null,
          known: paired.length,
          expected,
        });
        specs.push({
          code: 'TEMPERATURE_RANGE',
          value: paired.reduce((s, p) => s + p.range, 0) / paired.length,
          status: 'CALCULATED',
          msg: null,
          known: paired.length,
          expected,
        });
      }
    }
    if (knownMin.length) {
      specs.push({
        code: 'MINIMUM_TEMPERATURE',
        value: Math.min(...knownMin.map((d) => d.value as number)),
        status: 'CALCULATED',
        msg: null,
        known: knownMin.length,
        expected,
      });
    }
    if (knownMax.length) {
      specs.push({
        code: 'MAXIMUM_TEMPERATURE',
        value: Math.max(...knownMax.map((d) => d.value as number)),
        status: 'CALCULATED',
        msg: null,
        known: knownMax.length,
        expected,
      });
    }

    // Data quality
    specs.push({
      code: 'DATA_COVERAGE_PERCENT',
      value: expected > 0 ? Math.round((knownMin.length / expected) * 1000) / 10 : null,
      status: knownMin.length ? 'CALCULATED' : 'INSUFFICIENT_DATA',
      msg: knownMin.length ? null : 'No T2M_MIN data',
      known: knownMin.length,
      expected,
    });
    specs.push({
      code: 'MISSING_DAY_COUNT',
      value: Math.max(0, expected - knownMin.length),
      status: 'CALCULATED',
      msg: null,
      known: knownMin.length,
      expected,
    });

    for (const s of specs) {
      const indicator = byCode.get(s.code);
      if (!indicator) continue;
      const previous = await this.repo.getLatestIndicatorResult(run.id, indicator.id);
      const cov = s.expected > 0 ? Math.round((s.known / s.expected) * 1000) / 10 : null;
      await this.repo.createIndicatorResultVersion({
        id: newId(),
        analysisRunId: run.id,
        indicatorId: indicator.id,
        parcelId: run.parcelId,
        zoneId: run.zoneId,
        periodStart: start,
        periodEnd: end,
        calculatedValue: s.value,
        unitId: null,
        calculationStatus: s.status,
        formulaCode: s.code,
        formulaVersion: indicator.formulaVersion,
        configurationId,
        inputDataCount: s.known,
        expectedDataCount: s.expected,
        dataCoveragePercent: cov,
        primarySourceId: run.primaryDataSourceId,
        secondarySourceId: run.secondaryDataSourceId,
        sourceDifferencePercent: null,
        confidenceLevel: confidenceFromCoverage(cov),
        qualityFlag: null,
        calculationMessage: s.msg,
        inputSummaryJson: JSON.stringify({ known: s.known, expected: s.expected }),
        calculatedAt: now,
        createdAt: now,
        updatedAt: now,
        version: previous ? previous.version + 1 : 1,
        isActive: true,
      });
    }
  }

  listResults(analysisId: string) {
    return this.repo.listIndicatorResultsByRun(analysisId);
  }

  async listParcelIndicators(parcelId: string, indicatorCode?: string) {
    const runs = await this.repo.listAnalysisRuns(parcelId, true);
    const latest = runs[0];
    if (!latest) return [];
    const results = await this.repo.listIndicatorResultsByRun(latest.id, true);
    if (!indicatorCode) return results;
    const ind = await this.repo.getIndicatorByCode(indicatorCode as never);
    if (!ind) return [];
    return results.filter((r) => r.indicatorId === ind.id);
  }

  // ---- Source comparison ----
  async createSourceComparison(input: CreateSourceComparisonInput): Promise<ClimateSourceComparison> {
    const periodCheck = this.validation.validateAnalysisPeriod(input.periodStart, input.periodEnd);
    throwIfInvalid(periodCheck.issues, 'COMPARISON_INVALID', 'Comparison period invalid');
    const primary = await this.repo.listObservations({
      parcelId: input.parcelId,
      dataSourceId: input.primarySourceId,
      parameterCode: input.parameterCode,
      startDate: input.periodStart,
      endDate: input.periodEnd,
    });
    const secondary = await this.repo.listObservations({
      parcelId: input.parcelId,
      dataSourceId: input.secondarySourceId,
      parameterCode: input.parameterCode,
      startDate: input.periodStart,
      endDate: input.periodEnd,
    });
    const outcome = compareClimateSources({
      parameterCode: input.parameterCode,
      primaryValues: toDailySeries(primary, input.periodStart, input.periodEnd),
      secondaryValues: toDailySeries(secondary, input.periodStart, input.periodEnd),
    });
    const row = buildClimateSourceComparison({
      id: newId(),
      parcelId: input.parcelId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      primarySourceId: input.primarySourceId,
      secondarySourceId: input.secondarySourceId,
      outcome,
      now: new Date().toISOString(),
    });
    return this.repo.upsertSourceComparison(row);
  }

  listSourceComparisons(parcelId: string) {
    return this.repo.listSourceComparisons(parcelId);
  }

  private async requireRun(id: string): Promise<AgroClimateAnalysisRun> {
    const run = await this.repo.getAnalysisRunById(id);
    if (!run || !run.isActive) {
      throw httpError(404, 'ANALYSIS_NOT_FOUND', 'Agroclimate analysis not found');
    }
    return run;
  }
}

export async function seedAgroClimateModule(repo: AgroClimateRepository): Promise<void> {
  const existing = await repo.listIndicators(false);
  if (existing.length > 0) return;
  const now = new Date().toISOString();
  for (const ind of buildAgroClimateIndicatorCatalog(now)) {
    await repo.upsertIndicator(ind);
  }
  void AGROCLIMATE_INDICATOR_SEED;
}
