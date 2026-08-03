import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPhysicalSuitabilityRepository } from '../repositories/physical-suitability.repository.js';
import { InMemoryCropKnowledgeRepository } from '../crop-knowledge/repositories/crop-knowledge.repository.js';
import { InMemorySoilLaboratoryRepository } from '../soil-laboratory/repositories/soil-laboratory.repository.js';
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
import { PhysicalSuitabilityFacade } from '../services/physical-suitability.facade.js';
import { convertMeasurementValue } from '../soil-laboratory/services/unit-conversion.engine.js';
import { SOIL_PARAMETER_SEED } from '../soil-laboratory/catalogs/soil-parameter.catalog.js';
import { MEASUREMENT_UNIT_SEED } from '../soil-laboratory/catalogs/measurement-unit.catalog.js';
import type { SoilParameterOption } from '../soil-laboratory/types/soil-parameter.types.js';

async function seedAll(
  psRepo: InMemoryPhysicalSuitabilityRepository,
  ckRepo: InMemoryCropKnowledgeRepository,
  labRepo: InMemorySoilLaboratoryRepository,
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
}

describe('physical-suitability Phase 2.2C Soil Parameter Catalog', () => {
  let psRepo: InMemoryPhysicalSuitabilityRepository;
  let ckRepo: InMemoryCropKnowledgeRepository;
  let labRepo: InMemorySoilLaboratoryRepository;
  let facade: PhysicalSuitabilityFacade;

  beforeEach(async () => {
    psRepo = new InMemoryPhysicalSuitabilityRepository();
    ckRepo = new InMemoryCropKnowledgeRepository();
    labRepo = new InMemorySoilLaboratoryRepository();
    await seedAll(psRepo, ckRepo, labRepo);
    facade = new PhysicalSuitabilityFacade(psRepo, ckRepo, labRepo);
  });

  it('seeds parameter catalog and units; no enum options; nutrients not required for suitability', async () => {
    const params = await facade.listSoilParameters();
    expect(params.length).toBe(SOIL_PARAMETER_SEED.length);
    const units = await facade.listSoilUnits();
    expect(units.length).toBe(MEASUREMENT_UNIT_SEED.length);

    const nutrient = params.find((p) => p.code === 'TOTAL_NITROGEN');
    expect(nutrient?.isRequiredForPhysicalSuitability).toBe(false);
    expect(nutrient?.verificationStatus).toBe('Draft');

    const texture = params.find((p) => p.code === 'SOIL_TEXTURE_CLASS');
    expect(texture).toBeTruthy();
    const options = await labRepo.listParameterOptions(texture!.id, true);
    expect(options).toHaveLength(0);
  });

  it('enforces parameter code uniqueness and immutability', async () => {
    await expect(
      facade.createSoilParameter({
        code: 'SOIL_PH',
        canonicalName: 'Dup',
        turkishDisplayName: 'Dup',
        englishDisplayName: 'Dup',
        category: 'Chemical',
        dataType: 'Decimal',
        valueType: 'NUMERIC',
      }),
    ).rejects.toMatchObject({ code: 'PARAMETER_CODE_DUPLICATE' });

    const ph = await facade.getSoilParameterByCode('SOIL_PH');
    const updated = await facade.updateSoilParameter(ph!.id, {
      turkishDisplayName: 'Toprak pH (güncel)',
    });
    expect(updated.code).toBe('SOIL_PH');
    expect(updated.turkishDisplayName).toBe('Toprak pH (güncel)');
  });

  it('validates data type / numeric text rejection', async () => {
    const sample = await facade.createSoilSample({
      parcelId: 'p-num',
      sampleCode: 'S-NUM',
    });
    await expect(
      facade.createSoilAnalysisResult(sample.id, {
        parameterCode: 'SOIL_PH',
        rawValue: 'alkaline',
        rawUnit: 'PH_UNIT',
      }),
    ).rejects.toMatchObject({ code: 'SOIL_ANALYSIS_RESULT_INVALID' });
  });

  it('converts mS/cm to dS/m (1:1) and rejects incompatible units', async () => {
    const ok = await facade.convertSoilUnit({
      value: 2.5,
      fromUnit: 'MS_PER_CM',
      toUnit: 'DS_PER_M',
    });
    expect(ok.ok).toBe(true);
    expect(ok.value).toBe(2.5);

    const units = await facade.listSoilUnits();
    const ms = units.find((u) => u.code === 'MS_PER_CM')!;
    const percent = units.find((u) => u.code === 'PERCENT')!;
    const bad = convertMeasurementValue(10, ms, percent);
    expect(bad.ok).toBe(false);
    expect(bad.status).toBe('UNSUPPORTED_UNIT');
  });

  it('preserves raw values and distinguishes null from zero', async () => {
    const sample = await facade.createSoilSample({
      parcelId: 'p-raw',
      sampleCode: 'S-RAW',
    });
    const zero = await facade.createSoilAnalysisResult(sample.id, {
      parameterCode: 'SOIL_PH',
      rawValue: 0,
      rawUnit: 'PH_UNIT',
      valueSourceType: 'Measured',
    });
    expect(zero.rawValue).toBe('0');
    expect(zero.normalizedValue).toBe(0);
    expect(zero.measuredValue).toBe(0);

    const sample2 = await facade.createSoilSample({
      parcelId: 'p-null',
      sampleCode: 'S-NULL',
    });
    const empty = await facade.createSoilAnalysisResult(sample2.id, {
      parameterCode: 'SOIL_EC',
      rawValue: null,
      rawUnit: 'DS_PER_M',
    });
    expect(empty.rawValue).toBeNull();
    expect(empty.normalizedValue).toBeNull();
    expect(empty.measuredValue).toBeNull();
    expect(empty.normalizationStatus).toBe('NOT_REQUIRED');

    const updated = await facade.updateSoilAnalysisResult(zero.id, {
      qualityFlag: 'Accepted',
    });
    expect(updated.rawValue).toBe('0');
  });

  it('handles unsupported / context-dependent units without losing raw', async () => {
    const sample = await facade.createSoilSample({
      parcelId: 'p-u',
      sampleCode: 'S-U',
    });
    const unsupported = await facade.createSoilAnalysisResult(sample.id, {
      parameterCode: 'ORGANIC_MATTER',
      rawValue: 12,
      rawUnit: 'G_PER_KG',
    });
    expect(unsupported.rawValue).toBe('12');
    expect(unsupported.normalizedValue).toBeNull();
    expect(unsupported.normalizationStatus).toBe('REQUIRES_REVIEW');

    const badUnit = await facade.createSoilAnalysisResult(
      (
        await facade.createSoilSample({ parcelId: 'p-u2', sampleCode: 'S-U2' })
      ).id,
      {
        parameterCode: 'SOIL_EC',
        rawValue: 1.2,
        rawUnit: 'banana',
      },
    );
    expect(badUnit.rawValue).toBe('1.2');
    expect(badUnit.normalizationStatus).toBe('UNSUPPORTED_UNIT');
  });

  it('resolves exact aliases and marks ambiguous matches for review', async () => {
    const ph = await facade.getSoilParameterByCode('SOIL_PH');
    const ec = await facade.getSoilParameterByCode('SOIL_EC');
    await facade.createSoilParameterAlias({
      parameterId: ph!.id,
      alias: 'pH (1:2.5)',
      matchType: 'EXACT',
      priority: 10,
    });
    const resolved = await facade.normalizeSoilAnalysisResult({
      originalParameterName: 'pH (1:2.5)',
      rawValue: 7.4,
      rawUnit: 'PH_UNIT',
    });
    expect(resolved.parameter?.code).toBe('SOIL_PH');
    expect(resolved.normalizationStatus).toBe('NORMALIZED');

    await facade.createSoilParameterAlias({
      parameterId: ph!.id,
      alias: 'EC',
      matchType: 'EXACT',
    });
    await facade.createSoilParameterAlias({
      parameterId: ec!.id,
      alias: 'EC',
      matchType: 'EXACT',
    });
    const ambiguous = await facade.normalizeSoilAnalysisResult({
      originalParameterName: 'EC',
      rawValue: 1,
      rawUnit: 'DS_PER_M',
    });
    expect(ambiguous.normalizationStatus).toBe('REQUIRES_REVIEW');
  });

  it('rejects enum values when options exist; empty options require review', async () => {
    const texture = await facade.getSoilParameterByCode('SOIL_TEXTURE_CLASS');
    const empty = await facade.normalizeSoilAnalysisResult({
      parameterCode: 'SOIL_TEXTURE_CLASS',
      rawValue: 'ClayLoam',
      rawUnit: 'NONE',
    });
    expect(empty.normalizationStatus).toBe('REQUIRES_REVIEW');

    const now = new Date().toISOString();
    const option: SoilParameterOption = {
      id: 'opt-1',
      parameterId: texture!.id,
      code: 'CL',
      turkishLabel: 'Killi tın',
      englishLabel: 'Clay loam',
      displayOrder: 1,
      source: null,
      verificationStatus: 'Draft',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await labRepo.upsertParameterOption(option);

    const sample = await facade.createSoilSample({
      parcelId: 'p-enum',
      sampleCode: 'S-ENUM',
    });
    await expect(
      facade.createSoilAnalysisResult(sample.id, {
        parameterCode: 'SOIL_TEXTURE_CLASS',
        rawValue: 'NOT_A_CLASS',
        rawUnit: 'NONE',
      }),
    ).rejects.toMatchObject({ code: 'SOIL_ANALYSIS_RESULT_INVALID' });

    const ok = await facade.createSoilAnalysisResult(sample.id, {
      parameterCode: 'SOIL_TEXTURE_CLASS',
      rawValue: 'CL',
      rawUnit: 'NONE',
    });
    expect(ok.normalizationStatus).toBe('NORMALIZED');
    expect(ok.rawValue).toBe('CL');
  });

  it('normalizes laboratory EC from mS/cm into canonical dS/m', async () => {
    const sample = await facade.createSoilSample({
      parcelId: 'p-ec',
      sampleCode: 'S-EC',
    });
    const result = await facade.createSoilAnalysisResult(sample.id, {
      parameterCode: 'SOIL_EC',
      rawValue: 3.1,
      rawUnit: 'mS/cm',
      valueSourceType: 'Measured',
    });
    expect(result.rawUnit).toBe('mS/cm');
    expect(result.normalizedValue).toBe(3.1);
    expect(result.unit).toBe('DS_PER_M');
    expect(result.normalizationStatus).toBe('NORMALIZED');
  });
});
