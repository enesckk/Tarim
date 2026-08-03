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
  GROWTH_STAGE_CATALOG,
  type CropGrowthStage,
} from '../crop-knowledge/phenology/growth-stage.types.js';
import { CropPhenologyValidationService } from '../crop-knowledge/services/phenology-validation.service.js';

describe('physical-suitability Phase 2.1B Crop Phenology Engine', () => {
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

  it('seeds 13 growth stages + transitions for each pilot crop', async () => {
    const summaries = await facade.listCropKnowledgeSummaries();
    expect(summaries).toHaveLength(17);
    expect(summaries.map((s) => s.cropCode).sort()).toEqual(
      [
        'barley',
        'chickpea',
        'corn',
        'cotton',
        'cucumber',
        'eggplant',
        'garlic',
        'melon',
        'onion',
        'pepper',
        'potato',
        'red_lentil',
        'sunflower',
        'tomato',
        'watermelon',
        'wheat',
        'zucchini',
      ].sort(),
    );

    for (const summary of summaries) {
      const stages = await facade.listGrowthStages(summary.id);
      expect(stages).toHaveLength(13);
      expect(stages.map((s) => s.stageCode)).toEqual(
        GROWTH_STAGE_CATALOG.map((c) => c.stageCode),
      );
      expect(stages[0]!.stageCode).toBe('SEED');
      expect(stages.every((s) => s.typicalDurationDays === null)).toBe(true);
      expect(stages.every((s) => s.minimumDurationDays === null)).toBe(true);
      expect(stages.every((s) => s.maximumDurationDays === null)).toBe(true);

      const phenology = await facade.getPhenology(summary.id);
      expect(phenology!.transitions).toHaveLength(12);
    }
  });

  it('GET stage details includes StageReference shells', async () => {
    const wheat = await facade.getCropKnowledgeByCode('wheat');
    const flowering = await facade.getPhenologyStageByCode(
      wheat!.knowledge.id,
      'FLOWERING',
    );
    expect(flowering).toBeTruthy();
    expect(flowering!.stageName).toBe('Flowering');
    expect(flowering!.isCriticalStage).toBe(true);
    expect(flowering!.references.length).toBeGreaterThan(0);
    expect(flowering!.references[0]!.scientificSource).toBeTruthy();
  });

  it('rejects duplicate StageCode and StageOrder', async () => {
    const tomato = await facade.getCropKnowledgeByCode('tomato');
    const id = tomato!.knowledge.id;
    await expect(
      facade.createGrowthStage(id, {
        stageCode: 'SEED',
        stageName: 'Seed Dup',
        stageOrder: 99,
      }),
    ).rejects.toMatchObject({ code: 'GROWTH_STAGE_INVALID' });
  });

  it('rejects non post-harvest stage after HARVEST order', async () => {
    const corn = await facade.getCropKnowledgeByCode('corn');
    const id = corn!.knowledge.id;
    const vegetative = (await facade.getPhenologyStageByCode(id, 'VEGETATIVE'))!;
    await facade.deleteGrowthStage(id, vegetative.id);

    await expect(
      facade.createGrowthStage(id, {
        stageCode: 'VEGETATIVE',
        stageName: 'Illegal After Harvest',
        stageOrder: 14,
      }),
    ).rejects.toMatchObject({ code: 'GROWTH_STAGE_INVALID' });
  });

  it('PUT versions a stage; DELETE soft-deactivates', async () => {
    const melon = await facade.getCropKnowledgeByCode('melon');
    const id = melon!.knowledge.id;
    const branching = (await facade.getPhenologyStageByCode(id, 'BRANCHING'))!;

    const updated = await facade.updateGrowthStage(id, branching.id, {
      stageName: 'Branching / Tillering',
      isCriticalStage: true,
    });
    expect(updated.version).toBe(2);
    expect(updated.stageName).toBe('Branching / Tillering');
    expect(updated.isCriticalStage).toBe(true);

    const deleted = await facade.deleteGrowthStage(id, updated.id);
    expect(deleted.isActive).toBe(false);
    expect(await facade.getPhenologyStageByCode(id, 'BRANCHING')).toBeNull();
  });

  it('forbids deleting SEED while siblings exist', async () => {
    const pepper = await facade.getCropKnowledgeByCode('pepper');
    const seed = (await facade.getPhenologyStageByCode(pepper!.knowledge.id, 'SEED'))!;
    await expect(facade.deleteGrowthStage(pepper!.knowledge.id, seed.id)).rejects.toMatchObject({
      code: 'SEED_STAGE_DELETE_FORBIDDEN',
    });
  });

  it('validates first stage must be SEED', async () => {
    const validation = new CropPhenologyValidationService(ckRepo);
    const stage: CropGrowthStage = {
      id: 'x',
      cropId: 'y',
      cropKnowledgeId: 'y',
      phenologyId: 'z',
      stageCode: 'GERMINATION',
      stageName: 'Germination',
      stageOrder: 1,
      description: null,
      scientificDescription: null,
      typicalDurationDays: null,
      minimumDurationDays: null,
      maximumDurationDays: null,
      canOverlapPreviousStage: false,
      isCriticalStage: false,
      requiresValidation: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      sourceReferenceId: null,
      verificationStatus: 'Draft',
      isActive: true,
    };
    const issues = validation.validateWriteCandidate(stage, [], 'create');
    expect(issues.some((i) => i.code === 'FIRST_STAGE_MUST_BE_SEED')).toBe(true);
  });

  it('blocks invalid transitions from HARVEST to non post-harvest', async () => {
    const validation = new CropPhenologyValidationService(ckRepo);
    const wheat = await facade.getCropKnowledgeByCode('wheat');
    const stages = await ckRepo.listGrowthStages(wheat!.knowledge.id, true);
    const issues = validation.validateTransition(
      {
        id: 't',
        cropKnowledgeId: wheat!.knowledge.id,
        fromStageCode: 'HARVEST',
        toStageCode: 'FLOWERING',
        order: 99,
        canSkip: true,
        requiresPreviousCompletion: false,
        notes: null,
        version: 1,
        sourceReferenceId: null,
        verificationStatus: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      },
      stages,
    );
    expect(issues.some((i) => i.code === 'INVALID_TRANSITION_AFTER_HARVEST')).toBe(true);
  });

  it('aggregate validation passes for seeded pilots', async () => {
    const barley = await facade.getCropKnowledgeByCode('barley');
    const result = await facade.validatePhenology(barley!.knowledge.id);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === 'TYPICAL_DURATION_UNSET')).toBe(true);
  });
});
