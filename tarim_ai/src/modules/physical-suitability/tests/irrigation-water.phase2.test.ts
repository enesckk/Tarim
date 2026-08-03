import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPhysicalSuitabilityRepository } from '../repositories/physical-suitability.repository.js';
import { InMemoryCropKnowledgeRepository } from '../crop-knowledge/repositories/crop-knowledge.repository.js';
import { InMemorySoilLaboratoryRepository } from '../soil-laboratory/repositories/soil-laboratory.repository.js';
import { InMemorySoilSamplingRepository } from '../soil-sampling/repositories/soil-sampling.repository.js';
import { InMemoryIrrigationWaterRepository } from '../irrigation-water-laboratory/repositories/irrigation-water.repository.js';
import { seedPhysicalSuitabilityPhase1 } from '../seed/phase1-seed.js';
import { seedCropKnowledgeGeneralInformation } from '../crop-knowledge/seed/general-information.seed.js';
import { seedCropPhenologyEngine } from '../crop-knowledge/phenology/crop-phenology-engine.service.js';
import { seedCropClimateRequirements } from '../crop-knowledge/climate/crop-climate-requirements.service.js';
import { seedCropSoilRequirements } from '../crop-knowledge/soil/crop-soil-requirements.service.js';
import { seedCropWaterRequirements } from '../crop-knowledge/water/crop-water-requirements.service.js';
import { seedCropTerrainRequirements } from '../crop-knowledge/terrain/crop-terrain-requirements.service.js';
import { seedCropRiskProfile } from '../crop-knowledge/risk/crop-risk-profile.service.js';
import { seedCropProductionCalendar } from '../crop-knowledge/calendar/crop-production-calendar.service.js';
import { seedScientificReferenceLibrary } from '../crop-knowledge/references/scientific-reference-library.service.js';
import { seedSoilLaboratoryCore } from '../soil-laboratory/services/soil-laboratory.service.js';
import { seedSoilSamplingManagement } from '../soil-sampling/services/soil-sampling.service.js';
import { seedIrrigationWaterLaboratory } from '../irrigation-water-laboratory/services/irrigation-water.service.js';
import { PhysicalSuitabilityFacade } from '../services/physical-suitability.facade.js';
import {
  calculateRsc,
  calculateSar,
  FORMULA_VERSIONS,
  type IonReading,
} from '../irrigation-water-laboratory/services/water-derived-indicator.calculation.js';
import { unitIdForCode } from '../irrigation-water-laboratory/catalogs/water-measurement-unit.catalog.js';

async function seedAll(
  psRepo: InMemoryPhysicalSuitabilityRepository,
  ckRepo: InMemoryCropKnowledgeRepository,
  labRepo: InMemorySoilLaboratoryRepository,
  samplingRepo: InMemorySoilSamplingRepository,
  waterRepo: InMemoryIrrigationWaterRepository,
) {
  await seedPhysicalSuitabilityPhase1(psRepo);
  await seedCropKnowledgeGeneralInformation(ckRepo, psRepo);
  await seedCropPhenologyEngine(ckRepo);
  await seedCropClimateRequirements(ckRepo);
  await seedCropSoilRequirements(ckRepo);
  await seedCropWaterRequirements(ckRepo);
  await seedCropTerrainRequirements(ckRepo);
  await seedCropRiskProfile(ckRepo);
  await seedCropProductionCalendar(ckRepo);
  await seedScientificReferenceLibrary(ckRepo);
  await seedSoilLaboratoryCore(labRepo);
  await seedSoilSamplingManagement(samplingRepo);
  await seedIrrigationWaterLaboratory(waterRepo);
}

function ion(code: string, meq: number | null): IonReading {
  return {
    parameterCode: code,
    valueMeqL: meq,
    valueMgL: null,
    source: 'measured',
    resultId: 'x',
  };
}

describe('physical-suitability Phase 2.2G Irrigation Water Laboratory', () => {
  let facade: PhysicalSuitabilityFacade;
  let waterRepo: InMemoryIrrigationWaterRepository;

  beforeEach(async () => {
    const psRepo = new InMemoryPhysicalSuitabilityRepository();
    const ckRepo = new InMemoryCropKnowledgeRepository();
    const labRepo = new InMemorySoilLaboratoryRepository();
    const samplingRepo = new InMemorySoilSamplingRepository();
    waterRepo = new InMemoryIrrigationWaterRepository();
    await seedAll(psRepo, ckRepo, labRepo, samplingRepo, waterRepo);
    facade = new PhysicalSuitabilityFacade(
      psRepo,
      ckRepo,
      labRepo,
      samplingRepo,
      waterRepo,
    );
  });

  it('seeds water parameters and units', async () => {
    const params = await facade.listWaterParameters();
    expect(params.length).toBe(24);
    expect(params.find((p) => p.code === 'SAR')?.isCalculated).toBe(true);
    expect(params.find((p) => p.code === 'SODIUM')?.isDirectlyMeasured).toBe(true);
    const units = await waterRepo.listMeasurementUnits();
    expect(units.find((u) => u.code === 'MEQ_PER_L')).toBeTruthy();
  });

  it('rejects duplicate sample codes', async () => {
    const source = await facade.createWaterSource({
      sourceCode: 'WS-1',
      sourceName: 'Well A',
      sourceType: 'WELL',
    });
    await facade.createWaterSample({
      waterSourceId: source.id,
      sampleCode: 'W-001',
    });
    await expect(
      facade.createWaterSample({ waterSourceId: source.id, sampleCode: 'W-001' }),
    ).rejects.toMatchObject({ code: 'WATER_SAMPLE_INVALID' });
  });

  it('rejects negative discharge and well depth', async () => {
    await expect(
      facade.createWaterSource({
        sourceCode: 'WS-NEG',
        sourceName: 'Bad',
        sourceType: 'WELL',
        declaredDischarge: -1,
      }),
    ).rejects.toBeTruthy();
  });

  it('distinguishes null and zero discharge', async () => {
    const a = await facade.createWaterSource({
      sourceCode: 'WS-NULL',
      sourceName: 'Null discharge',
      sourceType: 'WELL',
    });
    expect(a.declaredDischarge).toBeNull();
    const b = await facade.createWaterSource({
      sourceCode: 'WS-ZERO',
      sourceName: 'Zero discharge',
      sourceType: 'WELL',
      declaredDischarge: 0,
    });
    expect(b.declaredDischarge).toBe(0);
  });

  it('preserves raw values on normalize and handles unsupported units', async () => {
    const source = await facade.createWaterSource({
      sourceCode: 'WS-N',
      sourceName: 'N',
      sourceType: 'WELL',
    });
    const sample = await facade.createWaterSample({
      waterSourceId: source.id,
      sampleCode: 'W-NORM',
    });
    const ph = await facade.getWaterParameterByCode('WATER_PH');
    const ntu = unitIdForCode('NTU');
    const result = await facade.createWaterAnalysisResult({
      sampleId: sample.id,
      parameterId: ph!.id,
      rawValue: '7.2',
      rawUnit: 'pH',
      measuredValue: 7.2,
      measuredUnitId: ntu,
    });
    expect(result.rawValue).toBe('7.2');
    expect(result.normalizationStatus).toBe('UNSUPPORTED_UNIT');
    expect(result.measuredValue).toBe(7.2);

    const normalized = await facade.normalizeWaterAnalysisResult({ resultId: result.id });
    expect(normalized.rawValue).toBe('7.2');
    expect(normalized.measuredValue).toBe(7.2);
  });

  it('normalizes EC mS/cm to dS/m', async () => {
    const source = await facade.createWaterSource({
      sourceCode: 'WS-EC',
      sourceName: 'EC',
      sourceType: 'WELL',
    });
    const sample = await facade.createWaterSample({
      waterSourceId: source.id,
      sampleCode: 'W-EC',
    });
    const ec = await facade.getWaterParameterByCode('WATER_EC');
    const result = await facade.createWaterAnalysisResult({
      sampleId: sample.id,
      parameterId: ec!.id,
      rawValue: '1.5',
      rawUnit: 'mS/cm',
      measuredValue: 1.5,
      measuredUnitId: unitIdForCode('MS_PER_CM'),
    });
    expect(result.normalizationStatus).toBe('NORMALIZED');
    expect(result.normalizedValue).toBe(1.5);
    expect(result.rawValue).toBe('1.5');
  });

  it('SAR insufficient data when Ca missing (null ≠ 0)', () => {
    const ions = new Map<string, IonReading>([
      ['SODIUM', ion('SODIUM', 5)],
      ['MAGNESIUM', ion('MAGNESIUM', 2)],
    ]);
    const out = calculateSar(ions);
    expect(out.calculationStatus).toBe('INSUFFICIENT_DATA');
    expect(out.calculatedValue).toBeNull();
    expect(out.formulaVersion).toBe(FORMULA_VERSIONS.SAR);
  });

  it('RSC insufficient data when alkalinity missing', () => {
    const ions = new Map<string, IonReading>([
      ['CALCIUM', ion('CALCIUM', 3)],
      ['MAGNESIUM', ion('MAGNESIUM', 1)],
    ]);
    const out = calculateRsc(ions);
    expect(out.calculationStatus).toBe('INSUFFICIENT_DATA');
  });

  it('calculates SAR/RSC and persists formula version; distinguishes lab vs derived', async () => {
    const source = await facade.createWaterSource({
      sourceCode: 'WS-CALC',
      sourceName: 'Calc',
      sourceType: 'WELL',
    });
    const sample = await facade.createWaterSample({
      waterSourceId: source.id,
      sampleCode: 'W-CALC',
    });
    const meq = unitIdForCode('MEQ_PER_L');
    for (const [code, value] of [
      ['SODIUM', 4],
      ['CALCIUM', 2],
      ['MAGNESIUM', 2],
      ['BICARBONATE', 3],
      ['CARBONATE', 0],
      ['POTASSIUM', 0.5],
      ['CHLORIDE', 3],
      ['SULFATE', 2],
    ] as const) {
      const p = await facade.getWaterParameterByCode(code);
      await facade.createWaterAnalysisResult({
        sampleId: sample.id,
        parameterId: p!.id,
        measuredValue: value,
        measuredUnitId: meq,
        rawValue: String(value),
        rawUnit: 'meq/L',
      });
    }

    // Laboratory-reported SAR (separate from derived)
    const sarParam = await facade.getWaterParameterByCode('SAR');
    const labSar = await facade.createWaterAnalysisResult({
      sampleId: sample.id,
      parameterId: sarParam!.id,
      measuredValue: 9.99,
      measuredUnitId: unitIdForCode('NONE'),
      source: 'LaboratoryReported',
      rawValue: '9.99',
    });
    expect(labSar.measuredValue).toBe(9.99);

    const derived = await facade.calculateWaterIndicators(sample.id);
    const sar = derived.find((d) => d.indicatorCode === 'SAR')!;
    expect(sar.calculationStatus).toBe('CALCULATED');
    expect(sar.formulaVersion).toBe(FORMULA_VERSIONS.SAR);
    expect(sar.calculatedValue).toBeCloseTo(4 / Math.sqrt(2), 5);
    expect(JSON.parse(sar.inputParametersJson).Na_meqL).toBe(4);

    const rsc = derived.find((d) => d.indicatorCode === 'RSC')!;
    expect(rsc.calculationStatus).toBe('CALCULATED');
    expect(rsc.calculatedValue).toBeCloseTo(3 + 0 - (2 + 2), 5);

    const adj = derived.find((d) => d.indicatorCode === 'ADJUSTED_SAR')!;
    expect(adj.calculationStatus).toBe('INSUFFICIENT_DATA');

    // Lab SAR remains untouched
    const results = await facade.listWaterAnalysisResults(sample.id);
    expect(results.find((r) => r.id === labSar.id)?.measuredValue).toBe(9.99);
    expect(derived.every((d) => d.source === 'IrrigationWaterCalculationService')).toBe(true);
  });

  it('rejects non-chronological chain of custody', async () => {
    const source = await facade.createWaterSource({
      sourceCode: 'WS-C',
      sourceName: 'C',
      sourceType: 'WELL',
    });
    const sample = await facade.createWaterSample({
      waterSourceId: source.id,
      sampleCode: 'W-C',
    });
    await facade.createWaterChainOfCustody(sample.id, {
      action: 'COLLECTED',
      performedAt: '2026-07-02T10:00:00.000Z',
    });
    await expect(
      facade.createWaterChainOfCustody(sample.id, {
        action: 'TRANSPORTED',
        performedAt: '2026-07-01T10:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'WATER_CUSTODY_INVALID' });
  });

  it('rejects calculated parameter marked as directly measured', async () => {
    await expect(
      facade.createWaterParameter({
        code: 'CUSTOM_CALC',
        canonicalName: 'Custom',
        turkishDisplayName: 'Özel',
        englishDisplayName: 'Custom',
        category: 'DERIVED',
        isCalculated: true,
        isDirectlyMeasured: true,
      }),
    ).rejects.toMatchObject({ code: 'WATER_PARAMETER_INVALID' });
  });
});
