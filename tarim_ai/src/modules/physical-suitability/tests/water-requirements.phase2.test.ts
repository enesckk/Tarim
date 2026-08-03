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
import {
  WATER_FACTOR_CATALOG,
  WATER_FACTORS,
  type WaterRequirement,
} from '../crop-knowledge/water/water-requirement.types.js';
import { WaterRequirementsValidationService } from '../crop-knowledge/services/water-requirements-validation.service.js';

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

describe('physical-suitability Phase 2.1E Crop Water Requirements', () => {
  let psRepo: InMemoryPhysicalSuitabilityRepository;
  let ckRepo: InMemoryCropKnowledgeRepository;
  let facade: PhysicalSuitabilityFacade;

  beforeEach(async () => {
    psRepo = new InMemoryPhysicalSuitabilityRepository();
    ckRepo = new InMemoryCropKnowledgeRepository();
    await seedAll(psRepo, ckRepo);
    facade = new PhysicalSuitabilityFacade(psRepo, ckRepo);
  });

  it('seeds 9 water factor shells for each pilot crop with null thresholds', async () => {
    const summaries = await facade.listCropKnowledgeSummaries();
    expect(summaries).toHaveLength(17);

    for (const summary of summaries) {
      const items = await facade.listWaterRequirements(summary.id);
      expect(items).toHaveLength(WATER_FACTORS.length);
      expect(items.map((i) => i.waterFactor).sort()).toEqual([...WATER_FACTORS].sort());
      expect(
        items.every(
          (i) =>
            i.minimum == null &&
            i.optimalMinimum == null &&
            i.optimalMaximum == null &&
            i.maximum == null &&
            i.preferred == null,
        ),
      ).toBe(true);
    }
  });

  it('aggregate returns section + requirements', async () => {
    const dto = await facade.getWaterRequirementsByCropCode('wheat');
    expect(dto?.cropCode).toBe('wheat');
    expect(dto!.requirements).toHaveLength(9);
    expect(
      dto!.requirements.find((r) => r.waterFactor === 'TOTAL_WATER_REQUIREMENT')?.unit,
    ).toBe('mm');
  });

  it('rejects duplicate WaterFactor', async () => {
    const tomato = await facade.getCropKnowledgeByCode('tomato');
    await expect(
      facade.createWaterRequirement(tomato!.knowledge.id, {
        waterFactor: 'IRRIGATION_REQUIREMENT',
        unit: 'mm',
      }),
    ).rejects.toMatchObject({ code: 'WATER_REQUIREMENT_INVALID' });
  });

  it('rejects invalid optimal range when thresholds are set', () => {
    const validation = new WaterRequirementsValidationService(ckRepo);
    const row: WaterRequirement = {
      id: 'x',
      cropId: 'y',
      cropKnowledgeId: 'y',
      waterRequirementsId: 'z',
      waterFactor: 'TOTAL_WATER_REQUIREMENT',
      minimum: 100,
      optimalMinimum: 400,
      optimalMaximum: 300,
      maximum: 600,
      preferred: null,
      unit: 'mm',
      toleranceLevel: 'Moderate',
      importanceLevel: 'Required',
      description: null,
      sourceReferenceId: null,
      verificationStatus: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      isActive: true,
    };
    expect(validation.validateEntity(row).some((i) => i.code === 'OPTIMAL_RANGE_INVALID')).toBe(
      true,
    );
  });

  it('PUT versions a requirement; DELETE soft-deactivates', async () => {
    const corn = await facade.getCropKnowledgeByCode('corn');
    const id = corn!.knowledge.id;
    const drought = (await facade.getWaterRequirementByFactor(id, 'DROUGHT_TOLERANCE'))!;

    const updated = await facade.updateWaterRequirement(id, drought.id, {
      description: 'Updated draft',
      toleranceLevel: 'Wide',
    });
    expect(updated.version).toBe(2);
    expect(updated.description).toBe('Updated draft');
    expect(updated.minimum).toBeNull();

    const deleted = await facade.deleteWaterRequirement(id, updated.id);
    expect(deleted.isActive).toBe(false);
    expect(await facade.getWaterRequirementByFactor(id, 'DROUGHT_TOLERANCE')).toBeNull();
  });

  it('validation warns on unset thresholds but remains valid for seed', async () => {
    const barley = await facade.getCropKnowledgeByCode('barley');
    const result = await facade.validateWaterRequirements(barley!.knowledge.id);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === 'THRESHOLDS_UNSET')).toBe(true);
  });

  it('catalog covers all WaterFactor enum values', () => {
    expect(WATER_FACTOR_CATALOG).toHaveLength(9);
    expect(WATER_FACTOR_CATALOG.map((c) => c.waterFactor).sort()).toEqual(
      [...WATER_FACTORS].sort(),
    );
  });
});
