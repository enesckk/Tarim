import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryPhysicalSuitabilityRepository,
} from '../repositories/physical-suitability.repository.js';
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
import { CropGeneralInformationValidationService } from '../crop-knowledge/services/general-information-validation.service.js';
import type { CropGeneralInformation } from '../crop-knowledge/types/crop-knowledge.types.js';

describe('physical-suitability Phase 2.1 Crop Knowledge / General Information', () => {
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

  it('seeds 17 crop knowledge roots with general information', async () => {
    const summaries = await facade.listCropKnowledgeSummaries();
    expect(summaries).toHaveLength(17);
    expect(summaries.every((s) => s.nameTr && s.nameEn)).toBe(true);
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
  });

  it('general information carries identity fields without inventing thresholds', async () => {
    const gi = await facade.getGeneralInformationByCropCode('wheat');
    expect(gi).toBeTruthy();
    expect(gi!.identityCode).toBe('wheat');
    expect(gi!.nameTr).toBe('Buğday');
    expect(gi!.nameEn).toBe('Wheat');
    expect(gi!.scientificName).toBe('Triticum aestivum');
    expect(gi!.cropGroup).toBe('Cereal');
    expect(gi!.family).toBe('Poaceae');
    expect(gi!.lifecycle).toBe('Seasonal');
    expect(gi!.growingType).toBe('FieldCrop');
    expect(gi!.supportsOpenField).toBe(true);
    expect(gi!.supportsRainfed).toBe(true);
    expect(gi!.supportsIrrigated).toBe(true);
    expect(gi!.faoCode).toBeNull();
    expect(gi!.eppoCode).toBeNull();
    expect(gi!.typicalGrowingDurationDays).toBeNull();
    expect(gi!.typicalRootDepthCm).toBeNull();
    expect(gi!.typicalPlantHeightCm).toBeNull();
    expect(gi!.version).toBe(1);
    expect(gi!.verificationStatus).toBe('Draft');
    expect(gi!.isActive).toBe(true);
    expect(gi!.sourceReferenceId).toBeTruthy();
  });

  it('bundle exposes normalized section shells', async () => {
    const bundle = await facade.getCropKnowledgeByCode('tomato');
    expect(bundle).toBeTruthy();
    expect(bundle!.generalInformation?.nameTr).toBe('Domates');
    expect(bundle!.scientificIdentity).toBeTruthy();
    expect(bundle!.phenology).toBeTruthy();
    expect(bundle!.growthStages).toHaveLength(13);
    expect(bundle!.phenologyStages).toHaveLength(13);
    expect(bundle!.stageTransitions).toHaveLength(12);
    expect(bundle!.climateRequirements).toBeTruthy();
    expect(bundle!.climateRequirementItems).toHaveLength(16);
    expect(bundle!.soilRequirements).toBeTruthy();
    expect(bundle!.soilRequirementItems).toHaveLength(16);
    expect(bundle!.waterRequirements).toBeTruthy();
    expect(bundle!.waterRequirementItems).toHaveLength(9);
    expect(bundle!.terrainRequirements).toBeTruthy();
    expect(bundle!.terrainRequirementItems).toHaveLength(7);
    expect(bundle!.productionCalendar?.regionCode).toBe('TR-GA');
    expect(bundle!.productionCalendarItems).toHaveLength(0);
    expect(bundle!.riskProfile).toBeTruthy();
    expect(bundle!.cropRiskItems).toHaveLength(12);
    expect(bundle!.references).toBeTruthy();
    expect(bundle!.scientificReferences).toHaveLength(0);
  });

  it('links crop knowledge to phase-1 crop profile when available', async () => {
    const bundle = await facade.getCropKnowledgeByCode('cotton');
    const profile = await facade.profiles.getCrop('cotton');
    expect(bundle!.knowledge.cropProfileId).toBe(profile!.id);
  });

  it('validates general information and warns on missing FAO/EPPO', async () => {
    const knowledge = await facade.getCropKnowledgeByCode('barley');
    const result = await facade.validateGeneralInformation(knowledge!.knowledge.id);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === 'FAO_CODE_MISSING')).toBe(true);
    expect(result.issues.some((i) => i.code === 'EPPO_CODE_MISSING')).toBe(true);
    expect(result.issues.some((i) => i.code === 'DRAFT_RECORD')).toBe(true);
  });

  it('rejects premature Approved status', async () => {
    const knowledge = await facade.getCropKnowledgeByCode('melon');
    const gi = (await facade.getGeneralInformation(knowledge!.knowledge.id))!;
    const validation = new CropGeneralInformationValidationService(ckRepo);
    const issues = validation.validateEntity({
      ...gi,
      verificationStatus: 'Approved',
    });
    expect(issues.some((i) => i.code === 'PREMATURE_APPROVAL' && i.severity === 'error')).toBe(
      true,
    );
  });

  it('upsert versions general information and soft-deactivates previous', async () => {
    const knowledge = await facade.getCropKnowledgeByCode('pepper');
    const id = knowledge!.knowledge.id;
    const prev = (await facade.getGeneralInformation(id))!;

    const saved = await facade.upsertGeneralInformation(id, {
      identityCode: prev.identityCode,
      nameTr: 'Biber (güncel)',
      nameEn: prev.nameEn,
      scientificName: prev.scientificName,
      cropGroup: prev.cropGroup,
      family: prev.family,
      lifecycle: prev.lifecycle,
      growingType: prev.growingType,
      supportsOpenField: prev.supportsOpenField,
      supportsGreenhouse: prev.supportsGreenhouse,
      supportsRainfed: prev.supportsRainfed,
      supportsIrrigated: prev.supportsIrrigated,
      supportsFirstCrop: prev.supportsFirstCrop,
      supportsSecondCrop: prev.supportsSecondCrop,
      seedType: prev.seedType,
      harvestType: prev.harvestType,
      regionAvailability: prev.regionAvailability,
      description: prev.description,
      scientificReferenceIds: prev.scientificReferenceIds,
      sourceReferenceId: prev.sourceReferenceId,
      verificationStatus: 'Draft',
    });

    expect(saved.version).toBe(2);
    expect(saved.nameTr).toBe('Biber (güncel)');
    expect(saved.typicalGrowingDurationDays).toBeNull();

    const all = await ckRepo.listGeneralInformation(false);
    const pepperRows = all.filter((g) => g.cropKnowledgeId === id);
    expect(pepperRows.some((g) => g.version === 1 && !g.isActive)).toBe(true);
    expect(pepperRows.some((g) => g.version === 2 && g.isActive)).toBe(true);
  });

  it('requires at least one production type flag', () => {
    const validation = new CropGeneralInformationValidationService(ckRepo);
    const base: CropGeneralInformation = {
      id: 'x',
      cropKnowledgeId: 'y',
      version: 1,
      sourceReferenceId: null,
      verificationStatus: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      identityCode: 'x',
      nameTr: 'X',
      nameEn: 'X',
      scientificName: null,
      faoCode: null,
      eppoCode: null,
      cropGroup: 'Other',
      family: null,
      lifecycle: 'Seasonal',
      growingType: 'Other',
      supportsOpenField: false,
      supportsGreenhouse: false,
      supportsRainfed: false,
      supportsIrrigated: false,
      supportsFirstCrop: false,
      supportsSecondCrop: false,
      seedType: null,
      harvestType: null,
      typicalGrowingDurationDays: null,
      typicalRootDepthCm: null,
      typicalPlantHeightCm: null,
      economicPart: null,
      primaryUsage: null,
      secondaryUsage: null,
      regionAvailability: [],
      description: null,
      photoUrl: null,
      iconUrl: null,
      scientificReferenceIds: [],
    };
    const issues = validation.validateEntity(base);
    expect(issues.some((i) => i.code === 'PRODUCTION_TYPE_REQUIRED')).toBe(true);
  });

  it('does not treat descriptive measures as suitability thresholds', async () => {
    const list = await facade.listGeneralInformation();
    expect(list.every((g) => g.typicalGrowingDurationDays == null)).toBe(true);
    expect(list.every((g) => g.typicalRootDepthCm == null)).toBe(true);
    expect(list.every((g) => g.typicalPlantHeightCm == null)).toBe(true);
  });
});
