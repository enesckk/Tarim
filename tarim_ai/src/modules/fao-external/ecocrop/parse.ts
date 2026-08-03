import { createHash } from 'node:crypto';
import type {
  EcocropNumericThreshold,
  EcocropProfileSource,
  ReviewStatus,
} from '../types/models.js';

const KNOWN_SOURCE_FIELDS = new Set([
  'temperatureAbsoluteMinC',
  'temperatureOptimalMinC',
  'temperatureOptimalMaxC',
  'temperatureAbsoluteMaxC',
  'precipitationMinMm',
  'precipitationOptimalMinMm',
  'precipitationOptimalMaxMm',
  'precipitationMaxMm',
  'phMin',
  'phMax',
  'latitudeMin',
  'latitudeMax',
  'altitudeMinM',
  'altitudeMaxM',
]);

export type EcocropSnapshotDocument = {
  snapshotVersion: string;
  retrievedAt: string;
  sourceUrlOrId: string;
  crops: Array<{
    ecocropId: string;
    commonName?: string | null;
    scientificName: string;
    fields: Record<string, unknown>;
  }>;
};

export type ParseResult = {
  profile: EcocropProfileSource;
  rejectedThresholds: Array<{ field: string; reason: string }>;
};

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/**
 * Parses a structured ECOCROP snapshot crop entry.
 * Values without an explicit source field mapping are dropped (not invented).
 */
export function parseEcocropCrop(
  crop: EcocropSnapshotDocument['crops'][number],
  snapshot: Pick<EcocropSnapshotDocument, 'snapshotVersion' | 'retrievedAt' | 'sourceUrlOrId'>,
  status: ReviewStatus = 'draft',
): ParseResult {
  const unknownFields: string[] = [];
  const rejectedThresholds: Array<{ field: string; reason: string }> = [];
  const thresholds: EcocropNumericThreshold[] = [];
  const rawFields = { ...crop.fields };

  for (const [key, value] of Object.entries(crop.fields)) {
    if (!KNOWN_SOURCE_FIELDS.has(key)) {
      unknownFields.push(key);
      continue;
    }
    const num = asNumber(value);
    if (num == null) {
      rejectedThresholds.push({ field: key, reason: 'non_numeric_or_empty' });
      continue;
    }
    thresholds.push({
      field: key,
      value: num,
      unit: key.includes('Mm') ? 'mm' : key.includes('ph') || key.includes('Ph') ? 'pH' : key.endsWith('C') ? '°C' : key.endsWith('M') ? 'm' : null,
      sourceField: key,
    });
  }

  const profile: EcocropProfileSource = {
    provider: 'ecocrop',
    version: snapshot.snapshotVersion,
    datasetId: `ecocrop:${crop.ecocropId}`,
    cropCode: crop.ecocropId,
    scientificName: crop.scientificName,
    waterSupply: null,
    inputLevel: null,
    climateScenario: null,
    resolution: 'species-profile',
    unit: null,
    retrievedAt: snapshot.retrievedAt,
    sourceUrlOrId: snapshot.sourceUrlOrId,
    limitations: [
      'ecocrop_is_species_requirement_profile_not_parcel_observation',
      'imported_from_versioned_snapshot_not_live_analysis_fetch',
      ...(unknownFields.length ? ['ecocrop_unknown_fields_preserved_unmapped'] : []),
    ],
    ecocropId: crop.ecocropId,
    commonName: crop.commonName ?? null,
    snapshotVersion: snapshot.snapshotVersion,
    status,
    thresholds,
    rawFields,
    unknownFields,
    reviewedBy: null,
    reviewedAt: null,
  };

  return { profile, rejectedThresholds };
}

export function assertApprovedForKnowledgeUse(profile: EcocropProfileSource): void {
  if (profile.status !== 'approved') {
    throw new Error(`ECOCROP profile ${profile.ecocropId} is ${profile.status}; approved required`);
  }
}

export function hashSnapshot(doc: EcocropSnapshotDocument): string {
  return createHash('sha256').update(JSON.stringify(doc)).digest('hex').slice(0, 24);
}

export function importEcocropSnapshot(
  doc: EcocropSnapshotDocument,
): { profiles: EcocropProfileSource[]; unknownFieldCensus: Record<string, number> } {
  const profiles: EcocropProfileSource[] = [];
  const unknownFieldCensus: Record<string, number> = {};
  for (const crop of doc.crops) {
    const { profile } = parseEcocropCrop(crop, doc, 'draft');
    profiles.push(profile);
    for (const field of profile.unknownFields) {
      unknownFieldCensus[field] = (unknownFieldCensus[field] ?? 0) + 1;
    }
  }
  return { profiles, unknownFieldCensus };
}
