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
  REFERENCE_TYPES,
  type ScientificReference,
} from '../crop-knowledge/references/scientific-reference.types.js';
import { ScientificReferenceValidationService } from '../crop-knowledge/services/scientific-reference-validation.service.js';

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

describe('physical-suitability Phase 2.1I Scientific Reference Library', () => {
  let psRepo: InMemoryPhysicalSuitabilityRepository;
  let ckRepo: InMemoryCropKnowledgeRepository;
  let facade: PhysicalSuitabilityFacade;

  beforeEach(async () => {
    psRepo = new InMemoryPhysicalSuitabilityRepository();
    ckRepo = new InMemoryCropKnowledgeRepository();
    await seedAll(psRepo, ckRepo);
    facade = new PhysicalSuitabilityFacade(psRepo, ckRepo);
  });

  it('starts with empty library and empty crop links', async () => {
    expect(await facade.listScientificReferences()).toHaveLength(0);
    const wheat = await facade.getCropReferencesByCropCode('wheat');
    expect(wheat!.references).toHaveLength(0);
    expect(wheat!.links).toHaveLength(0);
  });

  it('CRUD scientific reference without inventing reliability', async () => {
    const created = await facade.createScientificReference({
      title: 'Structural FAO shell',
      authors: ['FAO'],
      referenceType: 'FAO',
      organization: 'FAO',
      country: 'IT',
    });
    expect(created.reliabilityScore).toBeNull();
    expect(created.publicationYear).toBeNull();
    expect(created.version).toBe(1);

    const updated = await facade.updateScientificReference(created.id, {
      publicationYear: 2020,
      doi: '10.1234/example',
    });
    expect(updated.version).toBe(2);
    expect(updated.publicationYear).toBe(2020);

    const deleted = await facade.deleteScientificReference(updated.id);
    expect(deleted.isActive).toBe(false);
    expect(await facade.getScientificReferenceDetails(updated.id)).toMatchObject({
      isActive: false,
    });
  });

  it('links multiple references to one crop (many-to-many)', async () => {
    const a = await facade.createScientificReference({
      title: 'Ref A',
      authors: ['A'],
      referenceType: 'JOURNAL',
    });
    const b = await facade.createScientificReference({
      title: 'Ref B',
      authors: ['B'],
      referenceType: 'TAGEM',
      organization: 'TAGEM',
    });

    const tomato = await facade.getCropKnowledgeByCode('tomato');
    const id = tomato!.knowledge.id;
    await facade.linkScientificReference(id, a.id);
    await facade.linkScientificReference(id, b.id);

    const dto = await facade.getCropReferencesAggregate(id);
    expect(dto!.references).toHaveLength(2);
    expect(dto!.references.map((r) => r.title).sort()).toEqual(['Ref A', 'Ref B']);

    const wheat = await facade.getCropKnowledgeByCode('wheat');
    await facade.linkScientificReference(wheat!.knowledge.id, a.id);
    expect(await facade.listCropScientificReferences(wheat!.knowledge.id)).toHaveLength(1);
    expect(await facade.listCropScientificReferences(id)).toHaveLength(2);
  });

  it('rejects duplicate crop–reference link', async () => {
    const ref = await facade.createScientificReference({
      title: 'Dup',
      authors: [],
      referenceType: 'BOOK',
    });
    const corn = await facade.getCropKnowledgeByCode('corn');
    await facade.linkScientificReference(corn!.knowledge.id, ref.id);
    await expect(
      facade.linkScientificReference(corn!.knowledge.id, ref.id),
    ).rejects.toMatchObject({ code: 'REFERENCE_LINK_DUPLICATE' });
  });

  it('unlinks a reference from a crop', async () => {
    const ref = await facade.createScientificReference({
      title: 'Unlink me',
      authors: ['X'],
      referenceType: 'UNIVERSITY',
    });
    const pepper = await facade.getCropKnowledgeByCode('pepper');
    const id = pepper!.knowledge.id;
    await facade.linkScientificReference(id, ref.id);
    const unlinked = await facade.unlinkScientificReference(id, ref.id);
    expect(unlinked.isActive).toBe(false);
    expect(await facade.listCropScientificReferences(id)).toHaveLength(0);
  });

  it('rejects premature Approved status', () => {
    const validation = new ScientificReferenceValidationService(ckRepo);
    const row: ScientificReference = {
      id: 'x',
      title: 'Approved too early',
      authors: [],
      organization: null,
      publicationYear: 2020,
      country: null,
      doi: '10.1/x',
      isbn: null,
      issn: null,
      url: null,
      referenceType: 'STANDARD',
      language: 'en',
      reliabilityScore: 80,
      notes: null,
      sourceReferenceId: null,
      verificationStatus: 'Approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      isActive: true,
    };
    expect(validation.validateEntity(row).some((i) => i.code === 'PREMATURE_APPROVAL')).toBe(true);
  });

  it('crop validation warns when no links', async () => {
    const barley = await facade.getCropKnowledgeByCode('barley');
    const result = await facade.validateCropScientificReferences(barley!.knowledge.id);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.code === 'CROP_REFERENCES_EMPTY')).toBe(true);
  });

  it('catalog covers ReferenceType enum', () => {
    expect(REFERENCE_TYPES).toHaveLength(8);
    expect([...REFERENCE_TYPES].sort()).toEqual(
      [
        'BOOK',
        'FAO',
        'JOURNAL',
        'MINISTRY',
        'STANDARD',
        'TAGEM',
        'THESIS',
        'UNIVERSITY',
      ].sort(),
    );
  });
});
