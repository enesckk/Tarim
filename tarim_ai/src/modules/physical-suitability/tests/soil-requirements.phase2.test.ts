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
  SOIL_FACTOR_CATALOG,
  SOIL_FACTORS,
  type SoilRequirement,
} from '../crop-knowledge/soil/soil-requirement.types.js';
import { SoilRequirementsValidationService } from '../crop-knowledge/services/soil-requirements-validation.service.js';

describe('physical-suitability Phase 2.1D Crop Soil Requirements', () => {
  let psRepo: InMemoryPhysicalSuitabilityRepository;
  let ckRepo: InMemoryCropKnowledgeRepository;
  let facade: PhysicalSuitabilityFacade;

  beforeEach(async () => {
    psRepo = new InMemoryPhysicalSuitabilityRepository();
    ckRepo = new InMemoryCropKnowledgeRepository();
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
    await seedScientificReferenceLibrary(ckRepo);
    facade = new PhysicalSuitabilityFacade(psRepo, ckRepo);
  });

  it('seeds 16 soil factor shells for each pilot crop with null thresholds', async () => {
    const summaries = await facade.listCropKnowledgeSummaries();
    expect(summaries).toHaveLength(17);

    for (const summary of summaries) {
      const items = await facade.listSoilRequirements(summary.id);
      expect(items).toHaveLength(SOIL_FACTORS.length);
      expect(items.map((i) => i.soilFactor).sort()).toEqual([...SOIL_FACTORS].sort());
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
      expect(items.every((i) => i.verificationStatus === 'Draft')).toBe(true);
    }
  });

  it('aggregate returns section + requirements', async () => {
    const dto = await facade.getSoilRequirementsByCropCode('wheat');
    expect(dto?.cropCode).toBe('wheat');
    expect(dto!.requirements).toHaveLength(16);
    expect(dto!.requirements.find((r) => r.soilFactor === 'PH')?.unit).toBe('pH');
  });

  it('rejects duplicate SoilFactor', async () => {
    const tomato = await facade.getCropKnowledgeByCode('tomato');
    await expect(
      facade.createSoilRequirement(tomato!.knowledge.id, {
        soilFactor: 'EC',
        unit: 'dS/m',
      }),
    ).rejects.toMatchObject({ code: 'SOIL_REQUIREMENT_INVALID' });
  });

  it('rejects invalid optimal range when thresholds are set', () => {
    const validation = new SoilRequirementsValidationService(ckRepo);
    const row: SoilRequirement = {
      id: 'x',
      cropId: 'y',
      cropKnowledgeId: 'y',
      soilRequirementsId: 'z',
      soilFactor: 'PH',
      minimum: 5,
      optimalMinimum: 7,
      optimalMaximum: 6,
      maximum: 8,
      preferred: null,
      importanceLevel: 'Required',
      toleranceLevel: 'Moderate',
      unit: 'pH',
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
    const ph = (await facade.getSoilRequirementByFactor(id, 'PH'))!;

    const updated = await facade.updateSoilRequirement(id, ph.id, {
      description: 'Updated draft description',
      toleranceLevel: 'Narrow',
    });
    expect(updated.version).toBe(2);
    expect(updated.description).toBe('Updated draft description');
    expect(updated.minimum).toBeNull();

    const deleted = await facade.deleteSoilRequirement(id, updated.id);
    expect(deleted.isActive).toBe(false);
    expect(await facade.getSoilRequirementByFactor(id, 'PH')).toBeNull();
  });

  it('validation warns on unset thresholds but remains valid for seed', async () => {
    const barley = await facade.getCropKnowledgeByCode('barley');
    const result = await facade.validateSoilRequirements(barley!.knowledge.id);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === 'THRESHOLDS_UNSET')).toBe(true);
  });

  it('catalog covers all SoilFactor enum values', () => {
    expect(SOIL_FACTOR_CATALOG).toHaveLength(16);
    expect(SOIL_FACTOR_CATALOG.map((c) => c.soilFactor).sort()).toEqual([...SOIL_FACTORS].sort());
  });
});
