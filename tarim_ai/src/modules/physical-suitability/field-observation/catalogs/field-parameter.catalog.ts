import { catalogUuid } from '../../soil-laboratory/catalogs/catalog-ids.js';
import type { VerificationStatus } from '../../types/physical-suitability.types.js';
import type {
  FieldMeasurementScope,
  FieldParameter,
  FieldParameterCategory,
  FieldValueType,
} from '../types/field-observation.types.js';

export type FieldParameterSeedDef = {
  code: string;
  canonicalName: string;
  turkishDisplayName: string;
  englishDisplayName: string;
  category: FieldParameterCategory;
  valueType: FieldValueType;
  allowedMeasurementScope: FieldMeasurementScope;
  isRequiredForPhysicalSuitability: boolean;
  requiresPhotoEvidence: boolean;
  requiresGpsEvidence: boolean;
  requiresExpertVerification: boolean;
  displayOrder: number;
  description?: string | null;
};

/**
 * Seed catalog — Phase 2.2H.
 * No scientific class thresholds. No enum options without verified sources.
 */
export const FIELD_PARAMETER_SEED: readonly FieldParameterSeedDef[] = [
  { code: 'EFFECTIVE_ROOTING_DEPTH', canonicalName: 'Effective rooting depth', turkishDisplayName: 'Etkili kök derinliği', englishDisplayName: 'Effective rooting depth', category: 'SOIL_PROFILE', valueType: 'DEPTH', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: true, requiresPhotoEvidence: false, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 10 },
  { code: 'TOTAL_SOIL_DEPTH', canonicalName: 'Total soil depth', turkishDisplayName: 'Toplam toprak derinliği', englishDisplayName: 'Total soil depth', category: 'SOIL_PROFILE', valueType: 'DEPTH', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: true, requiresPhotoEvidence: false, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 20 },
  { code: 'DRAINAGE_CLASS', canonicalName: 'Drainage class', turkishDisplayName: 'Drenaj sınıfı', englishDisplayName: 'Drainage class', category: 'DRAINAGE', valueType: 'ENUM', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: true, requiresPhotoEvidence: false, requiresGpsEvidence: true, requiresExpertVerification: true, displayOrder: 30 },
  { code: 'INTERNAL_DRAINAGE', canonicalName: 'Internal drainage', turkishDisplayName: 'İç drenaj', englishDisplayName: 'Internal drainage', category: 'DRAINAGE', valueType: 'CLASSIFICATION', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 40 },
  { code: 'EXTERNAL_DRAINAGE', canonicalName: 'External drainage', turkishDisplayName: 'Dış drenaj', englishDisplayName: 'External drainage', category: 'DRAINAGE', valueType: 'CLASSIFICATION', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 50 },
  { code: 'PONDING_PRESENCE', canonicalName: 'Ponding presence', turkishDisplayName: 'Göllenme varlığı', englishDisplayName: 'Ponding presence', category: 'DRAINAGE', valueType: 'BOOLEAN', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 60 },
  { code: 'PONDING_DURATION', canonicalName: 'Ponding duration', turkishDisplayName: 'Göllenme süresi', englishDisplayName: 'Ponding duration', category: 'DRAINAGE', valueType: 'TEXT', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 70 },
  { code: 'WATERLOGGING_RISK', canonicalName: 'Waterlogging risk', turkishDisplayName: 'Su baskını riski', englishDisplayName: 'Waterlogging risk', category: 'WATER', valueType: 'CLASSIFICATION', allowedMeasurementScope: 'ZONE', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: true, displayOrder: 80 },
  { code: 'GROUNDWATER_DEPTH', canonicalName: 'Groundwater depth', turkishDisplayName: 'Yeraltı suyu derinliği', englishDisplayName: 'Groundwater depth', category: 'WATER', valueType: 'DEPTH', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 90 },
  { code: 'STONE_CONTENT_CLASS', canonicalName: 'Stone content class', turkishDisplayName: 'Taş içeriği sınıfı', englishDisplayName: 'Stone content class', category: 'STONINESS', valueType: 'ENUM', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: true, requiresPhotoEvidence: true, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 100 },
  { code: 'SURFACE_STONINESS', canonicalName: 'Surface stoniness', turkishDisplayName: 'Yüzey taşlılığı', englishDisplayName: 'Surface stoniness', category: 'STONINESS', valueType: 'CLASSIFICATION', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 110 },
  { code: 'SUBSURFACE_STONINESS', canonicalName: 'Subsurface stoniness', turkishDisplayName: 'Alt yüzey taşlılığı', englishDisplayName: 'Subsurface stoniness', category: 'STONINESS', valueType: 'CLASSIFICATION', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 120 },
  { code: 'ROCK_OUTCROP_PERCENT', canonicalName: 'Rock outcrop percent', turkishDisplayName: 'Kaya çıkıntısı yüzdesi', englishDisplayName: 'Rock outcrop percent', category: 'STONINESS', valueType: 'PERCENTAGE', allowedMeasurementScope: 'ZONE', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 130 },
  { code: 'COARSE_FRAGMENT_CLASS', canonicalName: 'Coarse fragment class', turkishDisplayName: 'Kaba fragman sınıfı', englishDisplayName: 'Coarse fragment class', category: 'STONINESS', valueType: 'ENUM', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 140 },
  { code: 'COMPACTION_CLASS', canonicalName: 'Compaction class', turkishDisplayName: 'Sıkışma sınıfı', englishDisplayName: 'Compaction class', category: 'COMPACTION', valueType: 'ENUM', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: true, requiresPhotoEvidence: false, requiresGpsEvidence: true, requiresExpertVerification: true, displayOrder: 150 },
  { code: 'PLOW_PAN_PRESENCE', canonicalName: 'Plow pan presence', turkishDisplayName: 'Pulluk tabanı varlığı', englishDisplayName: 'Plow pan presence', category: 'COMPACTION', valueType: 'BOOLEAN', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 160 },
  { code: 'HARDPAN_PRESENCE', canonicalName: 'Hardpan presence', turkishDisplayName: 'Sert tabaka varlığı', englishDisplayName: 'Hardpan presence', category: 'COMPACTION', valueType: 'BOOLEAN', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 170 },
  { code: 'PENETRATION_RESISTANCE', canonicalName: 'Penetration resistance', turkishDisplayName: 'Penetrasyon direnci', englishDisplayName: 'Penetration resistance', category: 'COMPACTION', valueType: 'NUMERIC', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 180 },
  { code: 'EROSION_CLASS', canonicalName: 'Erosion class', turkishDisplayName: 'Erozyon sınıfı', englishDisplayName: 'Erosion class', category: 'EROSION', valueType: 'ENUM', allowedMeasurementScope: 'ZONE', isRequiredForPhysicalSuitability: true, requiresPhotoEvidence: true, requiresGpsEvidence: true, requiresExpertVerification: true, displayOrder: 190 },
  { code: 'EROSION_TYPE', canonicalName: 'Erosion type', turkishDisplayName: 'Erozyon tipi', englishDisplayName: 'Erosion type', category: 'EROSION', valueType: 'ENUM', allowedMeasurementScope: 'ZONE', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 200 },
  { code: 'RILL_EROSION_PRESENCE', canonicalName: 'Rill erosion presence', turkishDisplayName: 'Oluk erozyonu varlığı', englishDisplayName: 'Rill erosion presence', category: 'EROSION', valueType: 'BOOLEAN', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 210 },
  { code: 'GULLY_EROSION_PRESENCE', canonicalName: 'Gully erosion presence', turkishDisplayName: 'Selinti erozyonu varlığı', englishDisplayName: 'Gully erosion presence', category: 'EROSION', valueType: 'BOOLEAN', allowedMeasurementScope: 'ZONE', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 220 },
  { code: 'DEPOSITION_PRESENCE', canonicalName: 'Deposition presence', turkishDisplayName: 'Birikinti varlığı', englishDisplayName: 'Deposition presence', category: 'EROSION', valueType: 'BOOLEAN', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 230 },
  { code: 'SURFACE_CRUSTING', canonicalName: 'Surface crusting', turkishDisplayName: 'Yüzey kabuklanması', englishDisplayName: 'Surface crusting', category: 'SURFACE', valueType: 'BOOLEAN', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 240 },
  { code: 'SOIL_CRACKING', canonicalName: 'Soil cracking', turkishDisplayName: 'Toprak çatlaması', englishDisplayName: 'Soil cracking', category: 'SURFACE', valueType: 'BOOLEAN', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 250 },
  { code: 'SALINITY_CRUST', canonicalName: 'Salinity crust', turkishDisplayName: 'Tuzluluk kabuğu', englishDisplayName: 'Salinity crust', category: 'SURFACE', valueType: 'BOOLEAN', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 260 },
  { code: 'SURFACE_COLOR', canonicalName: 'Surface color', turkishDisplayName: 'Yüzey rengi', englishDisplayName: 'Surface color', category: 'SURFACE', valueType: 'TEXT', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 270 },
  { code: 'SURFACE_TEXTURE_OBSERVATION', canonicalName: 'Surface texture observation', turkishDisplayName: 'Yüzey tekstür gözlemi', englishDisplayName: 'Surface texture observation', category: 'SURFACE', valueType: 'TEXT', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 280 },
  { code: 'SLOPE_OBSERVATION', canonicalName: 'Slope observation', turkishDisplayName: 'Eğim gözlemi', englishDisplayName: 'Slope observation', category: 'SURFACE', valueType: 'NUMERIC', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 290 },
  { code: 'ASPECT_OBSERVATION', canonicalName: 'Aspect observation', turkishDisplayName: 'Bakı gözlemi', englishDisplayName: 'Aspect observation', category: 'SURFACE', valueType: 'NUMERIC', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 300 },
  { code: 'MICRORELIEF', canonicalName: 'Microrelief', turkishDisplayName: 'Mikro rölyef', englishDisplayName: 'Microrelief', category: 'SURFACE', valueType: 'TEXT', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 310 },
  { code: 'LOCAL_DEPRESSION', canonicalName: 'Local depression', turkishDisplayName: 'Yerel çöküntü', englishDisplayName: 'Local depression', category: 'SURFACE', valueType: 'BOOLEAN', allowedMeasurementScope: 'POINT', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 320 },
  { code: 'FLOOD_EVIDENCE', canonicalName: 'Flood evidence', turkishDisplayName: 'Sel kanıtı', englishDisplayName: 'Flood evidence', category: 'WATER', valueType: 'BOOLEAN', allowedMeasurementScope: 'ZONE', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: true, requiresExpertVerification: false, displayOrder: 330 },
  { code: 'IRRIGATION_AVAILABLE', canonicalName: 'Irrigation available', turkishDisplayName: 'Sulama mevcut', englishDisplayName: 'Irrigation available', category: 'IRRIGATION', valueType: 'BOOLEAN', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: true, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 340 },
  { code: 'IRRIGATION_SOURCE_TYPE', canonicalName: 'Irrigation source type', turkishDisplayName: 'Sulama kaynağı tipi', englishDisplayName: 'Irrigation source type', category: 'IRRIGATION', valueType: 'ENUM', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 350 },
  { code: 'IRRIGATION_METHOD', canonicalName: 'Irrigation method', turkishDisplayName: 'Sulama yöntemi', englishDisplayName: 'Irrigation method', category: 'IRRIGATION', valueType: 'ENUM', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 360 },
  { code: 'IRRIGATION_CONTINUITY', canonicalName: 'Irrigation continuity', turkishDisplayName: 'Sulama sürekliliği', englishDisplayName: 'Irrigation continuity', category: 'IRRIGATION', valueType: 'CLASSIFICATION', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 370 },
  { code: 'IRRIGATION_DISCHARGE', canonicalName: 'Irrigation discharge', turkishDisplayName: 'Sulama debisi', englishDisplayName: 'Irrigation discharge', category: 'IRRIGATION', valueType: 'NUMERIC', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 380 },
  { code: 'IRRIGATION_INFRASTRUCTURE_CONDITION', canonicalName: 'Irrigation infrastructure condition', turkishDisplayName: 'Sulama altyapı durumu', englishDisplayName: 'Irrigation infrastructure condition', category: 'INFRASTRUCTURE', valueType: 'ENUM', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: true, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 390 },
  { code: 'WATER_ACCESS_DISTANCE', canonicalName: 'Water access distance', turkishDisplayName: 'Su erişim mesafesi', englishDisplayName: 'Water access distance', category: 'IRRIGATION', valueType: 'NUMERIC', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 400 },
  { code: 'CULTIVABLE_AREA_PERCENT', canonicalName: 'Cultivable area percent', turkishDisplayName: 'İşlenebilir alan yüzdesi', englishDisplayName: 'Cultivable area percent', category: 'LAND_USE', valueType: 'PERCENTAGE', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 410 },
  { code: 'OBSTACLE_PERCENT', canonicalName: 'Obstacle percent', turkishDisplayName: 'Engel yüzdesi', englishDisplayName: 'Obstacle percent', category: 'LAND_USE', valueType: 'PERCENTAGE', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 420 },
  { code: 'MACHINERY_ACCESS', canonicalName: 'Machinery access', turkishDisplayName: 'Makine erişimi', englishDisplayName: 'Machinery access', category: 'INFRASTRUCTURE', valueType: 'ENUM', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 430 },
  { code: 'ROAD_ACCESS', canonicalName: 'Road access', turkishDisplayName: 'Yol erişimi', englishDisplayName: 'Road access', category: 'INFRASTRUCTURE', valueType: 'BOOLEAN', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 440 },
  { code: 'FIELD_SHAPE_CONSTRAINT', canonicalName: 'Field shape constraint', turkishDisplayName: 'Parsel şekil kısıtı', englishDisplayName: 'Field shape constraint', category: 'LAND_USE', valueType: 'TEXT', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 450 },
  { code: 'CURRENT_CROP', canonicalName: 'Current crop', turkishDisplayName: 'Mevcut ürün', englishDisplayName: 'Current crop', category: 'VEGETATION', valueType: 'TEXT', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 460 },
  { code: 'PREVIOUS_CROP', canonicalName: 'Previous crop', turkishDisplayName: 'Önceki ürün', englishDisplayName: 'Previous crop', category: 'VEGETATION', valueType: 'TEXT', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 470 },
  { code: 'CROP_ROTATION_HISTORY', canonicalName: 'Crop rotation history', turkishDisplayName: 'Ekim nöbeti geçmişi', englishDisplayName: 'Crop rotation history', category: 'MANAGEMENT', valueType: 'TEXT', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 480 },
  { code: 'YIELD_HISTORY_AVAILABLE', canonicalName: 'Yield history available', turkishDisplayName: 'Verim geçmişi mevcut', englishDisplayName: 'Yield history available', category: 'MANAGEMENT', valueType: 'BOOLEAN', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 490 },
  { code: 'DISEASE_HISTORY_AVAILABLE', canonicalName: 'Disease history available', turkishDisplayName: 'Hastalık geçmişi mevcut', englishDisplayName: 'Disease history available', category: 'MANAGEMENT', valueType: 'BOOLEAN', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 500 },
  { code: 'PEST_HISTORY_AVAILABLE', canonicalName: 'Pest history available', turkishDisplayName: 'Zararlı geçmişi mevcut', englishDisplayName: 'Pest history available', category: 'MANAGEMENT', valueType: 'BOOLEAN', allowedMeasurementScope: 'PARCEL', isRequiredForPhysicalSuitability: false, requiresPhotoEvidence: false, requiresGpsEvidence: false, requiresExpertVerification: false, displayOrder: 510 },
] as const;

export function fieldParameterIdForCode(code: string): string {
  return catalogUuid('field-parameter', code);
}

export function buildFieldParameter(
  def: FieldParameterSeedDef,
  now: string,
): FieldParameter {
  return {
    id: fieldParameterIdForCode(def.code),
    code: def.code,
    canonicalName: def.canonicalName,
    turkishDisplayName: def.turkishDisplayName,
    englishDisplayName: def.englishDisplayName,
    category: def.category,
    description: def.description ?? null,
    valueType: def.valueType,
    canonicalUnitId: null,
    allowedMeasurementScope: def.allowedMeasurementScope,
    isRequiredForPhysicalSuitability: def.isRequiredForPhysicalSuitability,
    requiresPhotoEvidence: def.requiresPhotoEvidence,
    requiresGpsEvidence: def.requiresGpsEvidence,
    requiresExpertVerification: def.requiresExpertVerification,
    displayOrder: def.displayOrder,
    source: null,
    verificationStatus: 'Draft' as VerificationStatus,
    createdAt: now,
    updatedAt: now,
    version: 1,
    isActive: true,
  };
}
