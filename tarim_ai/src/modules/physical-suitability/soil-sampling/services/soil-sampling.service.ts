import { randomUUID } from 'node:crypto';
import type { SoilSamplingRepository } from '../repositories/soil-sampling.repository.js';
import type {
  ChainOfCustody,
  SamplingCampaign,
  SamplingObservation,
  SamplingPoint,
  SamplingSoilSample,
  SoilSampling,
} from '../types/soil-sampling.types.js';
import {
  SoilSamplingValidationService,
  type CreateChainOfCustodyInput,
  type CreateSamplingCampaignInput,
  type CreateSamplingObservationInput,
  type CreateSamplingPointInput,
  type CreateSamplingSoilSampleInput,
  type UpdateChainOfCustodyInput,
  type UpdateSamplingCampaignInput,
  type UpdateSamplingObservationInput,
  type UpdateSamplingPointInput,
  type UpdateSamplingSoilSampleInput,
} from './soil-sampling-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

function throwIfInvalid(issues: { severity: string }[], code: string, message: string) {
  const hard = issues.filter((i) => i.severity === 'error');
  if (hard.length > 0) throw httpError(422, code, message, { issues: hard });
}

/**
 * Phase 2.2F — Soil Sampling Management.
 * Independent from laboratory analysis. No suitability / AI / OCR / map / QR generation.
 */
export class SoilSamplingService {
  readonly validation: SoilSamplingValidationService;

  constructor(private readonly repo: SoilSamplingRepository) {
    this.validation = new SoilSamplingValidationService(repo);
  }

  // ---- Campaign ----

  listCampaigns() {
    return this.repo.listCampaigns();
  }

  getCampaign(id: string) {
    return this.repo.getCampaignById(id);
  }

  getAggregate(campaignId: string): Promise<SoilSampling | null> {
    return this.repo.getSoilSamplingAggregate(campaignId);
  }

  async createCampaign(input: CreateSamplingCampaignInput): Promise<SamplingCampaign> {
    const now = new Date().toISOString();
    const row: SamplingCampaign = {
      id: newId(),
      campaignCode: input.campaignCode.trim(),
      campaignName: input.campaignName.trim(),
      purpose: input.purpose ?? null,
      description: input.description ?? null,
      organization: input.organization ?? null,
      responsiblePerson: input.responsiblePerson ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      status: input.status ?? 'PLANNED',
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    const result = await this.validation.validateCampaignUniqueness(row);
    throwIfInvalid(result.issues, 'SAMPLING_CAMPAIGN_INVALID', 'Sampling campaign invalid');
    return this.repo.upsertCampaign(row);
  }

  async updateCampaign(
    id: string,
    input: UpdateSamplingCampaignInput,
  ): Promise<SamplingCampaign> {
    const existing = await this.repo.getCampaignById(id);
    if (!existing) {
      throw httpError(404, 'SAMPLING_CAMPAIGN_NOT_FOUND', 'Sampling campaign not found');
    }
    const next: SamplingCampaign = {
      ...existing,
      campaignCode:
        input.campaignCode !== undefined ? input.campaignCode.trim() : existing.campaignCode,
      campaignName:
        input.campaignName !== undefined ? input.campaignName.trim() : existing.campaignName,
      purpose: input.purpose !== undefined ? input.purpose : existing.purpose,
      description: input.description !== undefined ? input.description : existing.description,
      organization:
        input.organization !== undefined ? input.organization : existing.organization,
      responsiblePerson:
        input.responsiblePerson !== undefined
          ? input.responsiblePerson
          : existing.responsiblePerson,
      startDate: input.startDate !== undefined ? input.startDate : existing.startDate,
      endDate: input.endDate !== undefined ? input.endDate : existing.endDate,
      status: input.status !== undefined ? input.status : existing.status,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    const result = await this.validation.validateCampaignUniqueness(next);
    throwIfInvalid(result.issues, 'SAMPLING_CAMPAIGN_INVALID', 'Sampling campaign invalid');
    return this.repo.upsertCampaign(next);
  }

  async deleteCampaign(id: string): Promise<SamplingCampaign> {
    const existing = await this.repo.getCampaignById(id);
    if (!existing) {
      throw httpError(404, 'SAMPLING_CAMPAIGN_NOT_FOUND', 'Sampling campaign not found');
    }
    const cancelled: SamplingCampaign = {
      ...existing,
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    return this.repo.upsertCampaign(cancelled);
  }

  // ---- Points ----

  listPoints(campaignId?: string) {
    return this.repo.listPoints(campaignId);
  }

  getPoint(id: string) {
    return this.repo.getPointById(id);
  }

  async createPoint(input: CreateSamplingPointInput): Promise<SamplingPoint> {
    const now = new Date().toISOString();
    const row: SamplingPoint = {
      id: newId(),
      campaignId: input.campaignId,
      parcelId: input.parcelId ?? null,
      pointCode: input.pointCode.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      elevation: input.elevation ?? null,
      geometry: input.geometry ?? null,
      samplingDepthFrom: input.samplingDepthFrom ?? null,
      samplingDepthTo: input.samplingDepthTo ?? null,
      samplingArea: input.samplingArea ?? null,
      samplingMethod: input.samplingMethod ?? null,
      slope: input.slope ?? null,
      aspect: input.aspect ?? null,
      landUse: input.landUse ?? null,
      cropAtSampling: input.cropAtSampling ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    const result = await this.validation.validatePointIntegrity(row);
    throwIfInvalid(result.issues, 'SAMPLING_POINT_INVALID', 'Sampling point invalid');
    return this.repo.upsertPoint(row);
  }

  async updatePoint(id: string, input: UpdateSamplingPointInput): Promise<SamplingPoint> {
    const existing = await this.repo.getPointById(id);
    if (!existing) {
      throw httpError(404, 'SAMPLING_POINT_NOT_FOUND', 'Sampling point not found');
    }
    const nextCampaignId =
      input.campaignId !== undefined ? input.campaignId : existing.campaignId;

    // A sample cannot belong to two campaigns — block moving a point that has samples
    // into another campaign (would reassign all linked samples).
    if (nextCampaignId !== existing.campaignId) {
      const samples = await this.repo.listSamples(existing.id);
      if (samples.length > 0) {
        throw httpError(
          422,
          'SAMPLE_CAMPAIGN_REASSIGN_FORBIDDEN',
          'Cannot move a sampling point with samples to another campaign',
        );
      }
    }

    const next: SamplingPoint = {
      ...existing,
      campaignId: nextCampaignId,
      parcelId: input.parcelId !== undefined ? input.parcelId : existing.parcelId,
      pointCode: input.pointCode !== undefined ? input.pointCode.trim() : existing.pointCode,
      latitude: input.latitude !== undefined ? input.latitude : existing.latitude,
      longitude: input.longitude !== undefined ? input.longitude : existing.longitude,
      elevation: input.elevation !== undefined ? input.elevation : existing.elevation,
      geometry: input.geometry !== undefined ? input.geometry : existing.geometry,
      samplingDepthFrom:
        input.samplingDepthFrom !== undefined
          ? input.samplingDepthFrom
          : existing.samplingDepthFrom,
      samplingDepthTo:
        input.samplingDepthTo !== undefined ? input.samplingDepthTo : existing.samplingDepthTo,
      samplingArea:
        input.samplingArea !== undefined ? input.samplingArea : existing.samplingArea,
      samplingMethod:
        input.samplingMethod !== undefined ? input.samplingMethod : existing.samplingMethod,
      slope: input.slope !== undefined ? input.slope : existing.slope,
      aspect: input.aspect !== undefined ? input.aspect : existing.aspect,
      landUse: input.landUse !== undefined ? input.landUse : existing.landUse,
      cropAtSampling:
        input.cropAtSampling !== undefined ? input.cropAtSampling : existing.cropAtSampling,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    const result = await this.validation.validatePointIntegrity(next);
    throwIfInvalid(result.issues, 'SAMPLING_POINT_INVALID', 'Sampling point invalid');
    return this.repo.upsertPoint(next);
  }

  async deletePoint(id: string): Promise<{ id: string; deleted: true }> {
    const existing = await this.repo.getPointById(id);
    if (!existing) {
      throw httpError(404, 'SAMPLING_POINT_NOT_FOUND', 'Sampling point not found');
    }
    const samples = await this.repo.listSamples(id);
    if (samples.length > 0) {
      throw httpError(
        422,
        'SAMPLING_POINT_HAS_SAMPLES',
        'Cannot delete sampling point that has samples',
      );
    }
    await this.repo.deletePoint(id);
    return { id, deleted: true };
  }

  // ---- Samples ----

  listSamples(samplingPointId?: string) {
    return this.repo.listSamples(samplingPointId);
  }

  getSample(id: string) {
    return this.repo.getSampleById(id);
  }

  async createSample(input: CreateSamplingSoilSampleInput): Promise<SamplingSoilSample> {
    const now = new Date().toISOString();
    const row: SamplingSoilSample = {
      id: newId(),
      samplingPointId: input.samplingPointId,
      sampleCode: input.sampleCode.trim(),
      sampleType: input.sampleType,
      collectionDate: input.collectionDate ?? null,
      collectedBy: input.collectedBy ?? null,
      transportDate: input.transportDate ?? null,
      receivedDate: input.receivedDate ?? null,
      storageCondition: input.storageCondition ?? null,
      containerType: input.containerType ?? null,
      currentStatus: input.currentStatus ?? 'COLLECTED',
      barcode: input.barcode ?? null,
      qrCode: input.qrCode ?? null,
      sealNumber: input.sealNumber ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    const result = await this.validation.validateSampleIntegrity(row);
    throwIfInvalid(result.issues, 'SAMPLING_SAMPLE_INVALID', 'Soil sample invalid');
    const saved = await this.repo.upsertSample(row);

    // Auto seed COLLECTED custody when collection date present
    if (saved.collectionDate) {
      await this.createCustody({
        sampleId: saved.id,
        action: 'COLLECTED',
        performedBy: saved.collectedBy,
        performedDate: saved.collectionDate,
        location: null,
        notes: 'Auto-recorded on sample create',
      });
    }
    return saved;
  }

  async updateSample(
    id: string,
    input: UpdateSamplingSoilSampleInput,
  ): Promise<SamplingSoilSample> {
    const existing = await this.repo.getSampleById(id);
    if (!existing) {
      throw httpError(404, 'SAMPLING_SAMPLE_NOT_FOUND', 'Soil sample not found');
    }

    const nextPointId =
      input.samplingPointId !== undefined ? input.samplingPointId : existing.samplingPointId;
    if (nextPointId !== existing.samplingPointId) {
      const [fromPoint, toPoint] = await Promise.all([
        this.repo.getPointById(existing.samplingPointId),
        this.repo.getPointById(nextPointId),
      ]);
      if (!toPoint) {
        throw httpError(422, 'SAMPLING_POINT_NOT_FOUND', 'Target sampling point not found');
      }
      if (fromPoint && toPoint.campaignId !== fromPoint.campaignId) {
        throw httpError(
          422,
          'SAMPLE_TWO_CAMPAIGNS_FORBIDDEN',
          'A sample cannot be linked to two campaigns',
        );
      }
    }

    const next: SamplingSoilSample = {
      ...existing,
      samplingPointId: nextPointId,
      sampleCode:
        input.sampleCode !== undefined ? input.sampleCode.trim() : existing.sampleCode,
      sampleType: input.sampleType !== undefined ? input.sampleType : existing.sampleType,
      collectionDate:
        input.collectionDate !== undefined ? input.collectionDate : existing.collectionDate,
      collectedBy: input.collectedBy !== undefined ? input.collectedBy : existing.collectedBy,
      transportDate:
        input.transportDate !== undefined ? input.transportDate : existing.transportDate,
      receivedDate:
        input.receivedDate !== undefined ? input.receivedDate : existing.receivedDate,
      storageCondition:
        input.storageCondition !== undefined
          ? input.storageCondition
          : existing.storageCondition,
      containerType:
        input.containerType !== undefined ? input.containerType : existing.containerType,
      currentStatus:
        input.currentStatus !== undefined ? input.currentStatus : existing.currentStatus,
      barcode: input.barcode !== undefined ? input.barcode : existing.barcode,
      qrCode: input.qrCode !== undefined ? input.qrCode : existing.qrCode,
      sealNumber: input.sealNumber !== undefined ? input.sealNumber : existing.sealNumber,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    const result = await this.validation.validateSampleIntegrity(next);
    throwIfInvalid(result.issues, 'SAMPLING_SAMPLE_INVALID', 'Soil sample invalid');
    return this.repo.upsertSample(next);
  }

  async deleteSample(id: string): Promise<SamplingSoilSample> {
    const existing = await this.repo.getSampleById(id);
    if (!existing) {
      throw httpError(404, 'SAMPLING_SAMPLE_NOT_FOUND', 'Soil sample not found');
    }
    const discarded: SamplingSoilSample = {
      ...existing,
      currentStatus: 'DISCARDED',
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    return this.repo.upsertSample(discarded);
  }

  // ---- Observations ----

  listObservations(samplingPointId?: string) {
    return this.repo.listObservations(samplingPointId);
  }

  getObservation(id: string) {
    return this.repo.getObservationById(id);
  }

  async createObservation(
    input: CreateSamplingObservationInput,
  ): Promise<SamplingObservation> {
    const point = await this.repo.getPointById(input.samplingPointId);
    if (!point) {
      throw httpError(404, 'SAMPLING_POINT_NOT_FOUND', 'Sampling point not found');
    }
    const now = new Date().toISOString();
    const row: SamplingObservation = {
      id: newId(),
      samplingPointId: input.samplingPointId,
      observationType: input.observationType,
      observationValue: input.observationValue ?? null,
      photoPath: input.photoPath ?? null,
      notes: input.notes ?? null,
      createdAt: now,
    };
    throwIfInvalid(
      this.validation.validateObservation(row),
      'SAMPLING_OBSERVATION_INVALID',
      'Sampling observation invalid',
    );
    return this.repo.upsertObservation(row);
  }

  async updateObservation(
    id: string,
    input: UpdateSamplingObservationInput,
  ): Promise<SamplingObservation> {
    const existing = await this.repo.getObservationById(id);
    if (!existing) {
      throw httpError(404, 'SAMPLING_OBSERVATION_NOT_FOUND', 'Sampling observation not found');
    }
    if (input.samplingPointId) {
      const point = await this.repo.getPointById(input.samplingPointId);
      if (!point) {
        throw httpError(404, 'SAMPLING_POINT_NOT_FOUND', 'Sampling point not found');
      }
    }
    const next: SamplingObservation = {
      ...existing,
      samplingPointId:
        input.samplingPointId !== undefined ? input.samplingPointId : existing.samplingPointId,
      observationType:
        input.observationType !== undefined ? input.observationType : existing.observationType,
      observationValue:
        input.observationValue !== undefined
          ? input.observationValue
          : existing.observationValue,
      photoPath: input.photoPath !== undefined ? input.photoPath : existing.photoPath,
      notes: input.notes !== undefined ? input.notes : existing.notes,
    };
    throwIfInvalid(
      this.validation.validateObservation(next),
      'SAMPLING_OBSERVATION_INVALID',
      'Sampling observation invalid',
    );
    return this.repo.upsertObservation(next);
  }

  async deleteObservation(id: string): Promise<{ id: string; deleted: true }> {
    const existing = await this.repo.getObservationById(id);
    if (!existing) {
      throw httpError(404, 'SAMPLING_OBSERVATION_NOT_FOUND', 'Sampling observation not found');
    }
    await this.repo.deleteObservation(id);
    return { id, deleted: true };
  }

  // ---- Chain of custody ----

  listCustody(sampleId: string) {
    return this.repo.listChainOfCustodyBySampleId(sampleId);
  }

  getCustody(id: string) {
    return this.repo.getChainOfCustodyById(id);
  }

  async createCustody(input: CreateChainOfCustodyInput): Promise<ChainOfCustody> {
    const now = new Date().toISOString();
    const row: ChainOfCustody = {
      id: newId(),
      sampleId: input.sampleId,
      action: input.action,
      performedBy: input.performedBy ?? null,
      performedDate: input.performedDate,
      location: input.location ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    const result = await this.validation.validateCustodyChronology(row);
    throwIfInvalid(result.issues, 'CHAIN_OF_CUSTODY_INVALID', 'Chain of custody invalid');
    return this.repo.upsertChainOfCustody(row);
  }

  async updateCustody(id: string, input: UpdateChainOfCustodyInput): Promise<ChainOfCustody> {
    const existing = await this.repo.getChainOfCustodyById(id);
    if (!existing) {
      throw httpError(404, 'CHAIN_OF_CUSTODY_NOT_FOUND', 'Chain of custody entry not found');
    }
    const next: ChainOfCustody = {
      ...existing,
      sampleId: input.sampleId !== undefined ? input.sampleId : existing.sampleId,
      action: input.action !== undefined ? input.action : existing.action,
      performedBy: input.performedBy !== undefined ? input.performedBy : existing.performedBy,
      performedDate:
        input.performedDate !== undefined ? input.performedDate : existing.performedDate,
      location: input.location !== undefined ? input.location : existing.location,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    const result = await this.validation.validateCustodyChronology(next);
    throwIfInvalid(result.issues, 'CHAIN_OF_CUSTODY_INVALID', 'Chain of custody invalid');
    return this.repo.upsertChainOfCustody(next);
  }

  async deleteCustody(id: string): Promise<{ id: string; deleted: true }> {
    const existing = await this.repo.getChainOfCustodyById(id);
    if (!existing) {
      throw httpError(404, 'CHAIN_OF_CUSTODY_NOT_FOUND', 'Chain of custody entry not found');
    }
    await this.repo.deleteChainOfCustody(id);
    return { id, deleted: true };
  }
}

/** Phase 2.2F seed: no campaigns / points / samples. */
export async function seedSoilSamplingManagement(
  _repo: SoilSamplingRepository,
): Promise<void> {
  // intentionally empty
}
