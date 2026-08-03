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
import { IMPORT_PIPELINE_STAGES } from '../soil-laboratory/types/laboratory-import.types.js';

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

describe('physical-suitability Phase 2.2E Laboratory Import Engine', () => {
  let psRepo: InMemoryPhysicalSuitabilityRepository;
  let ckRepo: InMemoryCropKnowledgeRepository;
  let labRepo: InMemorySoilLaboratoryRepository;
  let facade: PhysicalSuitabilityFacade;
  let laboratoryId: string;

  beforeEach(async () => {
    psRepo = new InMemoryPhysicalSuitabilityRepository();
    ckRepo = new InMemoryCropKnowledgeRepository();
    labRepo = new InMemorySoilLaboratoryRepository();
    await seedAll(psRepo, ckRepo, labRepo);
    facade = new PhysicalSuitabilityFacade(psRepo, ckRepo, labRepo);
    laboratoryId = (await facade.createLaboratory({ name: 'Import Lab', country: 'TR' })).id;
  });

  it('seeds no import sessions and exposes full pipeline stages', async () => {
    expect(await facade.listLaboratoryImportSessions()).toHaveLength(0);
    expect([...IMPORT_PIPELINE_STAGES]).toEqual([
      'Upload',
      'StructureValidation',
      'ParameterMapping',
      'UnitMapping',
      'Normalization',
      'Validation',
      'Preview',
      'Import',
    ]);
  });

  it('upload creates session+file and moves status to UPLOADED', async () => {
    const aggregate = await facade.uploadLaboratoryImport({
      laboratoryId,
      importType: 'CSV',
      originalFileName: 'results.csv',
      fileType: 'text/csv',
      delimiter: ',',
      declaredColumns: ['SampleCode', 'pH'],
    });
    expect(aggregate.session.importStatus).toBe('UPLOADED');
    expect(aggregate.files).toHaveLength(1);
    expect(aggregate.pipeline).toHaveLength(8);
  });

  it('rejects upload without laboratory', async () => {
    await expect(
      facade.uploadLaboratoryImport({
        laboratoryId: '00000000-0000-4000-8000-000000000099',
        importType: 'CSV',
        originalFileName: 'x.csv',
        fileType: 'text/csv',
      }),
    ).rejects.toMatchObject({ code: 'MISSING_LABORATORY' });
  });

  it('validate detects missing columns and unknown parameters', async () => {
    const uploaded = await facade.uploadLaboratoryImport({
      laboratoryId,
      importType: 'EXCEL',
      originalFileName: 'lab.xlsx',
      fileType: 'application/vnd.ms-excel',
    });

    const validated = await facade.validateLaboratoryImport(uploaded.sessionId, {
      declaredColumns: ['pH'],
      requiredColumns: ['SampleCode', 'pH'],
      externalParameters: [{ name: 'MysteryParam', unit: 'xyz' }],
      sampleCodes: [{ row: 1, sampleCode: null }],
      rowFingerprints: ['a', 'a'],
      cellSamples: [
        { row: 2, column: 'pH', value: 'not-a-number', expect: 'number' },
        { row: 3, column: 'Date', value: 'not-a-date', expect: 'date' },
      ],
    });

    const rules = new Set(validated.validations.map((v) => v.ruleName));
    expect(rules.has('MISSING_COLUMN')).toBe(true);
    expect(rules.has('UNKNOWN_PARAMETER')).toBe(true);
    expect(rules.has('MISSING_SAMPLE_CODE')).toBe(true);
    expect(rules.has('DUPLICATE_ROW')).toBe(true);
    expect(rules.has('INVALID_NUMBER_FORMAT')).toBe(true);
    expect(rules.has('INVALID_DATE_FORMAT')).toBe(true);
    expect(validated.session.importStatus).toBe('FAILED');
  });

  it('mapping + validate passes known parameter/unit', async () => {
    await facade.createLaboratoryImportMapping({
      laboratoryId,
      externalParameterName: 'pH (H2O)',
      externalUnit: 'pH',
      internalParameterCode: 'SOIL_PH',
      internalUnit: 'PH_UNIT',
    });

    const uploaded = await facade.uploadLaboratoryImport({
      laboratoryId,
      importType: 'JSON',
      originalFileName: 'data.json',
      fileType: 'application/json',
    });

    const validated = await facade.validateLaboratoryImport(uploaded.sessionId, {
      declaredColumns: ['SampleCode', 'pH (H2O)'],
      requiredColumns: ['SampleCode'],
      externalParameters: [{ name: 'pH (H2O)', unit: 'PH_UNIT' }],
      sampleCodes: [{ row: 1, sampleCode: 'S-1' }],
    });

    const unknownFails = validated.validations.filter(
      (v) => v.ruleName === 'UNKNOWN_PARAMETER' && v.result === 'FAIL',
    );
    expect(unknownFails).toHaveLength(0);
    expect(validated.session.importStatus).not.toBe('FAILED');
  });

  it('preview returns empty sampleRows; stub import does not create analysis results', async () => {
    const uploaded = await facade.uploadLaboratoryImport({
      laboratoryId,
      importType: 'MANUAL',
      originalFileName: 'manual.json',
      fileType: 'application/json',
    });
    await facade.validateLaboratoryImport(uploaded.sessionId, {
      declaredColumns: ['SampleCode'],
      requiredColumns: ['SampleCode'],
      sampleCodes: [{ row: 1, sampleCode: 'OK' }],
    });

    const preview = await facade.previewLaboratoryImport(uploaded.sessionId);
    expect(preview.pipelineStage).toBe('Preview');
    expect(preview.sampleRows).toEqual([]);

    const committed = await facade.commitLaboratoryImport(uploaded.sessionId, {
      confirm: true,
    });
    expect(committed.session.importStatus).toBe('COMPLETED');
    expect(committed.session.successfulRows).toBe(0);
    expect(await labRepo.listSamples(false)).toHaveLength(0);
  });

  it('blocks stub import after failed validation', async () => {
    const uploaded = await facade.uploadLaboratoryImport({
      laboratoryId,
      importType: 'CSV',
      originalFileName: 'bad.csv',
      fileType: 'text/csv',
    });
    await facade.validateLaboratoryImport(uploaded.sessionId, {
      declaredColumns: [],
      requiredColumns: ['SampleCode'],
      sampleCodes: [{ row: 1, sampleCode: null }],
    });
    await expect(
      facade.commitLaboratoryImport(uploaded.sessionId, { confirm: true }),
    ).rejects.toMatchObject({ code: 'IMPORT_BLOCKED' });
  });
});
