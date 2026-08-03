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
import { SoilLaboratoryValidationService } from '../soil-laboratory/services/soil-laboratory-validation.service.js';
import type { SoilAnalysisResult } from '../soil-laboratory/types/soil-laboratory.types.js';

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

describe('physical-suitability Phase 2.2A Soil Laboratory Core', () => {
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

  it('seeds empty laboratory infrastructure (catalog units/parameters only)', async () => {
    expect(await facade.listLaboratories()).toHaveLength(0);
    expect(await facade.listAnalysisMethods()).toHaveLength(0);
    expect(await facade.listSoilSamples()).toHaveLength(0);
    expect((await facade.listSoilParameters()).length).toBeGreaterThan(0);
  });

  it('CRUD laboratory and analysis method', async () => {
    const lab = await facade.createLaboratory({
      name: 'Gaziantep Soil Lab',
      country: 'TR',
      city: 'Gaziantep',
    });
    expect(lab.accreditationNumber).toBeNull();

    const method = await facade.createAnalysisMethod({
      code: 'TS-METHOD-1',
      name: 'Generic lab method shell',
      organization: 'TSE',
    });
    expect(method.code).toBe('TS-METHOD-1');

    await expect(
      facade.createAnalysisMethod({ code: 'TS-METHOD-1', name: 'Dup' }),
    ).rejects.toMatchObject({ code: 'ANALYSIS_METHOD_CODE_DUPLICATE' });
  });

  it('creates SoilAnalysis aggregate without inventing measured values', async () => {
    const lab = await facade.createLaboratory({ name: 'Demo Lab', country: 'TR' });
    const sample = await facade.createSoilSample({
      parcelId: 'parcel-1',
      sampleCode: 'S-001',
      laboratoryId: lab.id,
      samplingDepthFromCm: 0,
      samplingDepthToCm: 30,
    });
    expect(sample.samplingDate).toBeNull();

    const result = await facade.createSoilAnalysisResult(sample.id, {
      parameterCode: 'SOIL_PH',
      parameterName: 'Soil pH',
      unit: 'PH_UNIT',
      measuredValue: null,
      rawValue: null,
      rawUnit: 'PH_UNIT',
    });
    expect(result.measuredValue).toBeNull();
    expect(result.rawValue).toBeNull();
    expect(result.qualityFlag).toBe('Unknown');

    const aggregate = await facade.getSoilAnalysis(sample.id);
    expect(aggregate?.parcelId).toBe('parcel-1');
    expect(aggregate?.results).toHaveLength(1);
    expect(aggregate?.laboratory?.id).toBe(lab.id);
  });

  it('rejects invalid depth range and premature approval', async () => {
    await expect(
      facade.createSoilSample({
        parcelId: 'p',
        sampleCode: 'S-DEPTH',
        samplingDepthFromCm: 40,
        samplingDepthToCm: 10,
      }),
    ).rejects.toMatchObject({ code: 'SOIL_SAMPLE_INVALID' });

    const validation = new SoilLaboratoryValidationService(labRepo);
    const row: SoilAnalysisResult = {
      id: 'x',
      sampleId: 'y',
      parameterCode: 'SOIL_PH',
      parameterName: 'Soil pH',
      measuredValue: 1,
      unit: 'PH_UNIT',
      analysisMethodId: null,
      analysisMethod: null,
      detectionLimit: null,
      measurementUncertainty: null,
      qualityFlag: 'Accepted',
      isAccredited: true,
      source: null,
      valueSourceType: 'Measured',
      verificationStatus: 'Approved',
      rawValue: '1',
      rawUnit: 'PH_UNIT',
      normalizedValue: 1,
      normalizedUnitId: null,
      normalizationStatus: 'NORMALIZED',
      normalizationMessage: null,
      originalParameterName: null,
      originalMethodName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      isActive: true,
    };
    expect(validation.validateResult(row).some((i) => i.code === 'PREMATURE_APPROVAL')).toBe(
      true,
    );
  });

  it('rejects duplicate ParameterCode on same sample', async () => {
    const sample = await facade.createSoilSample({
      parcelId: 'p2',
      sampleCode: 'S-DUP',
    });
    await facade.createSoilAnalysisResult(sample.id, {
      parameterCode: 'SOIL_PH',
      parameterName: 'Soil pH',
      unit: 'PH_UNIT',
      rawValue: null,
      rawUnit: 'PH_UNIT',
    });
    await expect(
      facade.createSoilAnalysisResult(sample.id, {
        parameterCode: 'SOIL_PH',
        parameterName: 'Soil pH',
        unit: 'PH_UNIT',
        rawValue: null,
        rawUnit: 'PH_UNIT',
      }),
    ).rejects.toMatchObject({ code: 'PARAMETER_CODE_DUPLICATE' });
  });

  it('PUT versions sample; DELETE soft-deactivates sample and results', async () => {
    const sample = await facade.createSoilSample({
      parcelId: 'p3',
      sampleCode: 'S-VER',
    });
    await facade.createSoilAnalysisResult(sample.id, {
      parameterCode: 'SOIL_EC',
      parameterName: 'EC',
      unit: 'DS_PER_M',
      rawValue: null,
      rawUnit: 'DS_PER_M',
    });
    const updated = await facade.updateSoilSample(sample.id, { notes: 'updated' });
    expect(updated.version).toBe(2);
    expect(updated.notes).toBe('updated');
    expect((await facade.listSoilAnalysisResults(updated.id)).length).toBe(1);

    const deleted = await facade.deleteSoilSample(updated.id);
    expect(deleted.isActive).toBe(false);
    expect(await facade.getSoilAnalysis(updated.id)).toBeNull();
  });

  it('validation warns on empty results but remains valid', async () => {
    const sample = await facade.createSoilSample({
      parcelId: 'p4',
      sampleCode: 'S-VAL',
    });
    const result = await facade.validateSoilSample(sample.id);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === 'RESULTS_EMPTY')).toBe(true);
  });
});
