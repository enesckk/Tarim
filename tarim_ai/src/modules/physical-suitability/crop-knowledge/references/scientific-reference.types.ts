import type { VerificationStatus } from '../../types/physical-suitability.types.js';

/**
 * Phase 2.1I — Scientific Reference Library.
 * Standalone bibliographic entities; crops link many-to-many.
 * No suitability scoring.
 */
export type ReferenceType =
  | 'FAO'
  | 'TAGEM'
  | 'MINISTRY'
  | 'UNIVERSITY'
  | 'JOURNAL'
  | 'BOOK'
  | 'THESIS'
  | 'STANDARD';

export const REFERENCE_TYPES: readonly ReferenceType[] = [
  'FAO',
  'TAGEM',
  'MINISTRY',
  'UNIVERSITY',
  'JOURNAL',
  'BOOK',
  'THESIS',
  'STANDARD',
] as const;

export type ScientificReference = {
  id: string;
  title: string;
  authors: string[];
  organization: string | null;
  publicationYear: number | null;
  country: string | null;
  doi: string | null;
  isbn: string | null;
  issn: string | null;
  url: string | null;
  referenceType: ReferenceType;
  language: string | null;
  /** 0–100 qualitative reliability; null until curated. Not a suitability score. */
  reliabilityScore: number | null;
  notes: string | null;
  sourceReferenceId: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

/** Junction: one crop ↔ many scientific references (and reverse). */
export type CropScientificReferenceLink = {
  id: string;
  cropKnowledgeId: string;
  scientificReferenceId: string;
  referencesSectionId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

export type CropReferencesDto = {
  sectionId: string;
  cropKnowledgeId: string;
  cropCode: string | null;
  notes: string | null;
  references: ScientificReference[];
  links: CropScientificReferenceLink[];
};

export type ScientificReferenceValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type ScientificReferenceValidationResult = {
  valid: boolean;
  issues: ScientificReferenceValidationIssue[];
  scientificReferenceId?: string;
  cropKnowledgeId?: string;
};
