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
  TERRAIN_FACTOR_CATALOG,
  TERRAIN_FACTORS,
  type TerrainRequirement,
} from '../crop-knowledge/terrain/terrain-requirement.types.js';
import { TerrainRequirementsValidationService } from '../crop-knowledge/services/terrain-requirements-validation.service.js';

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

describe('physical-suitability Phase 2.1F Crop Terrain Requirements', () => {
  let psRepo: InMemoryPhysicalSuitabilityRepository;
  let ckRepo: InMemoryCropKnowledgeRepository;
  let facade: PhysicalSuitabilityFacade;

  beforeEach(async () => {
    psRepo = new InMemoryPhysicalSuitabilityRepository();
    ckRepo = new InMemoryCropKnowledgeRepository();
    await seedAll(psRepo, ckRepo);
    facade = new PhysicalSuitabilityFacade(psRepo, ckRepo);
  });

  it('seeds 7 terrain factor shells for each pilot crop with null thresholds', async () => {
    const summaries = await facade.listCropKnowledgeSummaries();
    expect(summaries).toHaveLength(17);

    for (const summary of summaries) {
      const items = await facade.listTerrainRequirements(summary.id);
      expect(items).toHaveLength(TERRAIN_FACTORS.length);
      expect(items.map((i) => i.terrainFactor).sort()).toEqual([...TERRAIN_FACTORS].sort());
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
    const dto = await facade.getTerrainRequirementsByCropCode('wheat');
    expect(dto?.cropCode).toBe('wheat');
    expect(dto!.requirements).toHaveLength(7);
    expect(dto!.requirements.find((r) => r.terrainFactor === 'ELEVATION')?.unit).toBe('m');
    expect(dto!.requirements.find((r) => r.terrainFactor === 'SLOPE')?.unit).toBe('%');
  });

  it('rejects duplicate TerrainFactor', async () => {
    const tomato = await facade.getCropKnowledgeByCode('tomato');
    await expect(
      facade.createTerrainRequirement(tomato!.knowledge.id, {
        terrainFactor: 'SLOPE',
        unit: '%',
      }),
    ).rejects.toMatchObject({ code: 'TERRAIN_REQUIREMENT_INVALID' });
  });

  it('rejects invalid optimal range when thresholds are set', () => {
    const validation = new TerrainRequirementsValidationService(ckRepo);
    const row: TerrainRequirement = {
      id: 'x',
      cropId: 'y',
      cropKnowledgeId: 'y',
      terrainRequirementsId: 'z',
      terrainFactor: 'ELEVATION',
      minimum: 0,
      optimalMinimum: 800,
      optimalMaximum: 400,
      maximum: 1200,
      preferred: null,
      unit: 'm',
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
    const slope = (await facade.getTerrainRequirementByFactor(id, 'SLOPE'))!;

    const updated = await facade.updateTerrainRequirement(id, slope.id, {
      description: 'Updated draft',
    });
    expect(updated.version).toBe(2);
    expect(updated.description).toBe('Updated draft');
    expect(updated.minimum).toBeNull();

    const deleted = await facade.deleteTerrainRequirement(id, updated.id);
    expect(deleted.isActive).toBe(false);
    expect(await facade.getTerrainRequirementByFactor(id, 'SLOPE')).toBeNull();
  });

  it('validation warns on unset thresholds but remains valid for seed', async () => {
    const barley = await facade.getCropKnowledgeByCode('barley');
    const result = await facade.validateTerrainRequirements(barley!.knowledge.id);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === 'THRESHOLDS_UNSET')).toBe(true);
  });

  it('catalog covers all TerrainFactor enum values', () => {
    expect(TERRAIN_FACTOR_CATALOG).toHaveLength(7);
    expect(TERRAIN_FACTOR_CATALOG.map((c) => c.terrainFactor).sort()).toEqual(
      [...TERRAIN_FACTORS].sort(),
    );
  });
});
