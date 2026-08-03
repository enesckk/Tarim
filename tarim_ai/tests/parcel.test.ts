import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { ApiError } from '../src/utils/api-error.js';
import { parseTurkishArea } from '../src/modules/parcel/services/parcel-normalization.service.js';
import { MockParcelProvider } from '../src/modules/parcel/providers/mock-parcel.provider.js';
import { TkgmParcelProvider } from '../src/modules/parcel/providers/tkgm-parcel.provider.js';
import { VerifiedGeoJsonParcelProvider } from '../src/modules/parcel/providers/verified-geojson-parcel.provider.js';
import { FallbackParcelProvider } from '../src/modules/parcel/providers/fallback-parcel.provider.js';
import { TkgmProviderService } from '../src/modules/parcel/services/tkgm-provider.service.js';
import { ParcelQueryService } from '../src/modules/parcel/services/parcel-query.service.js';
import { parcelResolveResponseSchema } from '../src/modules/parcel/schemas/parcel-query.schema.js';
import { normalizeGeoJsonGeometry } from '../src/utils/geometry.utils.js';
import { loadVerifiedParcelDocument } from '../src/modules/parcel/services/verified-parcel-geometry.service.js';

const gungurgeQuery = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

describe('parcel normalization', () => {
  it('parses Turkish area strings', () => {
    expect(parseTurkishArea('21.913,16')).toBeCloseTo(21913.16);
    expect(parseTurkishArea('52,52')).toBeCloseTo(52.52);
    expect(parseTurkishArea(100)).toBe(100);
    expect(parseTurkishArea('')).toBeNull();
  });
});

describe('mock parcel provider', () => {
  it('resolves Güngürge 108/7 from local GeoJSON', async () => {
    const provider = new MockParcelProvider();
    const parcel = await provider.resolve(gungurgeQuery);

    expect(parcel.geometry.type).toBe('Polygon');
    expect(parcel.areaSquareMeters).toBeCloseTo(21913.16);
    expect(parcel.landType).toBe('Tarla');
    expect(parcel.sheet).toBe('N38-C-05-C-4');
    expect(parcel.bbox).toHaveLength(4);
  });

  it('returns 404 for unknown parcel', async () => {
    const provider = new MockParcelProvider();
    await expect(
      provider.resolve({ ...gungurgeQuery, parcel: '999' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('verified GeoJSON parcel provider', () => {
  it('loads verified parcel fixture with checksum and metadata', async () => {
    const provider = new VerifiedGeoJsonParcelProvider();
    const parcel = await provider.resolve(gungurgeQuery);

    expect(parcel.provider).toBe('verified_geojson');
    expect(parcel.sourceType).toBe('manually_verified_real_geometry');
    expect(parcel.verified).toBe(true);
    expect(parcel.areaSquareMeters).toBeGreaterThan(0);
    expect(parcel.centroid?.latitude).toBeTypeOf('number');
  });

  it('fails for parcel without verified fixture', async () => {
    const provider = new VerifiedGeoJsonParcelProvider();
    await expect(
      provider.resolve({ ...gungurgeQuery, parcel: '999' }),
    ).rejects.toMatchObject({ code: 'VERIFIED_PARCEL_MISSING' });
  });

  it('validates fixture geometry document', async () => {
    const document = await loadVerifiedParcelDocument(gungurgeQuery);
    expect(document.geometry.type).toBe('Polygon');
    expect(document.areaSquareMeters).toBeGreaterThan(0);
  });
});

describe('parcel fallback provider', () => {
  it('uses verified fixture after TKGM forbidden failure', async () => {
    const tkgm = {
      name: 'tkgm',
      resolve: vi.fn().mockRejectedValue(
        new ApiError(502, 'blocked', { code: 'PARCEL_PROVIDER_FORBIDDEN' }),
      ),
    };
    const verified = new VerifiedGeoJsonParcelProvider();
    const provider = new FallbackParcelProvider([tkgm, verified], [
      'tkgm',
      'verified_geojson',
    ]);

    const parcel = await provider.resolve(gungurgeQuery);
    expect(parcel.provider).toBe('verified_geojson');
    expect(parcel.fallbackUsed).toBe(true);
    expect(parcel.fallbackReason).toBe('PARCEL_PROVIDER_FORBIDDEN');
  });

  it('fails when fallback is disabled and TKGM is forbidden', async () => {
    const tkgm = {
      name: 'tkgm',
      resolve: vi.fn().mockRejectedValue(
        new ApiError(502, 'blocked', { code: 'PARCEL_PROVIDER_FORBIDDEN' }),
      ),
    };
    const provider = new FallbackParcelProvider([tkgm], ['tkgm']);

    await expect(provider.resolve(gungurgeQuery)).rejects.toMatchObject({
      code: 'PARCEL_PROVIDER_FORBIDDEN',
    });
  });
});

describe('TKGM feature mapping', () => {
  it('maps a valid TKGM Feature with Turkish area and Polygon', () => {
    const provider = new TkgmParcelProvider();
    const resolved = provider.mapFeature(
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [37.47634, 37.20623],
              [37.47514, 37.20754],
              [37.47414, 37.20709],
              [37.47634, 37.20623],
            ],
          ],
        },
        properties: {
          ilAd: 'Gaziantep',
          ilceAd: 'Şehitkamil',
          mahalleAd: 'Güngürge',
          adaNo: '108',
          parselNo: '7',
          nitelik: 'Tarla',
          alan: '21.913,16',
          pafta: 'N38-C-05-C-4',
        },
      },
      gungurgeQuery,
    );

    expect(resolved.areaSquareMeters).toBeCloseTo(21913.16);
    expect(resolved.geometry.type).toBe('Polygon');
    expect(resolved.title).toContain('Güngürge');
  });

  it('maps MultiPolygon geometry', () => {
    const provider = new TkgmParcelProvider();
    const resolved = provider.mapFeature(
      {
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [37.47634, 37.20623],
                [37.47514, 37.20754],
                [37.47414, 37.20709],
                [37.47634, 37.20623],
              ],
            ],
          ],
        },
        properties: {
          ilAd: 'Gaziantep',
          ilceAd: 'Şehitkamil',
          mahalleAd: 'Güngürge',
          adaNo: '108',
          parselNo: '7',
          alan: '100,00',
        },
      },
      gungurgeQuery,
    );

    expect(resolved.geometry.type).toBe('MultiPolygon');
  });

  it('rejects missing or unsupported geometry with 422', () => {
    const provider = new TkgmParcelProvider();

    expect(() =>
      provider.mapFeature({ geometry: null, properties: {} }, gungurgeQuery),
    ).toThrow(ApiError);

    expect(() =>
      provider.mapFeature(
        {
          geometry: { type: 'Point', coordinates: [37, 37] },
          properties: {},
        },
        gungurgeQuery,
      ),
    ).toThrow(/geometrisi geçersiz/i);
  });
});

describe('parcel query cache', () => {
  it('returns cache hit on second resolve', async () => {
    const provider = new MockParcelProvider();
    const spy = vi.spyOn(provider, 'resolve');
    const service = new ParcelQueryService(provider);

    const first = await service.resolve(gungurgeQuery);
    const second = await service.resolve(gungurgeQuery);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(first.parcel.title).toBe(second.parcel.title);
    expect(() => parcelResolveResponseSchema.parse(first)).not.toThrow();
  });
});

describe('TKGM retry / timeout behavior', () => {
  beforeEach(async () => {
    const { resetEnvCache } = await import('../src/config/env.js');
    process.env.PARCEL_PROVIDER = 'tkgm';
    process.env.TKGM_BASE_URL = 'https://example.invalid/api';
    // Force absolute provinces URL so the client uses axios.get (spy target).
    process.env.TKGM_PROVINCES_PATH = 'https://example.invalid/ilListe.json';
    process.env.TKGM_MAX_RETRIES = '2';
    process.env.TKGM_TIMEOUT_MS = '50';
    // Ensure Copernicus vars exist so getEnv still parses
    process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
    process.env.COPERNICUS_CLIENT_SECRET =
      process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
    resetEnvCache();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    const { resetEnvCache } = await import('../src/config/env.js');
    process.env.PARCEL_PROVIDER = 'mock';
    resetEnvCache();
  });

  it('retries transient failures up to max retries then returns safe 502', async () => {
    // Provinces path defaults to an absolute URL → uses axios.get (not instance.get).
    const getSpy = vi.spyOn(axios, 'get').mockRejectedValue(
      Object.assign(new Error('timeout of 50ms exceeded'), {
        code: 'ECONNABORTED',
        isAxiosError: true,
      }),
    );

    const service = new TkgmProviderService();

    await expect(service.findProvinceId('Gaziantep')).rejects.toMatchObject({
      statusCode: 502,
      message: 'Parsel bilgisi şu anda alınamıyor.',
    });

    expect(getSpy).toHaveBeenCalledTimes(3);
  });

  it('maps TKGM 403 to canonical forbidden code', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue({
      isAxiosError: true,
      response: { status: 403 },
      message: 'forbidden',
    });

    const service = new TkgmProviderService();

    await expect(service.findProvinceId('Gaziantep')).rejects.toMatchObject({
      code: 'PARCEL_PROVIDER_FORBIDDEN',
    });
  });
});

describe('parcel analyze integration (mocked sentinel services)', () => {
  it('reuses resolve geometry and returns analysis payload shape', async () => {
    const provider = new MockParcelProvider();
    const queryService = new ParcelQueryService(provider);

    const agricultural = await import('../src/services/agricultural-analysis.service.js');
    const timeSeries = await import('../src/services/time-series.service.js');

    vi.spyOn(agricultural.agriculturalAnalysisService, 'computeBestAnalysisSummary').mockResolvedValue({
      selectionType: 'best',
      selectionReason: 'test',
      product: {
        productId: 'p',
        datetime: '2026-01-01T00:00:00Z',
        satellite: 'sentinel-2a',
        tile: 'T37SCB',
        cloudCoverage: 0,
      },
      indices: {
        ndvi: {
          min: 0,
          max: 1,
          mean: 0.2,
          median: 0.2,
          standardDeviation: 0.1,
          validPixelCount: 1,
          noDataPixelCount: 0,
          totalPixelCount: 1,
          vegetatedPixelCount: 0,
          lowVegetationPixelCount: 1,
          bareOrWaterPixelCount: 0,
          vegetatedPixelRatio: 0,
          lowVegetationPixelRatio: 1,
          bareOrWaterPixelRatio: 0,
        },
        ndmi: {
          min: 0,
          max: 1,
          mean: 0,
          median: 0,
          standardDeviation: 0,
          validPixelCount: 1,
          noDataPixelCount: 0,
          totalPixelCount: 1,
          highMoisturePixelCount: 0,
          moderateMoisturePixelCount: 1,
          lowMoisturePixelCount: 0,
          highMoisturePixelRatio: 0,
          moderateMoisturePixelRatio: 1,
          lowMoisturePixelRatio: 0,
        },
        bsi: {
          min: 0,
          max: 1,
          mean: 0.1,
          median: 0.1,
          standardDeviation: 0,
          validPixelCount: 1,
          noDataPixelCount: 0,
          totalPixelCount: 1,
          highBareSoilPixelCount: 0,
          moderateBareSoilPixelCount: 1,
          lowBareSoilPixelCount: 0,
          highBareSoilPixelRatio: 0,
          moderateBareSoilPixelRatio: 1,
          lowBareSoilPixelRatio: 0,
        },
      },
      interpretation: {
        vegetationStatus: 'x',
        moistureStatus: 'y',
        soilSurfaceStatus: 'z',
        summary: 's',
        confidence: 'low',
      },
    } as never);

    vi.spyOn(timeSeries.timeSeriesService, 'computeTimeSeries').mockResolvedValue({
      period: { start: 'a', end: 'b', months: 6 },
      filters: { maxCloudCoverage: 20, sampling: 'weekly-best' },
      summary: {
        catalogProductCount: 1,
        selectedAcquisitionCount: 1,
        successfulAcquisitionCount: 1,
        failedAcquisitionCount: 0,
      },
      series: [],
      trends: {
        ndvi: { first: 0, last: 0, min: 0, max: 0, mean: 0, change: 0, direction: 'stable' },
        ndmi: { first: 0, last: 0, min: 0, max: 0, mean: 0, change: 0, direction: 'stable' },
        bsi: { first: 0, last: 0, min: 0, max: 0, mean: 0, change: 0, direction: 'stable' },
      },
      interpretation: {
        vegetationTrend: 'v',
        moistureTrend: 'm',
        soilSurfaceTrend: 's',
        summary: 'summary',
        confidence: 'low',
      },
    } as never);

    const { ParcelAnalyzeService } = await import(
      '../src/modules/parcel/services/parcel-analyze.service.js'
    );
    const analyzeService = new ParcelAnalyzeService(queryService);
    const result = await analyzeService.analyze(gungurgeQuery);

    expect(result.parcel.block).toBe('108');
    expect(result.currentAnalysis).toBeTruthy();
    expect(result.timeSeries).toBeTruthy();
  });
});

describe('geometry reuse', () => {
  it('normalizes polygon from mock parcel geometry', async () => {
    const provider = new MockParcelProvider();
    const parcel = await provider.resolve(gungurgeQuery);
    const normalized = normalizeGeoJsonGeometry(parcel.geometry);
    expect(normalized.type).toBe('Polygon');
  });
});
