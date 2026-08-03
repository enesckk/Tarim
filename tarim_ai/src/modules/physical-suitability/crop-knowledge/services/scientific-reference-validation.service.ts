import { z } from 'zod';
import type { CropKnowledgeRepository } from '../repositories/crop-knowledge.repository.js';
import {
  REFERENCE_TYPES,
  type ReferenceType,
  type ScientificReference,
  type ScientificReferenceValidationIssue,
  type ScientificReferenceValidationResult,
} from '../references/scientific-reference.types.js';

export const referenceTypeSchema = z.enum([
  'FAO',
  'TAGEM',
  'MINISTRY',
  'UNIVERSITY',
  'JOURNAL',
  'BOOK',
  'THESIS',
  'STANDARD',
]) satisfies z.ZodType<ReferenceType>;

const verificationStatusSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);

export const createScientificReferenceSchema = z.object({
  title: z.string().min(1).max(2000),
  authors: z.array(z.string().min(1).max(500)).default([]),
  organization: z.string().max(500).nullable().optional(),
  publicationYear: z.number().int().min(1000).max(2100).nullable().optional(),
  country: z.string().max(128).nullable().optional(),
  doi: z.string().max(256).nullable().optional(),
  isbn: z.string().max(64).nullable().optional(),
  issn: z.string().max(32).nullable().optional(),
  url: z.string().url().max(2000).nullable().optional().or(z.literal('').transform(() => null)),
  referenceType: referenceTypeSchema,
  language: z.string().min(2).max(16).nullable().optional(),
  reliabilityScore: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
  sourceReferenceId: z.string().uuid().nullable().optional(),
  verificationStatus: verificationStatusSchema.optional(),
});

export const updateScientificReferenceSchema = createScientificReferenceSchema.partial().extend({
  title: z.string().min(1).max(2000).optional(),
  referenceType: referenceTypeSchema.optional(),
});

export const linkScientificReferenceSchema = z.object({
  scientificReferenceId: z.string().uuid(),
});

export type CreateScientificReferenceInput = z.infer<typeof createScientificReferenceSchema>;
export type UpdateScientificReferenceInput = z.infer<typeof updateScientificReferenceSchema>;
export type LinkScientificReferenceInput = z.infer<typeof linkScientificReferenceSchema>;

export class ScientificReferenceValidationService {
  constructor(private readonly repo: CropKnowledgeRepository) {}

  validateEntity(
    row: ScientificReference,
    issues: ScientificReferenceValidationIssue[] = [],
  ): ScientificReferenceValidationIssue[] {
    if (!row.title?.trim()) {
      issues.push({
        code: 'TITLE_REQUIRED',
        severity: 'error',
        message: 'Title is required',
        path: 'title',
      });
    }
    if (!REFERENCE_TYPES.includes(row.referenceType)) {
      issues.push({
        code: 'REFERENCE_TYPE_INVALID',
        severity: 'error',
        message: 'Invalid ReferenceType',
        path: 'referenceType',
      });
    }

    if (row.reliabilityScore != null) {
      if (row.reliabilityScore < 0 || row.reliabilityScore > 100) {
        issues.push({
          code: 'RELIABILITY_SCORE_INVALID',
          severity: 'error',
          message: 'ReliabilityScore must be between 0 and 100',
          path: 'reliabilityScore',
        });
      }
    } else {
      issues.push({
        code: 'RELIABILITY_SCORE_UNSET',
        severity: 'warning',
        message: 'ReliabilityScore is not set yet',
        path: 'reliabilityScore',
      });
    }

    if (row.publicationYear == null) {
      issues.push({
        code: 'PUBLICATION_YEAR_UNSET',
        severity: 'warning',
        message: 'PublicationYear is not set yet',
        path: 'publicationYear',
      });
    } else {
      const maxYear = new Date().getFullYear() + 1;
      if (row.publicationYear > maxYear) {
        issues.push({
          code: 'PUBLICATION_YEAR_INVALID',
          severity: 'error',
          message: `PublicationYear cannot exceed ${maxYear}`,
          path: 'publicationYear',
        });
      }
    }

    if (!row.doi && !row.url && !row.isbn && !row.issn) {
      issues.push({
        code: 'IDENTIFIER_MISSING',
        severity: 'warning',
        message: 'No DOI / URL / ISBN / ISSN identifier provided',
        path: 'doi',
      });
    }

    if (row.verificationStatus === 'Approved') {
      issues.push({
        code: 'PREMATURE_APPROVAL',
        severity: 'error',
        message: 'Approved status is not allowed without expert workflow',
        path: 'verificationStatus',
      });
    }

    return issues;
  }

  async validateReference(id: string): Promise<ScientificReferenceValidationResult> {
    const row = await this.repo.getScientificReferenceById(id);
    if (!row || !row.isActive) {
      return {
        valid: false,
        scientificReferenceId: id,
        issues: [
          {
            code: 'SCIENTIFIC_REFERENCE_NOT_FOUND',
            severity: 'error',
            message: 'Scientific reference not found',
          },
        ],
      };
    }
    const issues = this.validateEntity(row);
    return {
      valid: issues.every((i) => i.severity !== 'error'),
      scientificReferenceId: id,
      issues,
    };
  }

  async validateCropLinks(cropKnowledgeId: string): Promise<ScientificReferenceValidationResult> {
    const issues: ScientificReferenceValidationIssue[] = [];
    const knowledge = await this.repo.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) {
      return {
        cropKnowledgeId,
        valid: false,
        issues: [
          {
            code: 'CROP_KNOWLEDGE_NOT_FOUND',
            severity: 'error',
            message: 'Crop knowledge root not found',
          },
        ],
      };
    }

    const section = await this.repo.getReferences(cropKnowledgeId);
    if (!section) {
      issues.push({
        code: 'REFERENCES_SECTION_MISSING',
        severity: 'error',
        message: 'CropReferences section is required',
      });
    }

    const links = await this.repo.listCropScientificReferenceLinks(cropKnowledgeId, true);
    if (links.length === 0) {
      issues.push({
        code: 'CROP_REFERENCES_EMPTY',
        severity: 'warning',
        message: 'No scientific references linked to this crop yet',
      });
    }

    const refIds = links.map((l) => l.scientificReferenceId);
    if (new Set(refIds).size !== refIds.length) {
      issues.push({
        code: 'REFERENCE_LINK_DUPLICATE',
        severity: 'error',
        message: 'Duplicate scientific reference links for crop',
      });
    }

    for (const link of links) {
      const ref = await this.repo.getScientificReferenceById(link.scientificReferenceId);
      if (!ref || !ref.isActive) {
        issues.push({
          code: 'LINKED_REFERENCE_MISSING',
          severity: 'error',
          message: `Linked reference ${link.scientificReferenceId} is missing or inactive`,
          path: link.scientificReferenceId,
        });
      } else {
        this.validateEntity(ref, issues);
      }
    }

    return {
      cropKnowledgeId,
      valid: issues.every((i) => i.severity !== 'error'),
      issues,
    };
  }
}
