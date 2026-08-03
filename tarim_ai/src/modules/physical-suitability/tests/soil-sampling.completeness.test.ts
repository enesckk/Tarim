import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPhysicalSuitabilityRepository } from '../repositories/physical-suitability.repository.js';
import { InMemoryCropKnowledgeRepository } from '../crop-knowledge/repositories/crop-knowledge.repository.js';
import { InMemorySoilLaboratoryRepository } from '../soil-laboratory/repositories/soil-laboratory.repository.js';
import { InMemorySoilSamplingRepository } from '../soil-sampling/repositories/soil-sampling.repository.js';
import { seedPhysicalSuitabilityPhase1 } from '../seed/phase1-seed.js';
import { seedCropKnowledgeGeneralInformation } from '../crop-knowledge/seed/general-information.seed.js';
import { seedCropPhenologyEngine } from '../crop-knowledge/phenology/crop-phenology-engine.service.js';
import { seedCropClimateRequirements } from '../crop-knowledge/climate/crop-climate-requirements.service.js';
import { seedCropSoilRequirements } from '../crop-knowledge/soil/crop-soil-requirements.service.js';
import { seedCropWaterRequirements } from '../crop-knowledge/water/crop-water-requirements.service.js';
import { seedCropTerrainRequirements } from '../crop-knowledge/terrain/crop-terrain-requirements.service.js';
import { seedCropRiskProfile } from '../crop-knowledge/risk/crop-risk-profile.service.js';
import { seedCropProductionCalendar } from '../crop-knowledge/calendar/crop-production-calendar.service.js';
import { seedScientificReferenceLibrary } from '../crop-knowledge/references/scientific-reference-library.service.js';
import { seedSoilLaboratoryCore } from '../soil-laboratory/services/soil-laboratory.service.js';
import { seedSoilSamplingManagement } from '../soil-sampling/services/soil-sampling.service.js';
import { PhysicalSuitabilityFacade } from '../services/physical-suitability.facade.js';
import type { SoilSample } from '../soil-sampling/types/soil-sampling.types.js';
import {
  CHAIN_OF_CUSTODY_ACTIONS,
  SAMPLING_CAMPAIGN_STATUSES,
  SAMPLING_OBSERVATION_TYPES,
  SAMPLING_SAMPLE_STATUSES,
  SOIL_SAMPLE_TYPES,
} from '../soil-sampling/types/soil-sampling.types.js';

async function seedAll(
  psRepo: InMemoryPhysicalSuitabilityRepository,
  ckRepo: InMemoryCropKnowledgeRepository,
  labRepo: InMemorySoilLaboratoryRepository,
  samplingRepo: InMemorySoilSamplingRepository,
) {
  await seedPhysicalSuitabilityPhase1(psRepo);
  await seedCropKnowledgeGeneralInformation(ckRepo, psRepo);
  await seedCropPhenologyEngine(ckRepo);
  await seedCropClimateRequirements(ckRepo);
  await seedCropSoilRequirements(ckRepo);
  await seedCropWaterRequirements(ckRepo);
  await seedCropTerrainRequirements(ckRepo);
  await seedCropRiskProfile(ckRepo);
  await seedCropProductionCalendar(ckRepo);
  await seedScientificReferenceLibrary(ckRepo);
  await seedSoilLaboratoryCore(labRepo);
  await seedSoilSamplingManagement(samplingRepo);
}

describe('Phase 2.2F completeness — no missing entities/fields/CRUD', () => {
  let facade: PhysicalSuitabilityFacade;

  beforeEach(async () => {
    const psRepo = new InMemoryPhysicalSuitabilityRepository();
    const ckRepo = new InMemoryCropKnowledgeRepository();
    const labRepo = new InMemorySoilLaboratoryRepository();
    const samplingRepo = new InMemorySoilSamplingRepository();
    await seedAll(psRepo, ckRepo, labRepo, samplingRepo);
    facade = new PhysicalSuitabilityFacade(psRepo, ckRepo, labRepo, samplingRepo);
  });

  it('exposes all enum catalogs from the spec', () => {
    expect([...SAMPLING_CAMPAIGN_STATUSES]).toEqual([
      'PLANNED',
      'ONGOING',
      'COMPLETED',
      'CANCELLED',
    ]);
    expect([...SOIL_SAMPLE_TYPES]).toEqual([
      'COMPOSITE',
      'SINGLE_POINT',
      'DISTURBED',
      'UNDISTURBED',
    ]);
    expect([...SAMPLING_SAMPLE_STATUSES]).toEqual([
      'COLLECTED',
      'IN_TRANSPORT',
      'RECEIVED',
      'IN_ANALYSIS',
      'ANALYZED',
      'ARCHIVED',
      'DISCARDED',
    ]);
    expect([...SAMPLING_OBSERVATION_TYPES]).toEqual([
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
    expect([...CHAIN_OF_CUSTODY_ACTIONS]).toEqual([
      'COLLECTED',
      'PACKAGED',
      'TRANSPORTED',
      'RECEIVED',
      'OPENED',
      'ANALYZED',
      'ARCHIVED',
      'DESTROYED',
    ]);
  });

  it('round-trips every SamplingCampaign / Point / SoilSample field', async () => {
    const campaign = await facade.createSamplingCampaign({
      campaignCode: 'FULL-CMP',
      campaignName: 'Full Field Check',
      purpose: 'baseline',
      description: 'complete field set',
      organization: 'Org',
      responsiblePerson: 'Lead',
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-07-31T00:00:00.000Z',
      status: 'ONGOING',
    });
    expect(campaign).toMatchObject({
      campaignCode: 'FULL-CMP',
      campaignName: 'Full Field Check',
      purpose: 'baseline',
      description: 'complete field set',
      organization: 'Org',
      responsiblePerson: 'Lead',
      status: 'ONGOING',
    });
    expect(campaign.id).toBeTruthy();
    expect(campaign.createdAt).toBeTruthy();
    expect(campaign.updatedAt).toBeTruthy();
    expect(campaign.version).toBe(1);

    const point = await facade.createSamplingPoint({
      campaignId: campaign.id,
      parcelId: 'parcel-42',
      pointCode: 'PT-FULL',
      latitude: 37.06642,
      longitude: 37.38321,
      elevation: 850.5,
      geometry: '{"type":"Point","coordinates":[37.38321,37.06642]}',
      samplingDepthFrom: 0,
      samplingDepthTo: 30,
      samplingArea: 12.5,
      samplingMethod: 'auger',
      slope: 3,
      aspect: 180,
      landUse: 'cropland',
      cropAtSampling: 'wheat',
      notes: 'point notes',
    });
    expect(point).toMatchObject({
      parcelId: 'parcel-42',
      pointCode: 'PT-FULL',
      latitude: 37.06642,
      longitude: 37.38321,
      elevation: 850.5,
      samplingDepthFrom: 0,
      samplingDepthTo: 30,
      samplingArea: 12.5,
      samplingMethod: 'auger',
      slope: 3,
      aspect: 180,
      landUse: 'cropland',
      cropAtSampling: 'wheat',
      notes: 'point notes',
    });
    expect(point.geometry).toContain('Point');

    const sample: SoilSample = await facade.createSamplingSample({
      samplingPointId: point.id,
      sampleCode: 'FULL-S-1',
      sampleType: 'COMPOSITE',
      collectionDate: '2026-07-10T08:00:00.000Z',
      collectedBy: 'Collector',
      transportDate: '2026-07-10T12:00:00.000Z',
      receivedDate: '2026-07-11T09:00:00.000Z',
      storageCondition: 'cool dry',
      containerType: 'bag',
      currentStatus: 'IN_TRANSPORT',
      barcode: 'BC-1',
      qrCode: 'QR-1',
      sealNumber: 'SEAL-1',
      notes: 'sample notes',
    });
    expect(sample).toMatchObject({
      sampleCode: 'FULL-S-1',
      sampleType: 'COMPOSITE',
      collectedBy: 'Collector',
      storageCondition: 'cool dry',
      containerType: 'bag',
      currentStatus: 'IN_TRANSPORT',
      barcode: 'BC-1',
      qrCode: 'QR-1',
      sealNumber: 'SEAL-1',
      notes: 'sample notes',
    });

    const updatedCampaign = await facade.updateSamplingCampaign(campaign.id, {
      status: 'COMPLETED',
    });
    expect(updatedCampaign.status).toBe('COMPLETED');
    expect(updatedCampaign.version).toBe(2);

    const updatedPoint = await facade.updateSamplingPoint(point.id, {
      notes: 'updated point',
    });
    expect(updatedPoint.notes).toBe('updated point');

    const updatedSample = await facade.updateSamplingSample(sample.id, {
      currentStatus: 'RECEIVED',
    });
    expect(updatedSample.currentStatus).toBe('RECEIVED');
  });

  it('Observation and ChainOfCustody full CRUD', async () => {
    const campaign = await facade.createSamplingCampaign({
      campaignCode: 'CRUD-CMP',
      campaignName: 'CRUD',
    });
    const point = await facade.createSamplingPoint({
      campaignId: campaign.id,
      pointCode: 'P1',
      latitude: 37,
      longitude: 37,
    });
    const sample = await facade.createSamplingSample({
      samplingPointId: point.id,
      sampleCode: 'CRUD-S',
      sampleType: 'SINGLE_POINT',
      collectionDate: '2026-07-12T10:00:00.000Z',
    });

    const obs = await facade.createSamplingObservation({
      samplingPointId: point.id,
      observationType: 'EROSION',
      observationValue: 'rill',
      photoPath: '/photos/e1.jpg',
      notes: 'obs',
    });
    expect(obs.observationType).toBe('EROSION');
    expect(obs.createdAt).toBeTruthy();

    const obsUpdated = await facade.updateSamplingObservation(obs.id, {
      observationValue: 'sheet',
    });
    expect(obsUpdated.observationValue).toBe('sheet');
    expect(await facade.getSamplingObservation(obs.id)).toBeTruthy();

    const custody = await facade.createChainOfCustody({
      sampleId: sample.id,
      action: 'PACKAGED',
      performedBy: 'Tech',
      performedDate: '2026-07-12T11:00:00.000Z',
      location: 'field',
      notes: 'boxed',
    });
    expect(custody.action).toBe('PACKAGED');

    const custodyUpdated = await facade.updateChainOfCustody(custody.id, {
      notes: 'labeled',
    });
    expect(custodyUpdated.notes).toBe('labeled');
    expect(await facade.getChainOfCustody(custody.id)).toBeTruthy();

    const listed = await facade.listChainOfCustody(sample.id);
    expect(listed.length).toBeGreaterThanOrEqual(2);

    await facade.deleteChainOfCustody(custody.id);
    expect(await facade.getChainOfCustody(custody.id)).toBeNull();

    await facade.deleteSamplingObservation(obs.id);
    expect(await facade.getSamplingObservation(obs.id)).toBeNull();
  });

  it('aggregate SoilSampling contains all child collections', async () => {
    const campaign = await facade.createSamplingCampaign({
      campaignCode: 'AGG',
      campaignName: 'Agg',
    });
    const point = await facade.createSamplingPoint({
      campaignId: campaign.id,
      pointCode: 'A1',
      latitude: 37.1,
      longitude: 37.2,
    });
    await facade.createSamplingSample({
      samplingPointId: point.id,
      sampleCode: 'AGG-S',
      sampleType: 'DISTURBED',
      collectionDate: '2026-07-13T08:00:00.000Z',
    });
    await facade.createSamplingObservation({
      samplingPointId: point.id,
      observationType: 'SALINITY',
      observationValue: 'none',
    });

    const aggregate = await facade.getSoilSamplingAggregate(campaign.id);
    expect(aggregate).toBeTruthy();
    expect(aggregate!.campaignId).toBe(campaign.id);
    expect(aggregate!.campaign.campaignCode).toBe('AGG');
    expect(aggregate!.points).toHaveLength(1);
    expect(aggregate!.samples).toHaveLength(1);
    expect(aggregate!.observations).toHaveLength(1);
    expect(aggregate!.chainOfCustody.length).toBeGreaterThanOrEqual(1);
  });
});
