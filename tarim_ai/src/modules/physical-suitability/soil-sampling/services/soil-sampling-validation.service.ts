import { z } from 'zod';
import type { SoilSamplingRepository } from '../repositories/soil-sampling.repository.js';
import {
  CHAIN_OF_CUSTODY_ACTIONS,
  SAMPLING_CAMPAIGN_STATUSES,
  SAMPLING_OBSERVATION_TYPES,
  SAMPLING_SAMPLE_STATUSES,
  SOIL_SAMPLE_TYPES,
  type ChainOfCustody,
  type SamplingCampaign,
  type SamplingObservation,
  type SamplingPoint,
  type SamplingSoilSample,
  type SoilSamplingValidationIssue,
  type SoilSamplingValidationResult,
} from '../types/soil-sampling.types.js';

const campaignStatusSchema = z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']);
const sampleTypeSchema = z.enum(['COMPOSITE', 'SINGLE_POINT', 'DISTURBED', 'UNDISTURBED']);
const sampleStatusSchema = z.enum([
  'COLLECTED',
  'IN_TRANSPORT',
  'RECEIVED',
  'IN_ANALYSIS',
  'ANALYZED',
  'ARCHIVED',
  'DISCARDED',
]);
const observationTypeSchema = z.enum([
  'STONE',
  'ROCK',
  'EROSION',
  'COMPACTION',
  'SURFACE_CRUST',
  'DRAINAGE',
  'ROOTING_DEPTH',
  'MOISTURE',
  'WATERLOGGING',
  'SALINITY',
]);
const custodyActionSchema = z.enum([
  'COLLECTED',
  'PACKAGED',
  'TRANSPORTED',
  'RECEIVED',
  'OPENED',
  'ANALYZED',
  'ARCHIVED',
  'DESTROYED',
]);

void SAMPLING_CAMPAIGN_STATUSES;
void SOIL_SAMPLE_TYPES;
void SAMPLING_SAMPLE_STATUSES;
void SAMPLING_OBSERVATION_TYPES;
void CHAIN_OF_CUSTODY_ACTIONS;

export const createSamplingCampaignSchema = z.object({
  campaignCode: z.string().trim().min(1).max(100),
  campaignName: z.string().trim().min(1).max(500),
  purpose: z.string().trim().max(2000).nullable().optional(),
  description: z.string().max(8000).nullable().optional(),
  organization: z.string().trim().max(500).nullable().optional(),
  responsiblePerson: z.string().trim().max(500).nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  status: campaignStatusSchema.optional(),
});

export const updateSamplingCampaignSchema = createSamplingCampaignSchema.partial();

export const createSamplingPointSchema = z.object({
  campaignId: z.string().uuid(),
  parcelId: z.string().trim().min(1).max(200).nullable().optional(),
  pointCode: z.string().trim().min(1).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevation: z.number().nullable().optional(),
  geometry: z.string().max(100_000).nullable().optional(),
  samplingDepthFrom: z.number().nullable().optional(),
  samplingDepthTo: z.number().nullable().optional(),
  samplingArea: z.number().nonnegative().nullable().optional(),
  samplingMethod: z.string().trim().max(200).nullable().optional(),
  slope: z.number().nullable().optional(),
  aspect: z.number().nullable().optional(),
  landUse: z.string().trim().max(200).nullable().optional(),
  cropAtSampling: z.string().trim().max(200).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
});

export const updateSamplingPointSchema = createSamplingPointSchema
  .omit({ campaignId: true })
  .partial()
  .extend({
    campaignId: z.string().uuid().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  });

export const createSamplingSoilSampleSchema = z.object({
  samplingPointId: z.string().uuid(),
  sampleCode: z.string().trim().min(1).max(200),
  sampleType: sampleTypeSchema,
  collectionDate: z.string().datetime().nullable().optional(),
  collectedBy: z.string().trim().max(500).nullable().optional(),
  transportDate: z.string().datetime().nullable().optional(),
  receivedDate: z.string().datetime().nullable().optional(),
  storageCondition: z.string().trim().max(500).nullable().optional(),
  containerType: z.string().trim().max(200).nullable().optional(),
  currentStatus: sampleStatusSchema.optional(),
  barcode: z.string().trim().max(200).nullable().optional(),
  qrCode: z.string().trim().max(2000).nullable().optional(),
  sealNumber: z.string().trim().max(200).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
});

export const updateSamplingSoilSampleSchema = createSamplingSoilSampleSchema
  .omit({ sampleCode: true, samplingPointId: true })
  .partial()
  .extend({
    sampleCode: z.string().trim().min(1).max(200).optional(),
    samplingPointId: z.string().uuid().optional(),
  });

export const createSamplingObservationSchema = z.object({
  samplingPointId: z.string().uuid(),
  observationType: observationTypeSchema,
  observationValue: z.string().trim().max(2000).nullable().optional(),
  photoPath: z.string().trim().max(2000).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
});

export const updateSamplingObservationSchema = createSamplingObservationSchema
  .omit({ samplingPointId: true })
  .partial()
  .extend({
    samplingPointId: z.string().uuid().optional(),
  });

export const createChainOfCustodySchema = z.object({
  sampleId: z.string().uuid(),
  action: custodyActionSchema,
  performedBy: z.string().trim().max(500).nullable().optional(),
  performedDate: z.string().datetime(),
  location: z.string().trim().max(500).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
});

export const updateChainOfCustodySchema = createChainOfCustodySchema
  .omit({ sampleId: true })
  .partial()
  .extend({
    sampleId: z.string().uuid().optional(),
    performedDate: z.string().datetime().optional(),
  });

export type CreateSamplingCampaignInput = z.infer<typeof createSamplingCampaignSchema>;
export type UpdateSamplingCampaignInput = z.infer<typeof updateSamplingCampaignSchema>;
export type CreateSamplingPointInput = z.infer<typeof createSamplingPointSchema>;
export type UpdateSamplingPointInput = z.infer<typeof updateSamplingPointSchema>;
export type CreateSamplingSoilSampleInput = z.infer<typeof createSamplingSoilSampleSchema>;
export type UpdateSamplingSoilSampleInput = z.infer<typeof updateSamplingSoilSampleSchema>;
export type CreateSamplingObservationInput = z.infer<typeof createSamplingObservationSchema>;
export type UpdateSamplingObservationInput = z.infer<typeof updateSamplingObservationSchema>;
export type CreateChainOfCustodyInput = z.infer<typeof createChainOfCustodySchema>;
export type UpdateChainOfCustodyInput = z.infer<typeof updateChainOfCustodySchema>;

export class SoilSamplingValidationService {
  constructor(private readonly repo: SoilSamplingRepository) {}

  validateCampaign(
    row: SamplingCampaign,
    issues: SoilSamplingValidationIssue[] = [],
  ): SoilSamplingValidationIssue[] {
    if (!row.campaignCode?.trim()) {
      issues.push({
        code: 'CAMPAIGN_CODE_REQUIRED',
        severity: 'error',
        message: 'CampaignCode is required',
        path: 'campaignCode',
      });
    }
    if (!row.campaignName?.trim()) {
      issues.push({
        code: 'CAMPAIGN_NAME_REQUIRED',
        severity: 'error',
        message: 'CampaignName is required',
        path: 'campaignName',
      });
    }
    if (!SAMPLING_CAMPAIGN_STATUSES.includes(row.status)) {
      issues.push({
        code: 'CAMPAIGN_STATUS_INVALID',
        severity: 'error',
        message: 'Invalid Status',
        path: 'status',
      });
    }
    if (row.startDate && row.endDate && row.startDate > row.endDate) {
      issues.push({
        code: 'CAMPAIGN_DATE_RANGE_INVALID',
        severity: 'error',
        message: 'EndDate must be >= StartDate',
        path: 'endDate',
      });
    }
    return issues;
  }

  validatePoint(
    row: SamplingPoint,
    issues: SoilSamplingValidationIssue[] = [],
  ): SoilSamplingValidationIssue[] {
    if (!row.pointCode?.trim()) {
      issues.push({
        code: 'POINT_CODE_REQUIRED',
        severity: 'error',
        message: 'PointCode is required',
        path: 'pointCode',
      });
    }
    if (row.latitude == null || Number.isNaN(row.latitude)) {
      issues.push({
        code: 'GPS_REQUIRED',
        severity: 'error',
        message: 'Latitude is required',
        path: 'latitude',
      });
    }
    if (row.longitude == null || Number.isNaN(row.longitude)) {
      issues.push({
        code: 'GPS_REQUIRED',
        severity: 'error',
        message: 'Longitude is required',
        path: 'longitude',
      });
    }
    if (row.samplingDepthFrom != null && row.samplingDepthFrom < 0) {
      issues.push({
        code: 'DEPTH_NEGATIVE',
        severity: 'error',
        message: 'SamplingDepthFrom cannot be negative',
        path: 'samplingDepthFrom',
      });
    }
    if (row.samplingDepthTo != null && row.samplingDepthTo < 0) {
      issues.push({
        code: 'DEPTH_NEGATIVE',
        severity: 'error',
        message: 'SamplingDepthTo cannot be negative',
        path: 'samplingDepthTo',
      });
    }
    if (
      row.samplingDepthFrom != null &&
      row.samplingDepthTo != null &&
      row.samplingDepthFrom > row.samplingDepthTo
    ) {
      issues.push({
        code: 'DEPTH_RANGE_INVALID',
        severity: 'error',
        message: 'SamplingDepthFrom must be <= SamplingDepthTo',
        path: 'samplingDepthTo',
      });
    }
    return issues;
  }

  validateSample(
    row: SamplingSoilSample,
    issues: SoilSamplingValidationIssue[] = [],
  ): SoilSamplingValidationIssue[] {
    if (!row.sampleCode?.trim()) {
      issues.push({
        code: 'SAMPLE_CODE_REQUIRED',
        severity: 'error',
        message: 'SampleCode is required',
        path: 'sampleCode',
      });
    }
    if (!SOIL_SAMPLE_TYPES.includes(row.sampleType)) {
      issues.push({
        code: 'SAMPLE_TYPE_INVALID',
        severity: 'error',
        message: 'Invalid SampleType',
        path: 'sampleType',
      });
    }
    if (!SAMPLING_SAMPLE_STATUSES.includes(row.currentStatus)) {
      issues.push({
        code: 'SAMPLE_STATUS_INVALID',
        severity: 'error',
        message: 'Invalid CurrentStatus',
        path: 'currentStatus',
      });
    }
    return issues;
  }

  validateObservation(
    row: SamplingObservation,
    issues: SoilSamplingValidationIssue[] = [],
  ): SoilSamplingValidationIssue[] {
    if (!SAMPLING_OBSERVATION_TYPES.includes(row.observationType)) {
      issues.push({
        code: 'OBSERVATION_TYPE_INVALID',
        severity: 'error',
        message: 'Invalid ObservationType',
        path: 'observationType',
      });
    }
    return issues;
  }

  validateCustody(
    row: ChainOfCustody,
    issues: SoilSamplingValidationIssue[] = [],
  ): SoilSamplingValidationIssue[] {
    if (!CHAIN_OF_CUSTODY_ACTIONS.includes(row.action)) {
      issues.push({
        code: 'CUSTODY_ACTION_INVALID',
        severity: 'error',
        message: 'Invalid Action',
        path: 'action',
      });
    }
    if (!row.performedDate) {
      issues.push({
        code: 'PERFORMED_DATE_REQUIRED',
        severity: 'error',
        message: 'PerformedDate is required',
        path: 'performedDate',
      });
    }
    return issues;
  }

  async validateCampaignUniqueness(
    row: SamplingCampaign,
  ): Promise<SoilSamplingValidationResult> {
    const issues = this.validateCampaign(row);
    const existing = await this.repo.getCampaignByCode(row.campaignCode);
    if (existing && existing.id !== row.id && existing.status !== 'CANCELLED') {
      issues.push({
        code: 'CAMPAIGN_CODE_DUPLICATE',
        severity: 'error',
        message: 'CampaignCode already exists',
        path: 'campaignCode',
      });
    }
    return { valid: issues.every((i) => i.severity !== 'error'), issues };
  }

  async validatePointIntegrity(row: SamplingPoint): Promise<SoilSamplingValidationResult> {
    const issues = this.validatePoint(row);
    const campaign = await this.repo.getCampaignById(row.campaignId);
    if (!campaign || campaign.status === 'CANCELLED') {
      issues.push({
        code: 'CAMPAIGN_NOT_FOUND',
        severity: 'error',
        message: 'Campaign not found or cancelled',
        path: 'campaignId',
      });
    }
    const byCode = await this.repo.getPointByCampaignAndCode(row.campaignId, row.pointCode);
    if (byCode && byCode.id !== row.id) {
      issues.push({
        code: 'POINT_CODE_DUPLICATE',
        severity: 'error',
        message: 'PointCode already exists in this campaign',
        path: 'pointCode',
      });
    }
    return { valid: issues.every((i) => i.severity !== 'error'), issues };
  }

  async validateSampleIntegrity(
    row: SamplingSoilSample,
  ): Promise<SoilSamplingValidationResult> {
    const issues = this.validateSample(row);
    const point = await this.repo.getPointById(row.samplingPointId);
    if (!point) {
      issues.push({
        code: 'SAMPLING_POINT_NOT_FOUND',
        severity: 'error',
        message: 'SamplingPoint not found',
        path: 'samplingPointId',
      });
    }
    const byCode = await this.repo.getSampleByCode(row.sampleCode);
    if (byCode && byCode.id !== row.id) {
      issues.push({
        code: 'SAMPLE_CODE_DUPLICATE',
        severity: 'error',
        message: 'SampleCode must be unique',
        path: 'sampleCode',
      });
    }
    return { valid: issues.every((i) => i.severity !== 'error'), issues };
  }

  async validateCustodyChronology(
    row: ChainOfCustody,
  ): Promise<SoilSamplingValidationResult> {
    const issues = this.validateCustody(row);
    const sample = await this.repo.getSampleById(row.sampleId);
    if (!sample) {
      issues.push({
        code: 'SAMPLE_NOT_FOUND',
        severity: 'error',
        message: 'Sample not found',
        path: 'sampleId',
      });
      return { valid: false, issues };
    }
    const existing = await this.repo.listChainOfCustodyBySampleId(row.sampleId);
    const others = existing.filter((c) => c.id !== row.id);
    const latest = others.sort((a, b) => a.performedDate.localeCompare(b.performedDate)).at(-1);
    if (latest && row.performedDate < latest.performedDate) {
      issues.push({
        code: 'CUSTODY_NOT_CHRONOLOGICAL',
        severity: 'error',
        message: 'Chain of custody entries must be chronological',
        path: 'performedDate',
      });
    }
    return { valid: issues.every((i) => i.severity !== 'error'), issues };
  }
}
