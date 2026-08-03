import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAgroClimateRepository } from '../agroclimate/repositories/agroclimate.repository.js';
import {
  AgroClimateService,
  seedAgroClimateModule,
} from '../agroclimate/services/agroclimate.service.js';
import { calculateFrostDayCount, groupFrostEvents, calculateFrostFreePeriodDays } from '../agroclimate/services/calculations/frost.calculation.js';
import { calculateGdd } from '../agroclimate/services/calculations/gdd.calculation.js';
import { groupHeatEvents, calculateHeatwaveEventCount } from '../agroclimate/services/calculations/heatwave.calculation.js';
import { groupDrySpells, calculateConsecutiveDryDays } from '../agroclimate/services/calculations/drought.calculation.js';
import { calculateAllEt0WaterBalanceIndicators } from '../agroclimate/services/calculations/et0-water-balance.calculation.js';
import { compareClimateSources } from '../agroclimate/services/calculations/source-comparison.calculation.js';
import type { DailyClimateValue } from '../agroclimate/types/agroclimate.types.js';

function days(n: number, start = '2024-01-01'): DailyClimateValue[] {
  const out: DailyClimateValue[] = [];
  const base = Date.parse(`${start}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    const date = new Date(base + i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date, value: null });
  }
  return out;
}

describe('agroclimate phase 2.3A unit', () => {
  let repo: InMemoryAgroClimateRepository;
  let service: AgroClimateService;

  beforeEach(async () => {
    repo = new InMemoryAgroClimateRepository();
    await seedAgroClimateModule(repo);
    service = new AgroClimateService(repo);
  });

  it('seeds 58 draft indicators', async () => {
    const items = await service.listIndicators();
    expect(items).toHaveLength(58);
    expect(items.every((i) => i.verificationStatus === 'Draft')).toBe(true);
  });

  it('enforces climate data source uniqueness', async () => {
    await service.createDataSource({
      code: 'NASA-1',
      name: 'NASA POWER',
      sourceType: 'NASA_POWER',
      provider: 'NASA',
    });
    await expect(
      service.createDataSource({
        code: 'NASA-1',
        name: 'Dup',
        sourceType: 'NASA_POWER',
        provider: 'NASA',
      }),
    ).rejects.toMatchObject({ code: 'CLIMATE_SOURCE_INVALID' });
  });

  it('preserves raw value and distinguishes null from zero', async () => {
    const src = await service.createDataSource({
      code: 'SRC-A',
      name: 'A',
      sourceType: 'MANUAL_IMPORT',
      provider: 'lab',
    });
    const zero = await service.createObservation({
      parcelId: 'p1',
      dataSourceId: src.id,
      observationDate: '2024-01-01',
      parameterCode: 'PRECIPITATION',
      rawValue: 0,
      normalizedValue: 0,
      qualityFlag: 'RAW',
    });
    expect(zero.rawValue).toBe(0);
    expect(zero.normalizedValue).toBe(0);

    const missing = await service.createObservation({
      parcelId: 'p1',
      dataSourceId: src.id,
      observationDate: '2024-01-02',
      parameterCode: 'PRECIPITATION',
      rawValue: null,
      normalizedValue: null,
      missingReason: 'gap',
      qualityFlag: 'MISSING',
    });
    expect(missing.rawValue).toBeNull();
    expect(missing.normalizedValue).toBeNull();
  });

  it('rejects duplicate observations', async () => {
    const src = await service.createDataSource({
      code: 'SRC-DUP',
      name: 'D',
      sourceType: 'WEATHER_STATION',
      provider: 'met',
    });
    const body = {
      parcelId: 'p1',
      dataSourceId: src.id,
      observationDate: '2024-03-01',
      parameterCode: 'T2M_MIN' as const,
      normalizedValue: 2,
      rawValue: 2,
    };
    await service.createObservation(body);
    await expect(service.createObservation(body)).rejects.toMatchObject({
      code: 'CLIMATE_OBSERVATION_INVALID',
    });
  });

  it('frost threshold missing → INSUFFICIENT_DATA', () => {
    const series = days(5).map((d, i) => ({ ...d, value: -1 - i }));
    const out = calculateFrostDayCount(series, {
      frostThreshold: null,
      severeFrostThreshold: null,
      periodStartDate: '2024-01-01',
      periodEndDate: '2024-01-05',
    });
    expect(out.calculationStatus).toBe('INSUFFICIENT_DATA');
    expect(out.calculatedValue).toBeNull();
  });

  it('groups frost events and computes frost-free period', () => {
    const series: DailyClimateValue[] = [
      { date: '2024-01-01', value: -2 },
      { date: '2024-01-02', value: -1 },
      { date: '2024-01-03', value: 5 },
      { date: '2024-01-04', value: -3 },
    ];
    const events = groupFrostEvents(series, 0);
    expect(events).toHaveLength(2);
    expect(events[0].durationDays).toBe(2);

    const free = calculateFrostFreePeriodDays(
      [
        { date: '2024-03-01', value: -1 },
        { date: '2024-03-15', value: 2 },
        { date: '2024-10-01', value: 1 },
        { date: '2024-10-20', value: -2 },
      ],
      {
        frostThreshold: 0,
        severeFrostThreshold: -5,
        periodStartDate: '2024-01-01',
        periodEndDate: '2024-12-31',
      },
    );
    expect(free.calculationStatus).toBe('CALCULATED');
    expect(free.calculatedValue).toBeGreaterThan(0);
  });

  it('calculates GDD simple average and skips missing days', () => {
    const tmin: DailyClimateValue[] = [
      { date: '2024-06-01', value: 10 },
      { date: '2024-06-02', value: null },
      { date: '2024-06-03', value: 12 },
    ];
    const tmax: DailyClimateValue[] = [
      { date: '2024-06-01', value: 20 },
      { date: '2024-06-02', value: 22 },
      { date: '2024-06-03', value: 24 },
    ];
    const out = calculateGdd(tmin, tmax, {
      method: 'SIMPLE_AVERAGE',
      baseTemperatureC: 10,
      upperThresholdC: null,
      periodStartDate: '2024-06-01',
      periodEndDate: '2024-06-03',
    });
    expect(out.calculationStatus).toBe('CALCULATED');
    // day1: (10+20)/2-10 = 5; day2 skipped; day3: (12+24)/2-10 = 8 → 13
    expect(out.calculatedValue).toBe(13);
    expect(out.coverage?.knownDays).toBe(2);
  });

  it('groups heatwave events when thresholds present', () => {
    const series: DailyClimateValue[] = [
      { date: '2024-07-01', value: 36 },
      { date: '2024-07-02', value: 37 },
      { date: '2024-07-03', value: 30 },
      { date: '2024-07-04', value: 38 },
      { date: '2024-07-05', value: 39 },
      { date: '2024-07-06', value: 40 },
    ];
    expect(groupHeatEvents(series, 35)).toHaveLength(2);
    const count = calculateHeatwaveEventCount(series, {
      extremeHeatThreshold: 35,
      heatwaveMinimumDurationDays: 2,
      highNightTemperatureThreshold: null,
      periodStartDate: '2024-07-01',
      periodEndDate: '2024-07-06',
    });
    expect(count.calculatedValue).toBe(2);
  });

  it('dry spell ignores missing precipitation (not dry)', () => {
    const precip: DailyClimateValue[] = [
      { date: '2024-08-01', value: 0 },
      { date: '2024-08-02', value: 0 },
      { date: '2024-08-03', value: null },
      { date: '2024-08-04', value: 0 },
    ];
    const spells = groupDrySpells(precip, 1);
    expect(spells).toHaveLength(2);
    expect(spells[0].durationDays).toBe(2);
    expect(spells[1].durationDays).toBe(1);

    const consecutive = calculateConsecutiveDryDays(precip, {
      dryDayThreshold: 1,
      periodStartDate: '2024-08-01',
      periodEndDate: '2024-08-04',
    });
    expect(consecutive.calculatedValue).toBe(2);
  });

  it('source-provided ET0 and water deficit', () => {
    const precip = [
      { date: '2024-05-01', value: 2 },
      { date: '2024-05-02', value: 1 },
    ];
    const et0 = [
      { date: '2024-05-01', value: 5 },
      { date: '2024-05-02', value: 4 },
    ];
    const tmin = [
      { date: '2024-05-01', value: 10 },
      { date: '2024-05-02', value: 11 },
    ];
    const tmax = [
      { date: '2024-05-01', value: 22 },
      { date: '2024-05-02', value: 23 },
    ];
    const outs = calculateAllEt0WaterBalanceIndicators(precip, tmin, tmax, et0, {
      method: 'SOURCE_PROVIDED',
      latitudeDegrees: null,
      periodStartDate: '2024-05-01',
      periodEndDate: '2024-05-02',
    });
    const et0Out = outs.find((o) => o.indicatorCode === 'REFERENCE_EVAPOTRANSPIRATION');
    const deficit = outs.find((o) => o.indicatorCode === 'CLIMATIC_WATER_DEFICIT');
    expect(et0Out?.calculationStatus).toBe('CALCULATED');
    expect(et0Out?.calculatedValue).toBe(9);
    expect(deficit?.calculationStatus).toBe('CALCULATED');
    expect(deficit?.calculatedValue).toBe(6);
  });

  it('source comparison insufficient data and analysis versioning', async () => {
    const cmp = compareClimateSources({
      parameterCode: 'T2M_MIN',
      primaryValues: [{ date: '2024-01-01', value: 1 }],
      secondaryValues: [],
    });
    expect(cmp.comparisonStatus).toBe('INSUFFICIENT_DATA');

    const src = await service.createDataSource({
      code: 'SRC-V',
      name: 'V',
      sourceType: 'ERA5_LAND',
      provider: 'ECMWF',
    });
    for (let i = 1; i <= 5; i++) {
      const d = `2024-01-0${i}`;
      await service.createObservation({
        parcelId: 'p-v',
        dataSourceId: src.id,
        observationDate: d,
        parameterCode: 'T2M_MIN',
        normalizedValue: -1,
        rawValue: -1,
      });
      await service.createObservation({
        parcelId: 'p-v',
        dataSourceId: src.id,
        observationDate: d,
        parameterCode: 'T2M_MAX',
        normalizedValue: 10,
        rawValue: 10,
      });
    }
    const frostInd = await service.getIndicatorByCode('FROST_DAY_COUNT');
    expect(frostInd).toBeTruthy();
    await service.createConfiguration({
      indicatorId: frostInd!.id,
      regionId: 'TR-27',
      frostThreshold: 0,
      severeFrostThreshold: -5,
      baseTemperature: 10,
      extremeHeatThreshold: 35,
      heatwaveMinimumDuration: 3,
      rainyDayThreshold: 1,
      heavyRainThreshold: 20,
      dryDayThreshold: 1,
    });

    const run = await service.createAnalysis({
      parcelId: 'p-v',
      analysisCode: 'AC-V1',
      analysisPeriodStart: '2024-01-01',
      analysisPeriodEnd: '2024-01-05',
      primaryDataSourceId: src.id,
      minimumCoverageRequirement: 50,
    });
    const first = await service.calculateAnalysis(run.id);
    expect(first.run.qualityStatus).toBeTruthy();
    expect(first.run.formulaSetVersion).toBeTruthy();
    const frost1 = first.results.find((r) => r.indicatorId === frostInd!.id);
    expect(frost1?.formulaVersion).toBeTruthy();
    expect(frost1?.version).toBe(1);

    const second = await service.recalculateAnalysis(run.id);
    const frost2 = second.results.find((r) => r.indicatorId === frostInd!.id);
    expect(frost2?.version).toBe(2);
    const versions = await repo.listIndicatorResultVersions(run.id, frostInd!.id);
    expect(versions.length).toBeGreaterThanOrEqual(2);
  });

  it('does not use raw-only values in calculation', async () => {
    const src = await service.createDataSource({
      code: 'SRC-RAW',
      name: 'R',
      sourceType: 'MANUAL_IMPORT',
      provider: 'x',
    });
    await service.createObservation({
      parcelId: 'p-raw',
      dataSourceId: src.id,
      observationDate: '2024-02-01',
      parameterCode: 'T2M_MIN',
      rawValue: -10,
      normalizedValue: null,
    });
    const frostInd = await service.getIndicatorByCode('FROST_DAY_COUNT');
    await service.createConfiguration({
      indicatorId: frostInd!.id,
      regionId: 'TR-27',
      frostThreshold: 0,
    });
    const run = await service.createAnalysis({
      parcelId: 'p-raw',
      analysisCode: 'AC-RAW',
      analysisPeriodStart: '2024-02-01',
      analysisPeriodEnd: '2024-02-01',
      primaryDataSourceId: src.id,
    });
    const agg = await service.calculateAnalysis(run.id);
    const frostResult = agg.results.find((r) => r.indicatorId === frostInd!.id);
    expect(frostResult?.calculatedValue).toBeNull();
    expect(frostResult?.calculationStatus).not.toBe('CALCULATED');
  });
});
