import { randomUUID } from 'node:crypto';
import type { PhysicalSuitabilityRepository } from '../../repositories/physical-suitability.repository.js';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import type {
  CropGeneralInformation,
  CropKnowledge,
  CropScientificIdentity,
  GrowingType,
} from '../types/crop-knowledge.types.js';

function id() {
  return randomUUID();
}

type GiSeed = {
  code: string;
  nameTr: string;
  nameEn: string;
  scientificName: string;
  cropGroup: string;
  family: string;
  growingType: GrowingType;
  rainfed: boolean;
  irrigated: boolean;
  firstCrop: boolean;
  secondCrop: boolean;
  seedType: CropGeneralInformation['seedType'];
  harvestType: CropGeneralInformation['harvestType'];
  economicPart: string;
  primaryUsage: string;
  secondaryUsage: string | null;
  description: string;
};

/** Catalog identity only — no suitability threshold numbers. */
const GI_SEEDS: GiSeed[] = [
  {
    code: 'wheat',
    nameTr: 'Buğday',
    nameEn: 'Wheat',
    scientificName: 'Triticum aestivum',
    cropGroup: 'Cereal',
    family: 'Poaceae',
    growingType: 'FieldCrop',
    rainfed: true,
    irrigated: true,
    firstCrop: true,
    secondCrop: false,
    seedType: 'Seed',
    harvestType: 'Grain',
    economicPart: 'Grain',
    primaryUsage: 'Food',
    secondaryUsage: 'Feed',
    description: 'Sezonluk tarla tahılı. Gaziantep pilot ürünü.',
  },
  {
    code: 'barley',
    nameTr: 'Arpa',
    nameEn: 'Barley',
    scientificName: 'Hordeum vulgare',
    cropGroup: 'Cereal',
    family: 'Poaceae',
    growingType: 'FieldCrop',
    rainfed: true,
    irrigated: false,
    firstCrop: true,
    secondCrop: false,
    seedType: 'Seed',
    harvestType: 'Grain',
    economicPart: 'Grain',
    primaryUsage: 'Feed',
    secondaryUsage: 'Food',
    description: 'Sezonluk tarla tahılı.',
  },
  {
    code: 'chickpea',
    nameTr: 'Nohut',
    nameEn: 'Chickpea',
    scientificName: 'Cicer arietinum',
    cropGroup: 'Legume',
    family: 'Fabaceae',
    growingType: 'FieldCrop',
    rainfed: true,
    irrigated: false,
    firstCrop: true,
    secondCrop: false,
    seedType: 'Seed',
    harvestType: 'Grain',
    economicPart: 'Seed',
    primaryUsage: 'Food',
    secondaryUsage: null,
    description: 'Sezonluk baklagil.',
  },
  {
    code: 'red_lentil',
    nameTr: 'Kırmızı mercimek',
    nameEn: 'Red lentil',
    scientificName: 'Lens culinaris',
    cropGroup: 'Legume',
    family: 'Fabaceae',
    growingType: 'FieldCrop',
    rainfed: true,
    irrigated: false,
    firstCrop: true,
    secondCrop: false,
    seedType: 'Seed',
    harvestType: 'Grain',
    economicPart: 'Seed',
    primaryUsage: 'Food',
    secondaryUsage: null,
    description: 'Sezonluk baklagil (kırmızı mercimek).',
  },
  {
    code: 'corn',
    nameTr: 'Mısır',
    nameEn: 'Maize',
    scientificName: 'Zea mays',
    cropGroup: 'Cereal',
    family: 'Poaceae',
    growingType: 'FieldCrop',
    rainfed: false,
    irrigated: true,
    firstCrop: true,
    secondCrop: true,
    seedType: 'Seed',
    harvestType: 'Grain',
    economicPart: 'Grain',
    primaryUsage: 'Feed',
    secondaryUsage: 'Food',
    description: 'Sezonluk tarla ürünü; tipik olarak sulamalı.',
  },
  {
    code: 'cotton',
    nameTr: 'Pamuk',
    nameEn: 'Cotton',
    scientificName: 'Gossypium hirsutum',
    cropGroup: 'IndustrialCrop',
    family: 'Malvaceae',
    growingType: 'Industrial',
    rainfed: false,
    irrigated: true,
    firstCrop: true,
    secondCrop: false,
    seedType: 'Seed',
    harvestType: 'Fiber',
    economicPart: 'Fiber',
    primaryUsage: 'Fiber',
    secondaryUsage: 'Oilseed',
    description: 'Sezonluk endüstriyel ürün.',
  },
  {
    code: 'tomato',
    nameTr: 'Domates',
    nameEn: 'Tomato',
    scientificName: 'Solanum lycopersicum',
    cropGroup: 'Vegetable',
    family: 'Solanaceae',
    growingType: 'Vegetable',
    rainfed: false,
    irrigated: true,
    firstCrop: true,
    secondCrop: true,
    seedType: 'Seedling',
    harvestType: 'Fruit',
    economicPart: 'Fruit',
    primaryUsage: 'Food',
    secondaryUsage: null,
    description: 'Sezonluk sebze; açık tarla sulamalı senaryo.',
  },
  {
    code: 'pepper',
    nameTr: 'Biber',
    nameEn: 'Pepper',
    scientificName: 'Capsicum annuum',
    cropGroup: 'Vegetable',
    family: 'Solanaceae',
    growingType: 'Vegetable',
    rainfed: false,
    irrigated: true,
    firstCrop: true,
    secondCrop: true,
    seedType: 'Seedling',
    harvestType: 'Fruit',
    economicPart: 'Fruit',
    primaryUsage: 'Food',
    secondaryUsage: null,
    description: 'Sezonluk sebze.',
  },
  {
    code: 'melon',
    nameTr: 'Kavun',
    nameEn: 'Melon',
    scientificName: 'Cucumis melo',
    cropGroup: 'MelonCrop',
    family: 'Cucurbitaceae',
    growingType: 'Melon',
    rainfed: false,
    irrigated: true,
    firstCrop: true,
    secondCrop: false,
    seedType: 'Seed',
    harvestType: 'Fruit',
    economicPart: 'Fruit',
    primaryUsage: 'Food',
    secondaryUsage: null,
    description: 'Sezonluk bostan ürünü.',
  },
  {
    code: 'watermelon',
    nameTr: 'Karpuz',
    nameEn: 'Watermelon',
    scientificName: 'Citrullus lanatus',
    cropGroup: 'MelonCrop',
    family: 'Cucurbitaceae',
    growingType: 'Melon',
    rainfed: false,
    irrigated: true,
    firstCrop: true,
    secondCrop: false,
    seedType: 'Seed',
    harvestType: 'Fruit',
    economicPart: 'Fruit',
    primaryUsage: 'Food',
    secondaryUsage: null,
    description: 'Sezonluk bostan ürünü.',
  },
  {
    code: 'sunflower',
    nameTr: 'Ayçiçeği',
    nameEn: 'Sunflower',
    scientificName: 'Helianthus annuus',
    cropGroup: 'IndustrialCrop',
    family: 'Asteraceae',
    growingType: 'Industrial',
    rainfed: true,
    irrigated: true,
    firstCrop: true,
    secondCrop: false,
    seedType: 'Seed',
    harvestType: 'Other',
    economicPart: 'Seed',
    primaryUsage: 'Oilseed',
    secondaryUsage: 'Feed',
    description: 'Sezonluk endüstriyel yağ bitkisi.',
  },
  {
    code: 'eggplant',
    nameTr: 'Patlıcan',
    nameEn: 'Eggplant',
    scientificName: 'Solanum melongena',
    cropGroup: 'Vegetable',
    family: 'Solanaceae',
    growingType: 'Vegetable',
    rainfed: false,
    irrigated: true,
    firstCrop: true,
    secondCrop: true,
    seedType: 'Seedling',
    harvestType: 'Fruit',
    economicPart: 'Fruit',
    primaryUsage: 'Food',
    secondaryUsage: null,
    description: 'Sezonluk sebze; açık tarla sulamalı senaryo.',
  },
  {
    code: 'cucumber',
    nameTr: 'Salatalık',
    nameEn: 'Cucumber',
    scientificName: 'Cucumis sativus',
    cropGroup: 'Vegetable',
    family: 'Cucurbitaceae',
    growingType: 'Vegetable',
    rainfed: false,
    irrigated: true,
    firstCrop: true,
    secondCrop: true,
    seedType: 'Seedling',
    harvestType: 'Fruit',
    economicPart: 'Fruit',
    primaryUsage: 'Food',
    secondaryUsage: null,
    description: 'Sezonluk sebze; açık tarla sulamalı senaryo.',
  },
  {
    code: 'zucchini',
    nameTr: 'Kabak',
    nameEn: 'Zucchini',
    scientificName: 'Cucurbita pepo',
    cropGroup: 'Vegetable',
    family: 'Cucurbitaceae',
    growingType: 'Vegetable',
    rainfed: false,
    irrigated: true,
    firstCrop: true,
    secondCrop: true,
    seedType: 'Seedling',
    harvestType: 'Fruit',
    economicPart: 'Fruit',
    primaryUsage: 'Food',
    secondaryUsage: null,
    description: 'Sezonluk sebze; açık tarla sulamalı senaryo.',
  },
  {
    code: 'potato',
    nameTr: 'Patates',
    nameEn: 'Potato',
    scientificName: 'Solanum tuberosum',
    cropGroup: 'Vegetable',
    family: 'Solanaceae',
    growingType: 'Vegetable',
    rainfed: false,
    irrigated: true,
    firstCrop: true,
    secondCrop: false,
    seedType: 'Tuber',
    harvestType: 'Root',
    economicPart: 'Tuber',
    primaryUsage: 'Food',
    secondaryUsage: null,
    description: 'Sezonluk sebze; açık tarla sulamalı senaryo.',
  },
  {
    code: 'onion',
    nameTr: 'Soğan',
    nameEn: 'Onion',
    scientificName: 'Allium cepa',
    cropGroup: 'Vegetable',
    family: 'Amaryllidaceae',
    growingType: 'Vegetable',
    rainfed: false,
    irrigated: true,
    firstCrop: true,
    secondCrop: false,
    seedType: 'Seedling',
    harvestType: 'Root',
    economicPart: 'Bulb',
    primaryUsage: 'Food',
    secondaryUsage: null,
    description: 'Sezonluk sebze; açık tarla sulamalı senaryo.',
  },
  {
    code: 'garlic',
    nameTr: 'Sarımsak',
    nameEn: 'Garlic',
    scientificName: 'Allium sativum',
    cropGroup: 'Vegetable',
    family: 'Amaryllidaceae',
    growingType: 'Vegetable',
    rainfed: false,
    irrigated: true,
    firstCrop: true,
    secondCrop: false,
    seedType: 'Cutting',
    harvestType: 'Root',
    economicPart: 'Bulb',
    primaryUsage: 'Food',
    secondaryUsage: null,
    description: 'Sezonluk sebze; açık tarla sulamalı senaryo.',
  },
];

function sectionShell(
  cropKnowledgeId: string,
  now: string,
  sourceReferenceId: string | null,
) {
  return {
    id: id(),
    cropKnowledgeId,
    version: 1,
    sourceReferenceId,
    verificationStatus: 'Draft' as const,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    notes: 'Phase 2.1 shell — numeric requirements deferred.',
  };
}

/**
 * Seeds Crop Knowledge roots + General Information (+ empty section shells).
 * Does not invent suitability threshold values.
 */
export async function seedCropKnowledgeGeneralInformation(
  ckRepo: CropKnowledgeRepository,
  psRepo?: PhysicalSuitabilityRepository,
): Promise<void> {
  const now = new Date().toISOString();
  let sourceId: string | null = null;
  if (psRepo) {
    const refs = await psRepo.listSourceReferences();
    sourceId = refs[0]?.id ?? null;
  }

  for (const seed of GI_SEEDS) {
    // Idempotent + incremental: only missing crop codes are upserted, so new
    // pilot crops added later can join the catalog without reseeding
    // everything (and without touching already-seeded/edited rows).
    const existingKnowledge = await ckRepo.getKnowledgeByCropCode(seed.code);
    if (existingKnowledge) continue;

    let cropProfileId: string | null = null;
    if (psRepo) {
      const profile = await psRepo.getCropByCode(seed.code);
      cropProfileId = profile?.id ?? null;
    }

    const knowledge: CropKnowledge = {
      id: id(),
      cropProfileId,
      cropCode: seed.code,
      version: 1,
      sourceReferenceId: sourceId,
      verificationStatus: 'Draft',
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await ckRepo.upsertKnowledge(knowledge);

    const gi: CropGeneralInformation = {
      id: id(),
      cropKnowledgeId: knowledge.id,
      version: 1,
      sourceReferenceId: sourceId,
      verificationStatus: 'Draft',
      createdAt: now,
      updatedAt: now,
      isActive: true,
      identityCode: seed.code,
      nameTr: seed.nameTr,
      nameEn: seed.nameEn,
      scientificName: seed.scientificName,
      faoCode: null, // TODO: fill after source verification
      eppoCode: null,
      cropGroup: seed.cropGroup,
      family: seed.family,
      lifecycle: 'Seasonal',
      growingType: seed.growingType,
      supportsOpenField: true,
      supportsGreenhouse: false,
      supportsRainfed: seed.rainfed,
      supportsIrrigated: seed.irrigated,
      supportsFirstCrop: seed.firstCrop,
      supportsSecondCrop: seed.secondCrop,
      seedType: seed.seedType,
      harvestType: seed.harvestType,
      typicalGrowingDurationDays: null,
      typicalRootDepthCm: null,
      typicalPlantHeightCm: null,
      economicPart: seed.economicPart,
      primaryUsage: seed.primaryUsage,
      secondaryUsage: seed.secondaryUsage,
      regionAvailability: ['TR-GA'],
      description: seed.description,
      photoUrl: null,
      iconUrl: null,
      scientificReferenceIds: sourceId ? [sourceId] : [],
    };
    await ckRepo.upsertGeneralInformation(gi);

    const sci: CropScientificIdentity = {
      ...sectionShell(knowledge.id, now, sourceId),
      scientificName: seed.scientificName,
      faoCode: null,
      eppoCode: null,
      family: seed.family,
      genus: seed.scientificName.split(' ')[0] ?? null,
      notes: 'Synced from General Information identity; codes pending verification.',
    };
    await ckRepo.upsertScientificIdentity(sci);

    await ckRepo.upsertPhenology(sectionShell(knowledge.id, now, sourceId));
    await ckRepo.upsertClimateRequirements(sectionShell(knowledge.id, now, sourceId));
    await ckRepo.upsertSoilRequirements(sectionShell(knowledge.id, now, sourceId));
    await ckRepo.upsertWaterRequirements(sectionShell(knowledge.id, now, sourceId));
    await ckRepo.upsertTerrainRequirements(sectionShell(knowledge.id, now, sourceId));
    await ckRepo.upsertProductionCalendar({
      ...sectionShell(knowledge.id, now, sourceId),
      regionCode: 'TR-GA',
    });
    await ckRepo.upsertRiskProfile(sectionShell(knowledge.id, now, sourceId));
    await ckRepo.upsertReferences({
      ...sectionShell(knowledge.id, now, sourceId),
      referenceIds: sourceId ? [sourceId] : [],
      notes: 'Phase 2.1 shell — curated reference list deferred.',
    });
  }
}
