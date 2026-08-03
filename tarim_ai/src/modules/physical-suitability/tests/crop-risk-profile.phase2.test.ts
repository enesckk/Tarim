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
  RISK_TYPE_CATALOG,
  RISK_TYPES,
  type CropRisk,
} from '../crop-knowledge/risk/crop-risk.types.js';
import { CropRiskValidationService } from '../crop-knowledge/services/crop-risk-validation.service.js';

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

describe('physical-suitability Phase 2.1G Crop Risk Profile', () => {
  let psRepo: InMemoryPhysicalSuitabilityRepository;
  let ckRepo: InMemoryCropKnowledgeRepository;
  let facade: PhysicalSuitabilityFacade;

  beforeEach(async () => {
    psRepo = new InMemoryPhysicalSuitabilityRepository();
    ckRepo = new InMemoryCropKnowledgeRepository();
    await seedAll(psRepo, ckRepo);
    facade = new PhysicalSuitabilityFacade(psRepo, ckRepo);
  });

  it('seeds 12 risk-type shells for each pilot crop with Unknown levels', async () => {
    const summaries = await facade.listCropKnowledgeSummaries();
    expect(summaries).toHaveLength(17);

    for (const summary of summaries) {
      const items = await facade.listCropRisks(summary.id);
      expect(items).toHaveLength(RISK_TYPES.length);
      expect(items.map((i) => i.riskType).sort()).toEqual([...RISK_TYPES].sort());
      expect(items.every((i) => i.riskLevel === 'Unknown')).toBe(true);
      expect(items.every((i) => i.sensitivity === 'Unknown')).toBe(true);
      expect(items.every((i) => i.mitigationSuggestion == null)).toBe(true);
    }
  });

  it('aggregate returns section + risks', async () => {
    const dto = await facade.getRiskProfileByCropCode('wheat');
    expect(dto?.cropCode).toBe('wheat');
    expect(dto!.risks).toHaveLength(12);
    expect(dto!.risks.find((r) => r.riskType === 'FROST')?.description).toContain('Frost');
  });

  it('rejects duplicate RiskType', async () => {
    const tomato = await facade.getCropKnowledgeByCode('tomato');
    await expect(
      facade.createCropRisk(tomato!.knowledge.id, {
        riskType: 'DROUGHT',
      }),
    ).rejects.toMatchObject({ code: 'CROP_RISK_INVALID' });
  });

  it('rejects premature Approved status', () => {
    const validation = new CropRiskValidationService(ckRepo);
    const row: CropRisk = {
      id: 'x',
      cropId: 'y',
      cropKnowledgeId: 'y',
      riskProfileId: 'z',
      riskType: 'HAIL',
      riskLevel: 'Low',
      sensitivity: 'Low',
      description: null,
      mitigationSuggestion: 'Cover crop',
      sourceReferenceId: null,
      verificationStatus: 'Approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      isActive: true,
    };
    expect(validation.validateEntity(row).some((i) => i.code === 'PREMATURE_APPROVAL')).toBe(true);
  });

  it('PUT versions a risk; DELETE soft-deactivates', async () => {
    const corn = await facade.getCropKnowledgeByCode('corn');
    const id = corn!.knowledge.id;
    const frost = (await facade.getCropRiskByType(id, 'FROST'))!;

    const updated = await facade.updateCropRisk(id, frost.id, {
      riskLevel: 'Moderate',
      sensitivity: 'High',
      description: 'Updated draft',
    });
    expect(updated.version).toBe(2);
    expect(updated.riskLevel).toBe('Moderate');
    expect(updated.sensitivity).toBe('High');
    expect(updated.mitigationSuggestion).toBeNull();

    const deleted = await facade.deleteCropRisk(id, updated.id);
    expect(deleted.isActive).toBe(false);
    expect(await facade.getCropRiskByType(id, 'FROST')).toBeNull();
  });

  it('validation warns on unset levels but remains valid for seed', async () => {
    const barley = await facade.getCropKnowledgeByCode('barley');
    const result = await facade.validateRiskProfile(barley!.knowledge.id);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === 'RISK_LEVEL_UNSET')).toBe(true);
    expect(result.issues.some((i) => i.code === 'SENSITIVITY_UNSET')).toBe(true);
    expect(result.issues.some((i) => i.code === 'MITIGATION_UNSET')).toBe(true);
  });

  it('catalog covers all RiskType enum values', () => {
    expect(RISK_TYPE_CATALOG).toHaveLength(12);
    expect(RISK_TYPE_CATALOG.map((c) => c.riskType).sort()).toEqual([...RISK_TYPES].sort());
  });
});
