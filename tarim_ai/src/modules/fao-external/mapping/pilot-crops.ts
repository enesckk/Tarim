import type { GaezCropMapping, PilotInternalCrop } from '../types/models.js';
import { createDraftMapping } from '../gaez/core.js';

/**
 * Internal crop code used by knowledge JSON for maize pilot alias.
 */
export function resolveInternalCropCode(pilot: PilotInternalCrop): string {
  if (pilot === 'maize') return 'corn';
  if (pilot === 'red_lentil') return 'lentil';
  return pilot;
}

export type PilotCropReportRow = {
  pilotCode: PilotInternalCrop;
  internalCropCode: string;
  scientificName: string;
  ecocropId: string | null;
  ecocropImportStatus: 'not_imported' | 'draft' | 'reviewed' | 'approved' | 'rejected';
  gaezVersion: 'v4' | 'v5' | null;
  gaezCropCode: string | null;
  gaezDatasetAvailable: boolean;
  rainfedLayerAvailable: boolean;
  irrigatedLayerAvailable: boolean;
  yieldLayerAvailable: boolean;
  mappingReviewStatus: GaezCropMapping['reviewStatus'];
  notes: string[];
};

/** Observed GAEZ v4 res05 crop labels from official ImageServer (2026-07-30 audit). */
const GAEZ_V4_PRESENT: Record<
  string,
  { gaezCropCode: string; rainfed: boolean; irrigated: boolean; yield: boolean }
> = {
  wheat: { gaezCropCode: 'Wheat', rainfed: true, irrigated: true, yield: true },
  barley: { gaezCropCode: 'Barley', rainfed: true, irrigated: true, yield: true },
  chickpea: { gaezCropCode: 'Chickpea', rainfed: true, irrigated: true, yield: true },
  corn: { gaezCropCode: 'Maize', rainfed: true, irrigated: true, yield: true },
  cotton: { gaezCropCode: 'Cotton', rainfed: true, irrigated: true, yield: true },
  tomato: { gaezCropCode: 'Tomato', rainfed: true, irrigated: true, yield: true },
  olive: { gaezCropCode: 'Olive', rainfed: true, irrigated: true, yield: true },
};

const SCIENTIFIC: Record<PilotInternalCrop, string> = {
  wheat: 'Triticum aestivum',
  barley: 'Hordeum vulgare',
  chickpea: 'Cicer arietinum',
  red_lentil: 'Lens culinaris',
  maize: 'Zea mays',
  cotton: 'Gossypium hirsutum',
  tomato: 'Solanum lycopersicum',
  grape: 'Vitis vinifera',
  olive: 'Olea europaea',
  pistachio: 'Pistacia vera',
};

/**
 * Builds draft mappings only. Never invents ECOCROP ids or GAEZ codes when absent.
 * Auto matches remain reviewStatus=draft (not approved).
 */
export function buildPilotDraftMappings(): GaezCropMapping[] {
  const pilots: PilotInternalCrop[] = [
    'wheat',
    'barley',
    'chickpea',
    'red_lentil',
    'maize',
    'cotton',
    'tomato',
    'grape',
    'olive',
    'pistachio',
  ];

  return pilots.map((pilot) => {
    const internal = resolveInternalCropCode(pilot);
    const gaez = GAEZ_V4_PRESENT[internal];
    return createDraftMapping({
      internalCropCode: internal,
      scientificName: SCIENTIFIC[pilot],
      ecocropId: null,
      gaezCropCode: gaez?.gaezCropCode ?? null,
      gaezVersion: gaez ? 'v4' : null,
      productionSystem: null,
      notes: [
        'auto_match_not_approved',
        gaez
          ? 'gaez_v4_res05_label_observed_in_official_catalog'
          : 'gaez_v4_crop_not_found_in_res05_catalog_no_fabricated_mapping',
        'ecocrop_id_pending_versioned_snapshot_import',
        pilot !== internal ? `pilot_alias:${pilot}->${internal}` : 'pilot_code_matches_internal',
      ],
    });
  });
}

export function buildPilotReport(mappings: GaezCropMapping[]): PilotCropReportRow[] {
  const byInternal = new Map(mappings.map((m) => [m.internalCropCode, m]));
  const pilots: PilotInternalCrop[] = [
    'wheat',
    'barley',
    'chickpea',
    'red_lentil',
    'maize',
    'cotton',
    'tomato',
    'grape',
    'olive',
    'pistachio',
  ];

  return pilots.map((pilot) => {
    const internal = resolveInternalCropCode(pilot);
    const mapping = byInternal.get(internal);
    const gaezMeta = GAEZ_V4_PRESENT[internal];
    return {
      pilotCode: pilot,
      internalCropCode: internal,
      scientificName: SCIENTIFIC[pilot],
      ecocropId: mapping?.ecocropId ?? null,
      ecocropImportStatus: 'not_imported',
      gaezVersion: mapping?.gaezVersion ?? null,
      gaezCropCode: mapping?.gaezCropCode ?? null,
      gaezDatasetAvailable: Boolean(gaezMeta),
      rainfedLayerAvailable: Boolean(gaezMeta?.rainfed),
      irrigatedLayerAvailable: Boolean(gaezMeta?.irrigated),
      yieldLayerAvailable: Boolean(gaezMeta?.yield),
      mappingReviewStatus: mapping?.reviewStatus ?? 'draft',
      notes: mapping?.notes ?? [],
    };
  });
}
