import type { VerificationStatus } from '../../types/physical-suitability.types.js';

/**
 * Phase 2.1H — Crop Production Calendar.
 * Region hierarchy is structural (Country → Province → District) for future
 * il / ilçe calendars. Window dates stay null until source-verified.
 */
export type CalendarRegionScope =
  | 'Country'
  | 'Province'
  | 'District'
  | 'AgroClimatic'
  | 'Custom';

export const CALENDAR_REGION_SCOPES: readonly CalendarRegionScope[] = [
  'Country',
  'Province',
  'District',
  'AgroClimatic',
  'Custom',
] as const;

/**
 * ProductionCalendar — region-scoped calendar row per crop.
 * Planting/harvest windows remain null in Phase 2.1H (no invented dates).
 */
export type ProductionCalendar = {
  id: string;
  cropId: string;
  cropKnowledgeId: string;
  productionCalendarSectionId: string;
  /** Opaque region identifier — stable across scope upgrades. */
  regionId: string;
  /** Geographic granularity; Province = il, District = ilçe. */
  regionScope: CalendarRegionScope;
  /** Optional human-readable code (e.g. TR, TR-27, TR-27-1234, TR-GA). */
  regionCode: string | null;
  /** Optional parent region (District → Province) for future hierarchy queries. */
  parentRegionId: string | null;
  plantingStart: string | null;
  plantingEnd: string | null;
  harvestStart: string | null;
  harvestEnd: string | null;
  secondCropSupported: boolean;
  greenhouseSupported: boolean;
  rainfedSupported: boolean;
  irrigatedSupported: boolean;
  sourceReferenceId: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type CropProductionCalendarDto = {
  sectionId: string;
  cropKnowledgeId: string;
  cropCode: string | null;
  /** Legacy section default region hint (shell). */
  regionCode: string | null;
  notes: string | null;
  calendars: ProductionCalendar[];
};

export type ProductionCalendarValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type ProductionCalendarValidationResult = {
  cropKnowledgeId: string;
  valid: boolean;
  issues: ProductionCalendarValidationIssue[];
};
