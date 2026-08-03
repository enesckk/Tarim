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
  CLIMATE_FACTOR_CATALOG,
  CLIMATE_FACTORS,
  type ClimateRequirement,
} from '../crop-knowledge/climate/climate-requirement.types.js';
import { ClimateRequirementsValidationService } from '../crop-knowledge/services/climate-requirements-validation.service.js';

describe('physical-suitability Phase 2.1C Crop Climate Requirements', () => {
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

  it('seeds 16 climate factor shells for each pilot crop with null thresholds', async () => {
    const summaries = await facade.listCropKnowledgeSummaries();
    expect(summaries).toHaveLength(17);

    for (const summary of summaries) {
      const items = await facade.listClimateRequirements(summary.id);
      expect(items).toHaveLength(CLIMATE_FACTORS.length);
      expect(items.map((i) => i.climateFactor).sort()).toEqual([...CLIMATE_FACTORS].sort());
      expect(
        items.every(
          (i) =>
            i.minimumValue == null &&
            i.optimalMinimum == null &&
            i.optimalMaximum == null &&
            i.maximumValue == null &&
            i.preferredValue == null,
        ),
      ).toBe(true);
      expect(items.every((i) => i.verificationStatus === 'Draft')).toBe(true);
      expect(items.every((i) => i.unit.length > 0)).toBe(true);
    }
  });

  it('aggregate returns section + requirements', async () => {
    const dto = await facade.getClimateRequirementsByCropCode('wheat');
    expect(dto).toBeTruthy();
    expect(dto!.cropCode).toBe('wheat');
    expect(dto!.requirements).toHaveLength(16);
    expect(dto!.requirements.find((r) => r.climateFactor === 'AIR_TEMPERATURE')?.unit).toBe(
      '°C',
    );
  });

  it('rejects duplicate ClimateFactor', async () => {
    const tomato = await facade.getCropKnowledgeByCode('tomato');
    await expect(
      facade.createClimateRequirement(tomato!.knowledge.id, {
        climateFactor: 'GDD',
        unit: '°C·d',
      }),
    ).rejects.toMatchObject({ code: 'CLIMATE_REQUIREMENT_INVALID' });
  });

  it('rejects invalid optimal range when thresholds are set', async () => {
    const validation = new ClimateRequirementsValidationService(ckRepo);
    const row: ClimateRequirement = {
      id: 'x',
      cropId: 'y',
      cropKnowledgeId: 'y',
      climateRequirementsId: 'z',
      climateFactor: 'AIR_TEMPERATURE',
      minimumValue: 0,
      optimalMinimum: 20,
      optimalMaximum: 10,
      maximumValue: 30,
      preferredValue: null,
      toleranceLevel: 'Moderate',
      importanceLevel: 'Required',
      unit: '°C',
      scientificExplanation: null,
      notes: null,
      sourceReferenceId: null,
      verificationStatus: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      isActive: true,
    };
    const issues = validation.validateEntity(row);
    expect(issues.some((i) => i.code === 'OPTIMAL_RANGE_INVALID')).toBe(true);
  });

  it('PUT versions a requirement; DELETE soft-deactivates', async () => {
    const corn = await facade.getCropKnowledgeByCode('corn');
    const id = corn!.knowledge.id;
    const frost = (await facade.getClimateRequirementByFactor(id, 'FROST'))!;

    const updated = await facade.updateClimateRequirement(id, frost.id, {
      notes: 'Updated draft note',
      toleranceLevel: 'Narrow',
    });
    expect(updated.version).toBe(2);
    expect(updated.notes).toBe('Updated draft note');
    expect(updated.toleranceLevel).toBe('Narrow');
    expect(updated.minimumValue).toBeNull();

    const deleted = await facade.deleteClimateRequirement(id, updated.id);
    expect(deleted.isActive).toBe(false);
    expect(await facade.getClimateRequirementByFactor(id, 'FROST')).toBeNull();
  });

  it('validation warns on unset thresholds but remains valid for seed', async () => {
    const barley = await facade.getCropKnowledgeByCode('barley');
    const result = await facade.validateClimateRequirements(barley!.knowledge.id);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === 'THRESHOLDS_UNSET')).toBe(true);
  });

  it('catalog covers all ClimateFactor enum values', () => {
    expect(CLIMATE_FACTOR_CATALOG).toHaveLength(16);
    expect(CLIMATE_FACTOR_CATALOG.map((c) => c.climateFactor).sort()).toEqual(
      [...CLIMATE_FACTORS].sort(),
    );
  });
});
