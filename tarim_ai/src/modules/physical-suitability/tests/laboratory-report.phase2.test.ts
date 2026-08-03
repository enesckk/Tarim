import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
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

describe('physical-suitability Phase 2.2D Laboratory Report Management', () => {
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
    const lab = await facade.createLaboratory({ name: 'Report Lab', country: 'TR' });
    laboratoryId = lab.id;
  });

  it('seeds no reports', async () => {
    expect(await facade.listLaboratoryReports()).toHaveLength(0);
  });

  it('creates report with pending approval; rejects duplicate report number', async () => {
    const report = await facade.createLaboratoryReport({
      reportNumber: 'R-100',
      laboratoryId,
      customerName: 'Demo',
    });
    expect(report.status).toBe('PENDING');
    expect(report.isActive).toBe(true);

    const aggregate = await facade.getLaboratoryReportAggregate(report.id);
    expect(aggregate?.approvals).toHaveLength(1);
    expect(aggregate?.approvals[0]?.approvalStatus).toBe('PENDING');

    await expect(
      facade.createLaboratoryReport({
        reportNumber: 'R-100',
        laboratoryId,
      }),
    ).rejects.toMatchObject({ code: 'LABORATORY_REPORT_INVALID' });
  });

  it('rejects duplicate file hash across active reports', async () => {
    const hash = createHash('sha256').update('same-bytes').digest('hex');
    await facade.createLaboratoryReport({
      reportNumber: 'R-HASH-1',
      laboratoryId,
      fileHash: hash,
    });
    await expect(
      facade.createLaboratoryReport({
        reportNumber: 'R-HASH-2',
        laboratoryId,
        fileHash: hash,
      }),
    ).rejects.toMatchObject({ code: 'LABORATORY_REPORT_INVALID' });
  });

  it('soft-deletes reports and allows reuse of report number after delete', async () => {
    const report = await facade.createLaboratoryReport({
      reportNumber: 'R-SOFT',
      laboratoryId,
    });
    const deleted = await facade.deleteLaboratoryReport(report.id);
    expect(deleted.isActive).toBe(false);
    expect(await facade.listLaboratoryReports()).toHaveLength(0);

    const again = await facade.createLaboratoryReport({
      reportNumber: 'R-SOFT',
      laboratoryId,
    });
    expect(again.isActive).toBe(true);
    expect(again.id).not.toBe(report.id);
  });

  it('upload registers attachment + MANUAL import history without parsing parameters', async () => {
    const payload = Buffer.from('lab-report-pdf-bytes').toString('base64');
    const aggregate = await facade.uploadLaboratoryReport({
      reportNumber: 'R-UP-1',
      laboratoryId,
      fileName: 'report.pdf',
      fileType: 'application/pdf',
      fileCategory: 'PDF',
      dataBase64: payload,
      uploadedBy: 'tester',
    });

    expect(aggregate.report.fileHash).toBeTruthy();
    expect(aggregate.attachments).toHaveLength(1);
    expect(aggregate.attachments[0]?.fileCategory).toBe('PDF');
    expect(aggregate.importHistory).toHaveLength(1);
    expect(aggregate.importHistory[0]?.importType).toBe('MANUAL');
    expect(aggregate.importHistory[0]?.importedParameterCount).toBe(0);
    expect(aggregate.importHistory[0]?.successfulParameterCount).toBe(0);
  });

  it('allows multiple attachments on one report with distinct hashes', async () => {
    const first = await facade.uploadLaboratoryReport({
      reportNumber: 'R-MULTI',
      laboratoryId,
      fileName: 'main.pdf',
      fileType: 'application/pdf',
      fileCategory: 'PDF',
      dataBase64: Buffer.from('file-a').toString('base64'),
    });

    const second = await facade.uploadLaboratoryReport({
      reportId: first.reportId,
      reportNumber: 'R-MULTI',
      laboratoryId,
      fileName: 'sheet.xlsx',
      fileType: 'application/vnd.ms-excel',
      fileCategory: 'EXCEL',
      dataBase64: Buffer.from('file-b').toString('base64'),
    });

    expect(second.attachments).toHaveLength(2);
    expect(second.importHistory.length).toBeGreaterThanOrEqual(2);
  });

  it('upload rejects duplicate hash for a different report', async () => {
    const dataBase64 = Buffer.from('dup-content').toString('base64');
    await facade.uploadLaboratoryReport({
      reportNumber: 'R-DUP-A',
      laboratoryId,
      fileName: 'a.pdf',
      fileType: 'application/pdf',
      fileCategory: 'PDF',
      dataBase64,
    });

    await expect(
      facade.uploadLaboratoryReport({
        reportNumber: 'R-DUP-B',
        laboratoryId,
        fileName: 'b.pdf',
        fileType: 'application/pdf',
        fileCategory: 'PDF',
        dataBase64,
      }),
    ).rejects.toMatchObject({ code: 'REPORT_FILE_HASH_DUPLICATE' });
  });
});
