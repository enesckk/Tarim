import { describe, expect, it } from 'vitest';
import {
  assertApprovedForKnowledgeUse,
  importEcocropSnapshot,
  parseEcocropCrop,
} from '../ecocrop/parse.js';
import {
  reviewEcocropProfile,
  selectApprovedEcocropForKnowledge,
} from '../ecocrop/review.js';
import {
  compareLocalWithGaez,
  createDraftMapping,
  parcelSmallerThanRasterCell,
  publicGaezError,
  REGIONAL_RESOLUTION_LIMITATION,
} from '../gaez/core.js';
import { syncGaezV4Catalog } from '../gaez/catalog-client.js';
import {
  getGaezRegionalSample,
  InMemoryGaezSampleCache,
} from '../gaez/regional-sample.js';
import {
  buildPilotDraftMappings,
  buildPilotReport,
  resolveInternalCropCode,
} from '../mapping/pilot-crops.js';
import {
  assertMappingApprovedForSampling,
  reviewCropMapping,
  validateCropMapping,
} from '../mapping/validation.js';
import { resolveLayersForCrop, suitabilityIndexToClass } from '../gaez/layer-resolver.js';
import { InMemoryFaoExternalRepository } from '../repositories/fao-external.repository.js';
import { buildCompletenessReport } from '../audit/completeness.js';
import type { GaezDataset } from '../types/models.js';

describe('ECOCROP parse', () => {
  it('maps known numeric fields with sourceField and keeps unknowns', () => {
    const { profile, rejectedThresholds } = parseEcocropCrop(
      {
        ecocropId: 'EXAMPLE-WHEAT',
        scientificName: 'Triticum aestivum',
        fields: {
          temperatureOptimalMinC: 15,
          mysteryUnofficialField: 'x',
          precipitationMinMm: 'not-a-number',
        },
      },
      {
        snapshotVersion: 't1',
        retrievedAt: '2026-07-30T00:00:00.000Z',
        sourceUrlOrId: 'fixture',
      },
    );
    expect(profile.status).toBe('draft');
    expect(profile.thresholds).toEqual([
      expect.objectContaining({
        field: 'temperatureOptimalMinC',
        value: 15,
        sourceField: 'temperatureOptimalMinC',
      }),
    ]);
    expect(profile.unknownFields).toContain('mysteryUnofficialField');
    expect(rejectedThresholds.some((r) => r.field === 'precipitationMinMm')).toBe(true);
  });

  it('rejects unapproved profiles for knowledge use', () => {
    const { profiles } = importEcocropSnapshot({
      snapshotVersion: 't1',
      retrievedAt: '2026-07-30T00:00:00.000Z',
      sourceUrlOrId: 'fixture',
      crops: [
        {
          ecocropId: '1',
          scientificName: 'Triticum aestivum',
          fields: { temperatureOptimalMinC: 10 },
        },
      ],
    });
    expect(() => assertApprovedForKnowledgeUse(profiles[0]!)).toThrow(/approved required/);
  });

  it('supports review workflow to approved then knowledge selection', () => {
    const { profiles } = importEcocropSnapshot({
      snapshotVersion: 't1',
      retrievedAt: '2026-07-30T00:00:00.000Z',
      sourceUrlOrId: 'fixture',
      crops: [
        {
          ecocropId: '1',
          scientificName: 'Triticum aestivum',
          fields: { temperatureOptimalMinC: 10 },
        },
      ],
    });
    const reviewed = reviewEcocropProfile(profiles[0]!, 'reviewed', 'auditor');
    const approved = reviewEcocropProfile(reviewed, 'approved', 'auditor');
    expect(selectApprovedEcocropForKnowledge([approved, profiles[0]!])).toHaveLength(1);
  });
});

describe('GAEZ catalog sync + version separation', () => {
  it('syncs v4 rows from ImageServer-like payload', async () => {
    const { datasets, errors } = await syncGaezV4Catalog({
      get: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          features: [
            {
              attributes: {
                name: 'sxHr_whe',
                crop: 'Wheat',
                water_supply: 'Rainfed',
                input_level: 'High',
                variable: 'Crop suitability index in classes; all land in grid cell',
                units: 'Class',
                file_id: 1,
              },
            },
          ],
          exceededTransferLimit: false,
        }),
      }),
    });
    expect(errors).toEqual([]);
    expect(datasets).toHaveLength(1);
    expect(datasets[0]?.version).toBe('v4');
    expect(datasets[0]?.cropCode).toBe('Wheat');
  });

  it('does not mix v5 into ImageServer sync', async () => {
    const result = await syncGaezV4Catalog({ gaezVersion: 'v5' });
    expect(result.datasets).toEqual([]);
    expect(result.errors[0]).toMatch(/gaez_v5/);
  });
});

describe('crop mapping validation', () => {
  it('keeps auto mappings draft and does not invent missing GAEZ codes', () => {
    const mappings = buildPilotDraftMappings();
    expect(mappings).toHaveLength(10);
    expect(mappings.every((m) => m.reviewStatus === 'draft')).toBe(true);
    expect(mappings.find((m) => m.internalCropCode === 'lentil')?.gaezCropCode).toBeNull();
    expect(mappings.find((m) => m.internalCropCode === 'grape')?.gaezCropCode).toBeNull();
    expect(mappings.find((m) => m.internalCropCode === 'pistachio')?.gaezCropCode).toBeNull();
    expect(resolveInternalCropCode('maize')).toBe('corn');
  });

  it('blocks sampling on unapproved mapping when required', async () => {
    const mapping = createDraftMapping({
      internalCropCode: 'wheat',
      scientificName: 'Triticum aestivum',
      gaezCropCode: 'Wheat',
      gaezVersion: 'v4',
    });
    expect(() => assertMappingApprovedForSampling(mapping)).toThrow(/approved required/);
    const sample = await getGaezRegionalSample(
      {
        geometry: { type: 'Point', coordinates: [37, 37] },
        centroid: { lon: 37, lat: 37 },
        mapping,
        gaezVersion: 'v4',
        waterSupply: 'Rainfed',
        inputLevel: 'High',
        climateScenario: 'historical_baseline',
        datasetId: '1',
        layerName: 'sxHr_whe',
        requireApprovedMapping: true,
      },
      { cache: new InMemoryGaezSampleCache() },
    );
    expect(sample.status).toBe('unavailable');
    expect(sample.limitations).toContain('gaez_mapping_not_approved');
  });

  it('approves mapping only with confidence', () => {
    const mapping = createDraftMapping({
      internalCropCode: 'wheat',
      scientificName: 'Triticum aestivum',
      gaezCropCode: 'Wheat',
      gaezVersion: 'v4',
    });
    const reviewed = reviewCropMapping(mapping, 'reviewed', 'rev1');
    expect(() => reviewCropMapping(reviewed, 'approved', 'rev1')).toThrow(/confidence/);
    const approved = reviewCropMapping(reviewed, 'approved', 'rev1', 'high');
    expect(approved.reviewStatus).toBe('approved');
    expect(
      validateCropMapping(approved).filter((i) => i.code === 'approved_requires_confidence'),
    ).toHaveLength(0);
  });
});

describe('GAEZ regional sample + cache', () => {
  const mapping = createDraftMapping({
    internalCropCode: 'wheat',
    scientificName: 'Triticum aestivum',
    gaezCropCode: 'Wheat',
    gaezVersion: 'v4',
  });

  const baseReq = {
    geometry: { type: 'Point', coordinates: [37.06, 37.38] },
    centroid: { lon: 37.06, lat: 37.38 },
    mapping,
    gaezVersion: 'v4' as const,
    waterSupply: 'Rainfed',
    inputLevel: 'High',
    climateScenario: 'historical_baseline',
    datasetId: 'ds-1',
    layerName: 'sxHr_whe',
    areaSquareMeters: 5_000,
  };

  it('samples centroid and caches', async () => {
    const cache = new InMemoryGaezSampleCache();
    let calls = 0;
    const get = async () => {
      calls += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({ samples: [{ value: '7' }] }),
      };
    };
    const first = await getGaezRegionalSample(baseReq, { cache, get });
    expect(first.status).toBe('ok');
    expect(first.mean).toBe(7);
    expect(first.suitabilityClass).toBe(suitabilityIndexToClass(7));
    expect(first.limitations).toContain(REGIONAL_RESOLUTION_LIMITATION);
    const second = await getGaezRegionalSample(baseReq, { cache, get });
    expect(second.cacheHit).toBe(true);
    expect(calls).toBe(1);
  });

  it('samples attainable yield layer when provided', async () => {
    const cache = new InMemoryGaezSampleCache();
    const get = async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => ({ samples: [{ value: url.includes('ycHr') ? 3500 : 2 }] }),
    });
    const sample = await getGaezRegionalSample(
      {
        ...baseReq,
        attainableYieldLayerName: 'ycHr_whe',
        areaSquareMeters: 50_000_000,
      },
      { cache, get },
    );
    expect(sample.attainableYield).toBe(3500);
    expect(sample.mean).toBe(2);
  });

  it('supports polygon multi-point sampling', async () => {
    const cache = new InMemoryGaezSampleCache();
    const get = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ samples: [{ value: 5 }] }),
    });
    const sample = await getGaezRegionalSample(
      {
        ...baseReq,
        sampleMethod: 'polygon',
        polygonSamplePoints: [
          { lon: 37.06, lat: 37.38 },
          { lon: 37.07, lat: 37.39 },
        ],
        areaSquareMeters: 50_000_000,
      },
      { cache, get },
    );
    expect(sample.sampleMethod).toBe('polygon');
    expect(sample.mean).toBe(5);
  });

  it('uses cache when provider unavailable', async () => {
    const cache = new InMemoryGaezSampleCache();
    await getGaezRegionalSample(baseReq, {
      cache,
      get: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ samples: [{ value: 8 }] }),
      }),
    });
    const sample = await getGaezRegionalSample(baseReq, {
      cache,
      get: async () => {
        throw new Error('ECONNREFUSED secret-host stack');
      },
    });
    expect(sample.cacheHit).toBe(true);
    expect(sample.mean).toBe(8);
  });

  it('returns unavailable without leaking raw errors when no cache', async () => {
    const cache = new InMemoryGaezSampleCache();
    const sample = await getGaezRegionalSample(baseReq, {
      cache,
      get: async () => {
        throw new Error('upstream boom with token=SECRET');
      },
    });
    expect(sample.status).toBe('unavailable');
    expect(JSON.stringify(sample)).not.toContain('SECRET');
    expect(publicGaezError(new Error('raw')).message).toBe('GAEZ regional service unavailable');
  });
});

describe('comparison layer does not change local score', () => {
  it('marks resolution warning and keeps localScore', () => {
    const localScore = 72;
    const comparison = compareLocalWithGaez({
      localScore,
      localClass: 'suitable',
      sample: {
        provider: 'gaez',
        version: 'v4',
        datasetId: '1',
        cropCode: 'Wheat',
        scientificName: 'Triticum aestivum',
        waterSupply: 'Rainfed',
        inputLevel: 'High',
        climateScenario: 'historical_baseline',
        resolution: '0.083333°',
        unit: 'Class',
        retrievedAt: '2026-07-30T00:00:00.000Z',
        sourceUrlOrId: 'x',
        limitations: [REGIONAL_RESOLUTION_LIMITATION],
        geometryHash: 'abc',
        sampleMethod: 'centroid',
        suitabilityIndex: 40,
        suitabilityClass: null,
        attainableYield: null,
        potentialYield: null,
        dominantClass: null,
        min: 40,
        max: 40,
        mean: 40,
        rasterResolution: '0.083333°',
        cacheHit: false,
        status: 'ok',
      },
    });
    expect(comparison.localScore).toBe(72);
    expect(comparison.resolutionWarning).toBe(true);
  });

  it('returns unavailable agreement when sample missing', () => {
    const comparison = compareLocalWithGaez({
      localScore: 50,
      localClass: 'limited',
      sample: null,
    });
    expect(comparison.agreement).toBe('unavailable');
    expect(comparison.localScore).toBe(50);
  });
});

describe('resolution limitation helper', () => {
  it('flags small parcels', () => {
    expect(parcelSmallerThanRasterCell({ areaSquareMeters: 1000 })).toBe(true);
    expect(parcelSmallerThanRasterCell({ areaSquareMeters: 80_000_000 })).toBe(false);
  });
});

describe('layer resolver + repository', () => {
  it('resolves rainfed/irrigated/yield without inventing layers', () => {
    const datasets: GaezDataset[] = [
      {
        provider: 'gaez',
        version: 'v4',
        datasetId: '1',
        name: 'sxHr_whe',
        variable: 'Crop suitability index in classes; all land in grid cell',
        serviceUrl: 'x',
        filepath: null,
        downloadUrl: null,
        active: true,
        syncedAt: '2026-07-30T00:00:00.000Z',
        cropCode: 'Wheat',
        scientificName: null,
        waterSupply: 'Rainfed',
        inputLevel: 'High',
        climateScenario: 'historical_baseline',
        resolution: '0.083333°',
        unit: 'Class',
        retrievedAt: '2026-07-30T00:00:00.000Z',
        sourceUrlOrId: 'x',
        limitations: [],
      },
      {
        provider: 'gaez',
        version: 'v4',
        datasetId: '2',
        name: 'ycHr_whe',
        variable: 'Average attainable yield of current cropland',
        serviceUrl: 'x',
        filepath: null,
        downloadUrl: null,
        active: true,
        syncedAt: '2026-07-30T00:00:00.000Z',
        cropCode: 'Wheat',
        scientificName: null,
        waterSupply: 'Rainfed',
        inputLevel: 'High',
        climateScenario: 'historical_baseline',
        resolution: '0.083333°',
        unit: 'kg DW/ha',
        retrievedAt: '2026-07-30T00:00:00.000Z',
        sourceUrlOrId: 'x',
        limitations: [],
      },
    ];
    const resolved = resolveLayersForCrop('Wheat', datasets);
    expect(resolved.rainfedAvailable).toBe(true);
    expect(resolved.yieldAvailable).toBe(true);
    expect(resolveLayersForCrop('Grape', datasets).rainfedAvailable).toBe(false);
  });

  it('persists mappings and ecocrop drafts in repository', async () => {
    const repo = new InMemoryFaoExternalRepository();
    await repo.upsertMappings(buildPilotDraftMappings());
    expect((await repo.listMappings()).length).toBe(10);
    const { profiles } = importEcocropSnapshot({
      snapshotVersion: 't',
      retrievedAt: '2026-07-30T00:00:00.000Z',
      sourceUrlOrId: 'x',
      crops: [
        {
          ecocropId: 'E1',
          scientificName: 'Triticum aestivum',
          fields: { temperatureOptimalMinC: 12 },
        },
      ],
    });
    await repo.upsertEcocropProfiles(profiles);
    const updated = await repo.updateEcocropStatus(
      `${profiles[0]!.ecocropId}::${profiles[0]!.snapshotVersion}`,
      'reviewed',
      'rev',
    );
    expect(updated.status).toBe('reviewed');
  });
});

describe('pilot report', () => {
  it('reports 10 pilots without fabricated grape/lentil/pistachio GAEZ codes', () => {
    const report = buildPilotReport(buildPilotDraftMappings());
    expect(report).toHaveLength(10);
    expect(
      report
        .filter((r) => ['grape', 'red_lentil', 'pistachio'].includes(r.pilotCode))
        .every((r) => r.gaezDatasetAvailable === false),
    ).toBe(true);
    expect(report.every((r) => r.ecocropId === null)).toBe(true);
  });
});

describe('completeness audit', () => {
  it('has no implementation gaps when catalog has pilot crops', async () => {
    const repo = new InMemoryFaoExternalRepository();
    const datasets: GaezDataset[] = [
      'Wheat',
      'Barley',
      'Chickpea',
      'Maize',
      'Cotton',
      'Tomato',
      'Olive',
    ].map((crop, idx) => ({
      provider: 'gaez' as const,
      version: 'v4' as const,
      datasetId: `s-${idx}`,
      name: `sxHr_${idx}`,
      variable: 'Crop suitability index in classes; all land in grid cell',
      serviceUrl: 'x',
      filepath: null,
      downloadUrl: null,
      active: true,
      syncedAt: '2026-07-30T00:00:00.000Z',
      cropCode: crop,
      scientificName: null,
      waterSupply: 'Rainfed',
      inputLevel: 'High',
      climateScenario: 'historical_baseline',
      resolution: '0.083333°',
      unit: 'Class',
      retrievedAt: '2026-07-30T00:00:00.000Z',
      sourceUrlOrId: 'x',
      limitations: [],
    }));
    await repo.replaceGaezDatasets(datasets);
    await repo.upsertMappings(buildPilotDraftMappings());
    const report = await buildCompletenessReport(repo);
    expect(report.summary.gap).toBe(0);
    expect(report.summary.blocked).toBeGreaterThanOrEqual(4);
  });
});
