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

describe('physical-suitability Phase 2.2F Soil Sampling Management', () => {
  let facade: PhysicalSuitabilityFacade;

  beforeEach(async () => {
    const psRepo = new InMemoryPhysicalSuitabilityRepository();
    const ckRepo = new InMemoryCropKnowledgeRepository();
    const labRepo = new InMemorySoilLaboratoryRepository();
    const samplingRepo = new InMemorySoilSamplingRepository();
    await seedAll(psRepo, ckRepo, labRepo, samplingRepo);
    facade = new PhysicalSuitabilityFacade(psRepo, ckRepo, labRepo, samplingRepo);
  });

  it('seeds no campaigns', async () => {
    expect(await facade.listSamplingCampaigns()).toHaveLength(0);
  });

  it('campaign + point + sample + observation + custody aggregate', async () => {
    const campaign = await facade.createSamplingCampaign({
      campaignCode: 'CMP-001',
      campaignName: 'Şehitkamil Spring',
      status: 'ONGOING',
    });
    const point = await facade.createSamplingPoint({
      campaignId: campaign.id,
      pointCode: 'P-01',
      latitude: 37.1,
      longitude: 37.4,
      samplingDepthFrom: 0,
      samplingDepthTo: 30,
    });
    const sample = await facade.createSamplingSample({
      samplingPointId: point.id,
      sampleCode: 'FS-001',
      sampleType: 'COMPOSITE',
      collectionDate: '2026-07-01T10:00:00.000Z',
      collectedBy: 'Ali',
    });
    expect(sample.currentStatus).toBe('COLLECTED');

    await facade.createSamplingObservation({
      samplingPointId: point.id,
      observationType: 'COMPACTION',
      observationValue: 'moderate',
    });
    await facade.createChainOfCustody({
      sampleId: sample.id,
      action: 'PACKAGED',
      performedDate: '2026-07-01T11:00:00.000Z',
      performedBy: 'Ali',
    });

    const aggregate = await facade.getSoilSamplingAggregate(campaign.id);
    expect(aggregate?.points).toHaveLength(1);
    expect(aggregate?.samples).toHaveLength(1);
    expect(aggregate?.observations).toHaveLength(1);
    expect(aggregate?.chainOfCustody.length).toBeGreaterThanOrEqual(2);
  });

  it('enforces unique sample code', async () => {
    const campaign = await facade.createSamplingCampaign({
      campaignCode: 'CMP-U',
      campaignName: 'Unique',
    });
    const point = await facade.createSamplingPoint({
      campaignId: campaign.id,
      pointCode: 'P1',
      latitude: 37,
      longitude: 37,
    });
    await facade.createSamplingSample({
      samplingPointId: point.id,
      sampleCode: 'DUP',
      sampleType: 'SINGLE_POINT',
    });
    await expect(
      facade.createSamplingSample({
        samplingPointId: point.id,
        sampleCode: 'DUP',
        sampleType: 'SINGLE_POINT',
      }),
    ).rejects.toMatchObject({ code: 'SAMPLING_SAMPLE_INVALID' });
  });

  it('requires GPS and rejects negative depth', async () => {
    const campaign = await facade.createSamplingCampaign({
      campaignCode: 'CMP-GPS',
      campaignName: 'GPS',
    });
    await expect(
      facade.createSamplingPoint({
        campaignId: campaign.id,
        pointCode: 'BAD',
        latitude: 37,
        longitude: 37,
        samplingDepthFrom: -1,
      }),
    ).rejects.toMatchObject({ code: 'SAMPLING_POINT_INVALID' });
  });

  it('blocks sample from belonging to two campaigns', async () => {
    const c1 = await facade.createSamplingCampaign({
      campaignCode: 'C1',
      campaignName: 'One',
    });
    const c2 = await facade.createSamplingCampaign({
      campaignCode: 'C2',
      campaignName: 'Two',
    });
    const p1 = await facade.createSamplingPoint({
      campaignId: c1.id,
      pointCode: 'P1',
      latitude: 37,
      longitude: 37,
    });
    const p2 = await facade.createSamplingPoint({
      campaignId: c2.id,
      pointCode: 'P2',
      latitude: 37.1,
      longitude: 37.1,
    });
    const sample = await facade.createSamplingSample({
      samplingPointId: p1.id,
      sampleCode: 'X1',
      sampleType: 'DISTURBED',
    });
    await expect(
      facade.updateSamplingSample(sample.id, { samplingPointId: p2.id }),
    ).rejects.toMatchObject({ code: 'SAMPLE_TWO_CAMPAIGNS_FORBIDDEN' });
  });

  it('enforces chronological chain of custody', async () => {
    const campaign = await facade.createSamplingCampaign({
      campaignCode: 'CMP-CH',
      campaignName: 'Chain',
    });
    const point = await facade.createSamplingPoint({
      campaignId: campaign.id,
      pointCode: 'P',
      latitude: 37,
      longitude: 37,
    });
    const sample = await facade.createSamplingSample({
      samplingPointId: point.id,
      sampleCode: 'CH-1',
      sampleType: 'UNDISTURBED',
      collectionDate: '2026-07-02T10:00:00.000Z',
    });
    await expect(
      facade.createChainOfCustody({
        sampleId: sample.id,
        action: 'TRANSPORTED',
        performedDate: '2026-07-01T09:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'CHAIN_OF_CUSTODY_INVALID' });
  });

  it('soft-cancels campaign and soft-discards sample', async () => {
    const campaign = await facade.createSamplingCampaign({
      campaignCode: 'CMP-DEL',
      campaignName: 'Del',
    });
    const cancelled = await facade.deleteSamplingCampaign(campaign.id);
    expect(cancelled.status).toBe('CANCELLED');

    const point = await facade.createSamplingPoint({
      campaignId: (
        await facade.createSamplingCampaign({ campaignCode: 'CMP-DEL2', campaignName: 'D2' })
      ).id,
      pointCode: 'P',
      latitude: 37,
      longitude: 37,
    });
    const sample = await facade.createSamplingSample({
      samplingPointId: point.id,
      sampleCode: 'DEL-S',
      sampleType: 'COMPOSITE',
    });
    const discarded = await facade.deleteSamplingSample(sample.id);
    expect(discarded.currentStatus).toBe('DISCARDED');
  });
});
