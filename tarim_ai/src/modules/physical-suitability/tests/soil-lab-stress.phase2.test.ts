import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { InMemoryPhysicalSuitabilityRepository } from '../repositories/physical-suitability.repository.js';
import { InMemoryCropKnowledgeRepository } from '../crop-knowledge/repositories/crop-knowledge.repository.js';
import { InMemorySoilLaboratoryRepository } from '../soil-laboratory/repositories/soil-laboratory.repository.js';
import { InMemorySoilSamplingRepository } from '../soil-sampling/repositories/soil-sampling.repository.js';
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
import { PhysicalSuitabilityFacade } from '../services/physical-suitability.facade.js';
import { SOIL_PARAMETER_SEED } from '../soil-laboratory/catalogs/soil-parameter.catalog.js';
import { MEASUREMENT_UNIT_SEED } from '../soil-laboratory/catalogs/measurement-unit.catalog.js';

async function seedAll(
  psRepo: InMemoryPhysicalSuitabilityRepository,
  ckRepo: InMemoryCropKnowledgeRepository,
  labRepo: InMemorySoilLaboratoryRepository,
  samplingRepo: InMemorySoilSamplingRepository,
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
}

describe('physical-suitability stress / edge cases (2.2A–F)', () => {
  let facade: PhysicalSuitabilityFacade;
  let labRepo: InMemorySoilLaboratoryRepository;
  let samplingRepo: InMemorySoilSamplingRepository;

  beforeEach(async () => {
    const psRepo = new InMemoryPhysicalSuitabilityRepository();
    const ckRepo = new InMemoryCropKnowledgeRepository();
    labRepo = new InMemorySoilLaboratoryRepository();
    samplingRepo = new InMemorySoilSamplingRepository();
    await seedAll(psRepo, ckRepo, labRepo, samplingRepo);
    facade = new PhysicalSuitabilityFacade(psRepo, ckRepo, labRepo, samplingRepo);
  });

  it('catalog seed is complete and nutrients are not required for suitability', async () => {
    const params = await facade.listSoilParameters();
    const units = await facade.listSoilUnits();
    expect(params).toHaveLength(SOIL_PARAMETER_SEED.length);
    expect(units).toHaveLength(MEASUREMENT_UNIT_SEED.length);
    expect(params.filter((p) => p.category === 'Nutrient').every((p) => !p.isRequiredForPhysicalSuitability)).toBe(
      true,
    );
    expect(params.every((p) => p.verificationStatus === 'Draft')).toBe(true);
  });

  it('lab report soft-delete allows report number reuse and blocks active hash reuse', async () => {
    const lab = await facade.createLaboratory({ name: 'Stress Lab' });
    const hash = createHash('sha256').update('stress-bytes').digest('hex');
    const report = await facade.createLaboratoryReport({
      reportNumber: 'R-STRESS',
      laboratoryId: lab.id,
      fileHash: hash,
    });
    await facade.deleteLaboratoryReport(report.id);

    const reused = await facade.createLaboratoryReport({
      reportNumber: 'R-STRESS',
      laboratoryId: lab.id,
      fileHash: hash,
    });
    expect(reused.isActive).toBe(true);
    expect(reused.id).not.toBe(report.id);

    await expect(
      facade.createLaboratoryReport({
        reportNumber: 'R-STRESS-2',
        laboratoryId: lab.id,
        fileHash: hash,
      }),
    ).rejects.toMatchObject({ code: 'LABORATORY_REPORT_INVALID' });
  });

  it('EC mS/cm → dS/m normalize preserves raw and sets NORMALIZED', async () => {
    const lab = await facade.createLaboratory({ name: 'EC Lab' });
    const sample = await facade.createSoilSample({
      parcelId: 'parcel-1',
      sampleCode: 'LAB-EC-1',
      laboratoryId: lab.id,
    });
    const result = await facade.createSoilAnalysisResult(sample.id, {
      parameterCode: 'SOIL_EC',
      parameterName: 'EC',
      measuredValue: 2.5,
      unit: 'mS/cm',
      rawValue: 2.5,
      rawUnit: 'mS/cm',
    });
    expect(result.rawValue).toBe('2.5');
    expect(result.rawUnit).toBe('mS/cm');
    expect(result.normalizedValue).toBe(2.5);
    expect(result.normalizationStatus).toBe('NORMALIZED');
  });

  it('import engine: failed validation blocks commit; clean path completes with 0 rows', async () => {
    const lab = await facade.createLaboratory({ name: 'Import Lab' });
    const bad = await facade.uploadLaboratoryImport({
      laboratoryId: lab.id,
      importType: 'CSV',
      originalFileName: 'bad.csv',
      fileType: 'text/csv',
    });
    await facade.validateLaboratoryImport(bad.sessionId, {
      declaredColumns: [],
      requiredColumns: ['SampleCode'],
      sampleCodes: [{ row: 1, sampleCode: null }],
    });
    await expect(
      facade.commitLaboratoryImport(bad.sessionId, { confirm: true }),
    ).rejects.toMatchObject({ code: 'IMPORT_BLOCKED' });

    await facade.createLaboratoryImportMapping({
      laboratoryId: lab.id,
      externalParameterName: 'pH',
      internalParameterCode: 'SOIL_PH',
      internalUnit: 'PH_UNIT',
    });
    const good = await facade.uploadLaboratoryImport({
      laboratoryId: lab.id,
      importType: 'JSON',
      originalFileName: 'ok.json',
      fileType: 'application/json',
    });
    await facade.validateLaboratoryImport(good.sessionId, {
      declaredColumns: ['SampleCode', 'pH'],
      requiredColumns: ['SampleCode'],
      externalParameters: [{ name: 'pH', unit: 'PH_UNIT' }],
      sampleCodes: [{ row: 1, sampleCode: 'S1' }],
    });
    const preview = await facade.previewLaboratoryImport(good.sessionId);
    expect(preview.sampleRows).toEqual([]);
    const committed = await facade.commitLaboratoryImport(good.sessionId, { confirm: true });
    expect(committed.session.importStatus).toBe('COMPLETED');
    expect(committed.session.successfulRows).toBe(0);
    expect(await labRepo.listSamples(true)).toHaveLength(0);
  });

  it('sampling: depth range, cancelled campaign, custody chronology, point with samples', async () => {
    const campaign = await facade.createSamplingCampaign({
      campaignCode: 'ST-CMP',
      campaignName: 'Stress',
    });

    await expect(
      facade.createSamplingPoint({
        campaignId: campaign.id,
        pointCode: 'BAD-DEPTH',
        latitude: 37,
        longitude: 37,
        samplingDepthFrom: 40,
        samplingDepthTo: 10,
      }),
    ).rejects.toMatchObject({ code: 'SAMPLING_POINT_INVALID' });

    const point = await facade.createSamplingPoint({
      campaignId: campaign.id,
      pointCode: 'P1',
      latitude: 37.2,
      longitude: 37.3,
      samplingDepthFrom: 0,
      samplingDepthTo: 30,
    });

    const sample = await facade.createSamplingSample({
      samplingPointId: point.id,
      sampleCode: 'ST-S1',
      sampleType: 'COMPOSITE',
      collectionDate: '2026-07-15T08:00:00.000Z',
      collectedBy: 'Tech',
    });

    await expect(facade.deleteSamplingPoint(point.id)).rejects.toMatchObject({
      code: 'SAMPLING_POINT_HAS_SAMPLES',
    });

    const c2 = await facade.createSamplingCampaign({
      campaignCode: 'ST-CMP-2',
      campaignName: 'Other',
    });
    await expect(
      facade.updateSamplingPoint(point.id, { campaignId: c2.id }),
    ).rejects.toMatchObject({ code: 'SAMPLE_CAMPAIGN_REASSIGN_FORBIDDEN' });

    await facade.createChainOfCustody({
      sampleId: sample.id,
      action: 'PACKAGED',
      performedDate: '2026-07-15T09:00:00.000Z',
    });
    await expect(
      facade.createChainOfCustody({
        sampleId: sample.id,
        action: 'TRANSPORTED',
        performedDate: '2026-07-15T08:30:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'CHAIN_OF_CUSTODY_INVALID' });

    await facade.deleteSamplingCampaign(campaign.id);
    await expect(
      facade.createSamplingPoint({
        campaignId: campaign.id,
        pointCode: 'P2',
        latitude: 37,
        longitude: 37,
      }),
    ).rejects.toMatchObject({ code: 'SAMPLING_POINT_INVALID' });

    // Cancelled campaign code can be reused
    const reused = await facade.createSamplingCampaign({
      campaignCode: 'ST-CMP',
      campaignName: 'Reused',
    });
    expect(reused.status).toBe('PLANNED');
    expect(reused.id).not.toBe(campaign.id);
  });

  it('lab SoilSample and field SamplingSoilSample are independent namespaces', async () => {
    const lab = await facade.createLaboratory({ name: 'Dual Lab' });
    const labSample = await facade.createSoilSample({
      parcelId: 'p-1',
      sampleCode: 'SHARED-CODE',
      laboratoryId: lab.id,
    });
    expect(labSample.sampleCode).toBe('SHARED-CODE');

    const campaign = await facade.createSamplingCampaign({
      campaignCode: 'DUAL',
      campaignName: 'Dual',
    });
    const point = await facade.createSamplingPoint({
      campaignId: campaign.id,
      pointCode: 'P',
      latitude: 37,
      longitude: 37,
    });
    const fieldSample = await facade.createSamplingSample({
      samplingPointId: point.id,
      sampleCode: 'SHARED-CODE',
      sampleType: 'SINGLE_POINT',
    });
    expect(fieldSample.sampleCode).toBe('SHARED-CODE');
    expect(fieldSample.id).not.toBe(labSample.id);
  });

  it('null vs zero preserved on analysis result raw/normalized path', async () => {
    const lab = await facade.createLaboratory({ name: 'Null Lab' });
    const sampleZero = await facade.createSoilSample({
      parcelId: 'p-null',
      sampleCode: 'NULL-ZERO-0',
      laboratoryId: lab.id,
    });
    const zero = await facade.createSoilAnalysisResult(sampleZero.id, {
      parameterCode: 'SOIL_PH',
      parameterName: 'pH',
      unit: 'pH',
      rawValue: 0,
      rawUnit: 'pH',
    });
    expect(zero.rawValue).toBe('0');
    expect(zero.normalizedValue).toBe(0);

    const sampleNull = await facade.createSoilSample({
      parcelId: 'p-null',
      sampleCode: 'NULL-ZERO-N',
      laboratoryId: lab.id,
    });
    const empty = await facade.createSoilAnalysisResult(sampleNull.id, {
      parameterCode: 'SOIL_PH',
      parameterName: 'pH',
      unit: 'pH',
      rawValue: null,
      rawUnit: 'pH',
    });
    expect(empty.rawValue).toBeNull();
    expect(empty.normalizedValue).toBeNull();

    await expect(
      facade.createSoilAnalysisResult(sampleZero.id, {
        parameterCode: 'SOIL_PH',
        parameterName: 'pH duplicate',
        unit: 'pH',
        rawValue: 7,
        rawUnit: 'pH',
      }),
    ).rejects.toMatchObject({ code: 'PARAMETER_CODE_DUPLICATE' });
  });

  it('multi-attachment report upload keeps primary hash', async () => {
    const lab = await facade.createLaboratory({ name: 'Attach Lab' });
    const first = await facade.uploadLaboratoryReport({
      reportNumber: 'MULTI-1',
      laboratoryId: lab.id,
      fileName: 'a.pdf',
      fileType: 'application/pdf',
      fileCategory: 'PDF',
      dataBase64: Buffer.from('content-a').toString('base64'),
    });
    const primaryHash = first.report.fileHash;
    const second = await facade.uploadLaboratoryReport({
      reportId: first.reportId,
      reportNumber: 'MULTI-1',
      laboratoryId: lab.id,
      fileName: 'b.csv',
      fileType: 'text/csv',
      fileCategory: 'CSV',
      dataBase64: Buffer.from('content-b').toString('base64'),
    });
    expect(second.attachments).toHaveLength(2);
    expect(second.report.fileHash).toBe(primaryHash);
  });

  it('sampling repo clear isolation does not wipe laboratory catalog', async () => {
    const beforeParams = (await facade.listSoilParameters()).length;
    expect(beforeParams).toBeGreaterThan(40);
    samplingRepo.clear?.();
    expect(await facade.listSamplingCampaigns()).toHaveLength(0);
    expect((await facade.listSoilParameters()).length).toBe(beforeParams);
  });
});
