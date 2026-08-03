import { newId, type PhysicalSuitabilityRepository } from '../repositories/physical-suitability.repository.js';
import type {
  CriterionDefinition,
  CropGroup,
  DecisionRole,
  EvaluationType,
  MissingDataBehavior,
  RequirementLevel,
  SourceType,
} from '../types/physical-suitability.types.js';

const ALL_SOURCES: SourceType[] = [
  'Laboratory',
  'FieldMeasurement',
  'OfficialLocal',
  'RemoteSensing',
  'GlobalModel',
  'UserDeclared',
];

type CriterionSeed = Omit<CriterionDefinition, 'id' | 'isActive' | 'allowedSourceTypes'> & {
  allowedSourceTypes?: SourceType[];
};

const CRITERIA: CriterionSeed[] = [
  { code: 'climate.minimum_temperature', name: 'Minimum temperature', category: 'climate', dataType: 'Decimal', unit: '°C', description: 'Minimum air temperature relevant to crop stress.' },
  { code: 'climate.maximum_temperature', name: 'Maximum temperature', category: 'climate', dataType: 'Decimal', unit: '°C', description: 'Maximum air temperature relevant to crop stress.' },
  { code: 'climate.optimum_temperature', name: 'Optimum temperature', category: 'climate', dataType: 'Range', unit: '°C', description: 'Optimum temperature range for growth.' },
  { code: 'climate.frost_days', name: 'Frost days', category: 'climate', dataType: 'Integer', unit: 'days', description: 'Count of frost days in season.' },
  { code: 'climate.extreme_heat_days', name: 'Extreme heat days', category: 'climate', dataType: 'Integer', unit: 'days', description: 'Count of extreme heat days.' },
  { code: 'climate.growing_degree_days', name: 'Growing degree days', category: 'climate', dataType: 'Decimal', unit: 'GDD', description: 'Accumulated growing degree days.' },
  { code: 'climate.season_length', name: 'Season length', category: 'climate', dataType: 'Integer', unit: 'days', description: 'Available growing season length.' },
  { code: 'climate.seasonal_rainfall', name: 'Seasonal rainfall', category: 'climate', dataType: 'Decimal', unit: 'mm', description: 'Seasonal precipitation total.' },
  { code: 'climate.longest_dry_period', name: 'Longest dry period', category: 'climate', dataType: 'Integer', unit: 'days', description: 'Longest consecutive dry period.' },
  { code: 'soil.ph', name: 'Soil pH', category: 'soil', dataType: 'Decimal', unit: 'pH', description: 'Soil acidity/alkalinity.' },
  { code: 'soil.ec', name: 'Soil EC', category: 'soil', dataType: 'Decimal', unit: 'dS/m', description: 'Soil electrical conductivity.' },
  { code: 'soil.texture', name: 'Soil texture', category: 'soil', dataType: 'Enum', unit: null, description: 'Textural class.' },
  { code: 'soil.clay_percent', name: 'Clay percent', category: 'soil', dataType: 'Decimal', unit: '%', description: 'Clay fraction.' },
  { code: 'soil.sand_percent', name: 'Sand percent', category: 'soil', dataType: 'Decimal', unit: '%', description: 'Sand fraction.' },
  { code: 'soil.silt_percent', name: 'Silt percent', category: 'soil', dataType: 'Decimal', unit: '%', description: 'Silt fraction.' },
  { code: 'soil.organic_matter', name: 'Organic matter', category: 'soil', dataType: 'Decimal', unit: '%', description: 'Soil organic matter.' },
  { code: 'soil.lime', name: 'Lime / CaCO3', category: 'soil', dataType: 'Decimal', unit: '%', description: 'Calcium carbonate content.' },
  { code: 'soil.rootable_depth', name: 'Rootable depth', category: 'soil', dataType: 'Decimal', unit: 'cm', description: 'Effective rootable soil depth.' },
  { code: 'soil.drainage', name: 'Drainage class', category: 'soil', dataType: 'Enum', unit: null, description: 'Soil drainage class.' },
  { code: 'soil.stoniness', name: 'Stoniness', category: 'soil', dataType: 'Enum', unit: null, description: 'Surface/profile stoniness.' },
  { code: 'soil.compaction', name: 'Compaction', category: 'soil', dataType: 'Enum', unit: null, description: 'Soil compaction class.' },
  { code: 'soil.waterlogging', name: 'Waterlogging', category: 'soil', dataType: 'Boolean', unit: null, description: 'Persistent waterlogging present.' },
  { code: 'soil.sodicity', name: 'Sodicity', category: 'soil', dataType: 'Decimal', unit: null, description: 'Sodicity indicator.' },
  { code: 'water.irrigation_available', name: 'Irrigation available', category: 'water', dataType: 'Boolean', unit: null, description: 'Whether irrigation water is available.' },
  { code: 'water.seasonal_availability', name: 'Seasonal water availability', category: 'water', dataType: 'Enum', unit: null, description: 'Seasonal irrigation availability class.' },
  { code: 'water.ec', name: 'Irrigation water EC', category: 'water', dataType: 'Decimal', unit: 'dS/m', description: 'Irrigation water salinity.' },
  { code: 'water.sar', name: 'Irrigation water SAR', category: 'water', dataType: 'Decimal', unit: null, description: 'Sodium adsorption ratio.' },
  { code: 'water.ph', name: 'Irrigation water pH', category: 'water', dataType: 'Decimal', unit: 'pH', description: 'Irrigation water pH.' },
  { code: 'water.boron', name: 'Boron', category: 'water', dataType: 'Decimal', unit: 'mg/L', description: 'Boron concentration.' },
  { code: 'water.sodium', name: 'Sodium', category: 'water', dataType: 'Decimal', unit: 'mg/L', description: 'Sodium concentration.' },
  { code: 'water.chloride', name: 'Chloride', category: 'water', dataType: 'Decimal', unit: 'mg/L', description: 'Chloride concentration.' },
  { code: 'terrain.mean_slope', name: 'Mean slope', category: 'terrain', dataType: 'Decimal', unit: 'percent', description: 'Mean parcel slope.' },
  { code: 'terrain.maximum_slope', name: 'Maximum slope', category: 'terrain', dataType: 'Decimal', unit: 'percent', description: 'Maximum parcel slope.' },
  { code: 'terrain.slope_distribution', name: 'Slope distribution', category: 'terrain', dataType: 'Distribution', unit: 'percent', description: 'Slope class distribution.' },
  { code: 'terrain.aspect', name: 'Aspect', category: 'terrain', dataType: 'Enum', unit: null, description: 'Dominant aspect.' },
  { code: 'terrain.elevation', name: 'Elevation', category: 'terrain', dataType: 'Decimal', unit: 'm', description: 'Mean elevation.' },
  { code: 'terrain.erosion_risk', name: 'Erosion risk', category: 'terrain', dataType: 'Enum', unit: null, description: 'Erosion risk class.' },
  { code: 'terrain.ponding_risk', name: 'Ponding risk', category: 'terrain', dataType: 'Enum', unit: null, description: 'Ponding risk class.' },
  { code: 'season.planting_date', name: 'Planting date', category: 'season', dataType: 'Date', unit: null, description: 'Intended planting date.' },
  { code: 'season.harvest_deadline', name: 'Harvest deadline', category: 'season', dataType: 'Date', unit: null, description: 'Latest acceptable harvest date.' },
  { code: 'season.remaining_growing_days', name: 'Remaining growing days', category: 'season', dataType: 'Integer', unit: 'days', description: 'Days remaining in season.' },
  { code: 'season.available_gdd', name: 'Available GDD', category: 'season', dataType: 'Decimal', unit: 'GDD', description: 'Available GDD for remaining season.' },
  { code: 'season.frost_overlap', name: 'Frost overlap', category: 'season', dataType: 'Boolean', unit: null, description: 'Frost coincides with sensitive stages.' },
  { code: 'season.extreme_heat_overlap', name: 'Extreme heat overlap', category: 'season', dataType: 'Boolean', unit: null, description: 'Extreme heat coincides with sensitive stages.' },
];

type PilotCrop = {
  code: string;
  name: string;
  scientificName: string | null;
  cropGroup: CropGroup;
  scenarios: Array<{ code: string; name: string; productionType: 'Rainfed' | 'Irrigated' }>;
};

const PILOTS: PilotCrop[] = [
  { code: 'wheat', name: 'Buğday', scientificName: 'Triticum aestivum', cropGroup: 'Cereal', scenarios: [
    { code: 'wheat_rainfed_open', name: 'Buğday / kuru / açık tarla', productionType: 'Rainfed' },
    { code: 'wheat_irrigated_open', name: 'Buğday / sulamalı / açık tarla', productionType: 'Irrigated' },
  ]},
  { code: 'barley', name: 'Arpa', scientificName: 'Hordeum vulgare', cropGroup: 'Cereal', scenarios: [
    { code: 'barley_rainfed_open', name: 'Arpa / kuru / açık tarla', productionType: 'Rainfed' },
  ]},
  { code: 'chickpea', name: 'Nohut', scientificName: 'Cicer arietinum', cropGroup: 'Legume', scenarios: [
    { code: 'chickpea_rainfed_open', name: 'Nohut / kuru / açık tarla', productionType: 'Rainfed' },
  ]},
  { code: 'red_lentil', name: 'Kırmızı mercimek', scientificName: 'Lens culinaris', cropGroup: 'Legume', scenarios: [
    { code: 'red_lentil_rainfed_open', name: 'Kırmızı mercimek / kuru / açık tarla', productionType: 'Rainfed' },
  ]},
  { code: 'corn', name: 'Mısır', scientificName: 'Zea mays', cropGroup: 'Cereal', scenarios: [
    { code: 'corn_irrigated_open', name: 'Mısır / sulamalı / açık tarla', productionType: 'Irrigated' },
  ]},
  { code: 'cotton', name: 'Pamuk', scientificName: 'Gossypium hirsutum', cropGroup: 'IndustrialCrop', scenarios: [
    { code: 'cotton_irrigated_open', name: 'Pamuk / sulamalı / açık tarla', productionType: 'Irrigated' },
  ]},
  { code: 'tomato', name: 'Domates', scientificName: 'Solanum lycopersicum', cropGroup: 'Vegetable', scenarios: [
    { code: 'tomato_irrigated_open', name: 'Domates / açık tarla sulamalı', productionType: 'Irrigated' },
  ]},
  { code: 'pepper', name: 'Biber', scientificName: 'Capsicum annuum', cropGroup: 'Vegetable', scenarios: [
    { code: 'pepper_irrigated_open', name: 'Biber / açık tarla sulamalı', productionType: 'Irrigated' },
  ]},
  { code: 'melon', name: 'Kavun', scientificName: 'Cucumis melo', cropGroup: 'MelonCrop', scenarios: [
    { code: 'melon_irrigated_open', name: 'Kavun / açık tarla sulamalı', productionType: 'Irrigated' },
  ]},
  { code: 'watermelon', name: 'Karpuz', scientificName: 'Citrullus lanatus', cropGroup: 'MelonCrop', scenarios: [
    { code: 'watermelon_irrigated_open', name: 'Karpuz / açık tarla sulamalı', productionType: 'Irrigated' },
  ]},
  { code: 'sunflower', name: 'Ayçiçeği', scientificName: 'Helianthus annuus', cropGroup: 'IndustrialCrop', scenarios: [
    { code: 'sunflower_rainfed_open', name: 'Ayçiçeği / kuru / açık tarla', productionType: 'Rainfed' },
    { code: 'sunflower_irrigated_open', name: 'Ayçiçeği / sulamalı / açık tarla', productionType: 'Irrigated' },
  ]},
  { code: 'eggplant', name: 'Patlıcan', scientificName: 'Solanum melongena', cropGroup: 'Vegetable', scenarios: [
    { code: 'eggplant_irrigated_open', name: 'Patlıcan / açık tarla sulamalı', productionType: 'Irrigated' },
  ]},
  { code: 'cucumber', name: 'Salatalık', scientificName: 'Cucumis sativus', cropGroup: 'Vegetable', scenarios: [
    { code: 'cucumber_irrigated_open', name: 'Salatalık / açık tarla sulamalı', productionType: 'Irrigated' },
  ]},
  { code: 'zucchini', name: 'Kabak', scientificName: 'Cucurbita pepo', cropGroup: 'Vegetable', scenarios: [
    { code: 'zucchini_irrigated_open', name: 'Kabak / açık tarla sulamalı', productionType: 'Irrigated' },
  ]},
  { code: 'potato', name: 'Patates', scientificName: 'Solanum tuberosum', cropGroup: 'Vegetable', scenarios: [
    { code: 'potato_irrigated_open', name: 'Patates / açık tarla sulamalı', productionType: 'Irrigated' },
  ]},
  { code: 'onion', name: 'Soğan', scientificName: 'Allium cepa', cropGroup: 'Vegetable', scenarios: [
    { code: 'onion_irrigated_open', name: 'Soğan / açık tarla sulamalı', productionType: 'Irrigated' },
  ]},
  { code: 'garlic', name: 'Sarımsak', scientificName: 'Allium sativum', cropGroup: 'Vegetable', scenarios: [
    { code: 'garlic_irrigated_open', name: 'Sarımsak / açık tarla sulamalı', productionType: 'Irrigated' },
  ]},
];

/** Structural matrix roles only — numeric thresholds intentionally null (Draft). */
type MatrixRow = {
  criterionCode: string;
  requirementLevel: RequirementLevel;
  decisionRole: DecisionRole;
  evaluationType: EvaluationType;
  missingDataBehavior: MissingDataBehavior;
};

const COMMON_MATRIX: MatrixRow[] = [
  { criterionCode: 'soil.ph', requirementLevel: 'Important', decisionRole: 'Scoring', evaluationType: 'Range', missingDataBehavior: 'ContinueWithReducedConfidence' },
  { criterionCode: 'soil.ec', requirementLevel: 'Important', decisionRole: 'CriticalBarrier', evaluationType: 'Threshold', missingDataBehavior: 'ContinueWithReducedConfidence' },
  { criterionCode: 'soil.drainage', requirementLevel: 'Required', decisionRole: 'CriticalBarrier', evaluationType: 'EnumMatch', missingDataBehavior: 'MarkInsufficientData' },
  { criterionCode: 'soil.rootable_depth', requirementLevel: 'Required', decisionRole: 'CriticalBarrier', evaluationType: 'Threshold', missingDataBehavior: 'MarkInsufficientData' },
  { criterionCode: 'terrain.mean_slope', requirementLevel: 'Important', decisionRole: 'Scoring', evaluationType: 'Range', missingDataBehavior: 'ContinueWithReducedConfidence' },
  { criterionCode: 'terrain.aspect', requirementLevel: 'Supporting', decisionRole: 'Supporting', evaluationType: 'EnumMatch', missingDataBehavior: 'WarningOnly' },
  { criterionCode: 'climate.growing_degree_days', requirementLevel: 'Required', decisionRole: 'CriticalBarrier', evaluationType: 'Threshold', missingDataBehavior: 'MarkInsufficientData' },
  { criterionCode: 'climate.season_length', requirementLevel: 'Required', decisionRole: 'CriticalBarrier', evaluationType: 'Threshold', missingDataBehavior: 'MarkInsufficientData' },
  { criterionCode: 'season.planting_date', requirementLevel: 'Required', decisionRole: 'CriticalBarrier', evaluationType: 'DateWindow', missingDataBehavior: 'MarkInsufficientData' },
];

const IRRIGATED_EXTRA: MatrixRow[] = [
  { criterionCode: 'water.irrigation_available', requirementLevel: 'Required', decisionRole: 'CriticalBarrier', evaluationType: 'Boolean', missingDataBehavior: 'MarkInsufficientData' },
  { criterionCode: 'water.ec', requirementLevel: 'Important', decisionRole: 'CriticalBarrier', evaluationType: 'Threshold', missingDataBehavior: 'ContinueWithReducedConfidence' },
];

export async function seedPhysicalSuitabilityPhase1(
  repo: PhysicalSuitabilityRepository,
): Promise<void> {
  const now = new Date().toISOString();

  const regionId = newId();
  await repo.upsertRegion({
    id: regionId,
    code: 'TR-GA',
    name: 'Gaziantep',
    country: 'TR',
    province: 'Gaziantep',
    district: null,
    climateZone: null,
    defaultPlantingWindows: [],
    defaultHarvestWindows: [],
    notes: 'Pilot agro-climatic region. Calendar windows filled in a later verification pass.',
    version: 1,
    isActive: true,
  });

  const placeholderSourceId = newId();
  await repo.upsertSourceReference({
    id: placeholderSourceId,
    title: 'Phase-1 structural seed — thresholds pending expert verification',
    organization: 'Internal',
    author: null,
    publicationYear: 2026,
    urlOrIdentifier: null,
    region: 'TR-GA',
    notes: 'No numeric agronomic thresholds were invented in Phase 1 seed.',
    retrievedAt: now,
    verificationStatus: 'Draft',
  });

  for (const c of CRITERIA) {
    await repo.upsertCriterion({
      id: newId(),
      ...c,
      allowedSourceTypes: c.allowedSourceTypes ?? ALL_SOURCES,
      isActive: true,
    });
  }

  // Default source priorities for soil.ph (lab > field > model)
  const phPriorities: SourceType[] = [
    'Laboratory',
    'FieldMeasurement',
    'OfficialLocal',
    'RemoteSensing',
    'GlobalModel',
    'UserDeclared',
  ];
  for (let i = 0; i < phPriorities.length; i++) {
    await repo.upsertDataSourcePriority({
      id: newId(),
      criterionCode: 'soil.ph',
      sourceType: phPriorities[i]!,
      priorityRank: i + 1,
      isActive: true,
    });
  }
  // Generic default for soil.ec
  for (let i = 0; i < phPriorities.length; i++) {
    await repo.upsertDataSourcePriority({
      id: newId(),
      criterionCode: 'soil.ec',
      sourceType: phPriorities[i]!,
      priorityRank: i + 1,
      isActive: true,
    });
  }

  for (const pilot of PILOTS) {
    const cropId = newId();
    await repo.upsertCrop({
      id: cropId,
      code: pilot.code,
      name: pilot.name,
      scientificName: pilot.scientificName,
      cropGroup: pilot.cropGroup,
      lifecycleType: 'Seasonal',
      defaultGrowingPeriodDays: null, // TODO: fill after source verification
      isActive: true,
      version: 1,
      sourceStatus: 'Draft',
      approvedBy: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
      notes: 'Phase-1 pilot crop. Numeric thresholds intentionally null until verified.',
    });

    for (const sc of pilot.scenarios) {
      const scenarioId = newId();
      await repo.upsertScenario({
        id: scenarioId,
        cropId,
        code: sc.code,
        name: sc.name,
        productionType: sc.productionType,
        irrigationMode: sc.productionType,
        cultivationEnvironment: 'OpenField',
        regionCode: 'TR-GA',
        isActive: true,
        version: 1,
        validFrom: null,
        validTo: null,
      });

      const matrix = [
        ...COMMON_MATRIX,
        ...(sc.productionType === 'Irrigated' ? IRRIGATED_EXTRA : []),
      ];

      for (const row of matrix) {
        const criterion = await repo.getCriterionByCode(row.criterionCode);
        if (!criterion) continue;
        const ruleId = newId();
        await repo.upsertRule({
          id: ruleId,
          cropId,
          productionScenarioId: scenarioId,
          criterionDefinitionId: criterion.id,
          criterionCode: row.criterionCode,
          requirementLevel: row.requirementLevel,
          decisionRole: row.decisionRole,
          evaluationType: row.evaluationType,
          optimalRange: null,
          acceptableRange: null,
          criticalMinimum: null,
          criticalMaximum: null,
          allowedValues: null,
          disallowedValues: null,
          weightPlaceholder: null,
          missingDataBehavior: row.missingDataBehavior,
          conditionExpression: null,
          explanationTemplate: `${pilot.name}: ${row.criterionCode} structural rule (thresholds pending).`,
          version: 1,
          sourceReferenceId: placeholderSourceId,
          isActive: true,
          verificationStatus: 'Draft',
          notes: 'TODO: attach verified numeric thresholds and promote status.',
        });

        if (row.decisionRole === 'CriticalBarrier') {
          await repo.upsertBarrierRule({
            id: newId(),
            code: `${sc.code}__${row.criterionCode.replace(/\./g, '_')}__barrier`,
            cropId,
            productionScenarioId: scenarioId,
            criterionCode: row.criterionCode,
            cropCriterionRuleId: ruleId,
            severity: 'Blocking',
            evaluationType: row.evaluationType,
            criticalMinimum: null,
            criticalMaximum: null,
            booleanExpected:
              row.evaluationType === 'Boolean' && row.criterionCode === 'water.irrigation_available'
                ? true
                : null,
            allowedValues: null,
            disallowedValues:
              row.criterionCode === 'soil.drainage' ? ['poor', 'very_poor'] : null,
            explanationTemplate:
              row.criterionCode === 'water.irrigation_available'
                ? 'Irrigation is required for this scenario but irrigation is not available.'
                : `Critical barrier on ${row.criterionCode} (thresholds pending verification).`,
            sourceReferenceId: placeholderSourceId,
            isActive: true,
            verificationStatus: 'Draft',
            version: 1,
          });
        }
      }
    }
  }
}
