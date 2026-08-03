import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPhysicalSuitabilityRepository } from '../repositories/physical-suitability.repository.js';
import { InMemoryCropKnowledgeRepository } from '../crop-knowledge/repositories/crop-knowledge.repository.js';
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
import { PhysicalSuitabilityFacade } from '../services/physical-suitability.facade.js';
import { CALENDAR_REGION_SCOPES } from '../crop-knowledge/calendar/production-calendar.types.js';
import { ProductionCalendarValidationService } from '../crop-knowledge/services/production-calendar-validation.service.js';
import type { ProductionCalendar } from '../crop-knowledge/calendar/production-calendar.types.js';

async function seedAll(
  psRepo: InMemoryPhysicalSuitabilityRepository,
  ckRepo: InMemoryCropKnowledgeRepository,
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
}

describe('physical-suitability Phase 2.1H Crop Production Calendar', () => {
  let psRepo: InMemoryPhysicalSuitabilityRepository;
  let ckRepo: InMemoryCropKnowledgeRepository;
  let facade: PhysicalSuitabilityFacade;

  beforeEach(async () => {
    psRepo = new InMemoryPhysicalSuitabilityRepository();
    ckRepo = new InMemoryCropKnowledgeRepository();
    await seedAll(psRepo, ckRepo);
    facade = new PhysicalSuitabilityFacade(psRepo, ckRepo);
  });

  it('keeps section shell without inventing region calendar rows', async () => {
    const summaries = await facade.listCropKnowledgeSummaries();
    expect(summaries).toHaveLength(17);

    for (const summary of summaries) {
      const items = await facade.listProductionCalendars(summary.id);
      expect(items).toHaveLength(0);
    }
  });

  it('aggregate returns section with empty calendars', async () => {
    const dto = await facade.getProductionCalendarByCropCode('wheat');
    expect(dto?.cropCode).toBe('wheat');
    expect(dto!.regionCode).toBe('TR-GA');
    expect(dto!.calendars).toHaveLength(0);
  });

  it('creates Province and District shells without planting windows', async () => {
    const tomato = await facade.getCropKnowledgeByCode('tomato');
    const id = tomato!.knowledge.id;

    const province = await facade.createProductionCalendarItem(id, {
      regionId: 'TR-27',
      regionScope: 'Province',
      regionCode: 'TR-27',
      irrigatedSupported: true,
      rainfedSupported: true,
    });
    expect(province.plantingStart).toBeNull();
    expect(province.harvestEnd).toBeNull();
    expect(province.regionScope).toBe('Province');

    const district = await facade.createProductionCalendarItem(id, {
      regionId: 'TR-27-1234',
      regionScope: 'District',
      regionCode: 'TR-27-1234',
      parentRegionId: 'TR-27',
      irrigatedSupported: true,
    });
    expect(district.parentRegionId).toBe('TR-27');
    expect(district.plantingStart).toBeNull();

    const listed = await facade.listProductionCalendars(id);
    expect(listed).toHaveLength(2);
  });

  it('rejects duplicate RegionId', async () => {
    const corn = await facade.getCropKnowledgeByCode('corn');
    const id = corn!.knowledge.id;
    await facade.createProductionCalendarItem(id, {
      regionId: 'TR-GA',
      regionScope: 'AgroClimatic',
      regionCode: 'TR-GA',
    });
    await expect(
      facade.createProductionCalendarItem(id, {
        regionId: 'TR-GA',
        regionScope: 'AgroClimatic',
      }),
    ).rejects.toMatchObject({ code: 'PRODUCTION_CALENDAR_INVALID' });
  });

  it('rejects invalid planting window order', () => {
    const validation = new ProductionCalendarValidationService(ckRepo);
    const row: ProductionCalendar = {
      id: 'x',
      cropId: 'y',
      cropKnowledgeId: 'y',
      productionCalendarSectionId: 'z',
      regionId: 'TR-27',
      regionScope: 'Province',
      regionCode: 'TR-27',
      parentRegionId: null,
      plantingStart: '06-01',
      plantingEnd: '03-01',
      harvestStart: null,
      harvestEnd: null,
      secondCropSupported: false,
      greenhouseSupported: false,
      rainfedSupported: true,
      irrigatedSupported: true,
      sourceReferenceId: null,
      verificationStatus: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      isActive: true,
    };
    expect(
      validation.validateEntity(row).some((i) => i.code === 'PLANTING_WINDOW_INVALID'),
    ).toBe(true);
  });

  it('PUT versions a calendar; DELETE soft-deactivates', async () => {
    const melon = await facade.getCropKnowledgeByCode('melon');
    const id = melon!.knowledge.id;
    const created = await facade.createProductionCalendarItem(id, {
      regionId: 'TR-27',
      regionScope: 'Province',
      irrigatedSupported: true,
    });

    const updated = await facade.updateProductionCalendarItem(id, created.id, {
      greenhouseSupported: true,
      plantingStart: null,
    });
    expect(updated.version).toBe(2);
    expect(updated.greenhouseSupported).toBe(true);
    expect(updated.plantingStart).toBeNull();

    const deleted = await facade.deleteProductionCalendarItem(id, updated.id);
    expect(deleted.isActive).toBe(false);
    expect(await facade.getProductionCalendarByRegionId(id, 'TR-27')).toBeNull();
  });

  it('validation warns on empty calendars but remains valid', async () => {
    const barley = await facade.getCropKnowledgeByCode('barley');
    const result = await facade.validateProductionCalendar(barley!.knowledge.id);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === 'PRODUCTION_CALENDARS_EMPTY')).toBe(true);
  });

  it('catalog covers CalendarRegionScope values for hierarchy', () => {
    expect(CALENDAR_REGION_SCOPES).toEqual([
      'Country',
      'Province',
      'District',
      'AgroClimatic',
      'Custom',
    ]);
  });
});
