import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { MockClimateProvider } from '../src/modules/environment/climate/providers/mock-climate.provider.js';
import { MockSoilProvider } from '../src/modules/environment/soil/providers/mock-soil.provider.js';
import { ExternalClimateProvider } from '../src/modules/environment/climate/providers/external-climate.provider.js';
import { ExternalSoilProvider } from '../src/modules/environment/soil/providers/external-soil.provider.js';
import { ClimateProfileService } from '../src/modules/environment/climate/services/climate-profile.service.js';
import { SoilProfileService } from '../src/modules/environment/soil/services/soil-profile.service.js';
import { ClimateNormalizationService } from '../src/modules/environment/climate/services/climate-normalization.service.js';
import { SoilNormalizationService } from '../src/modules/environment/soil/services/soil-normalization.service.js';
import { EnvironmentProfileService } from '../src/modules/environment/shared/services/environment-profile.service.js';
import { climateProfileSchema } from '../src/modules/environment/climate/schemas/climate.schema.js';
import { soilProfileSchema } from '../src/modules/environment/soil/schemas/soil.schema.js';
import { MockParcelProvider } from '../src/modules/parcel/providers/mock-parcel.provider.js';
import { ParcelQueryService } from '../src/modules/parcel/services/parcel-query.service.js';
import { computeParcelCentroid } from '../src/modules/environment/shared/services/parcel-centroid.service.js';
import { resetEnvCache } from '../src/config/env.js';
import type { ClimateProfile } from '../src/modules/environment/climate/types/climate.types.js';
import type { SoilProfile } from '../src/modules/environment/soil/types/soil.types.js';

const parcelQuery = {
  province: 'Gaziantep',
  district: 'Şehitkamil',
  neighborhood: 'Güngürge',
  block: '108',
  parcel: '7',
};

function ensureEnv(): void {
  process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
  process.env.COPERNICUS_CLIENT_SECRET = process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
  process.env.CLIMATE_PROVIDER = 'mock';
  process.env.SOIL_PROVIDER = 'mock';
  process.env.PARCEL_PROVIDER = 'mock';
  resetEnvCache();
}

describe('climate provider', () => {
  beforeEach(ensureEnv);

  it('returns a valid mock climate profile schema', async () => {
    const provider = new MockClimateProvider();
    const profile = await provider.getProfile({
      geometry: { type: 'Polygon', coordinates: [] },
      centroid: { longitude: 37.475, latitude: 37.206 },
      years: 10,
    });

    expect(climateProfileSchema.parse(profile).metadata.isMock).toBe(true);
    expect(profile.limitations[0]).toContain('temsili');
    expect(['low', 'medium', 'high']).toContain(profile.temperature.frostRisk);
  });

  it('resolves profile via parcelQuery and geometry', async () => {
    const parcelQueryService = new ParcelQueryService(new MockParcelProvider());
    const service = new ClimateProfileService(new MockClimateProvider(), parcelQueryService);

    const byParcel = await service.getProfile({ parcelQuery, years: 10 });
    expect(byParcel.provider).toBe('mock');
    expect(byParcel.metadata.isMock).toBe(true);

    const geometry = (await parcelQueryService.resolve(parcelQuery)).parcel.geometry;
    const byGeometry = await service.getProfile({ geometry, years: 10 });
    expect(byGeometry.precipitation.annualTotalMm).toBeGreaterThan(0);
  });

  it('rejects negative precipitation during normalization', () => {
    const normalization = new ClimateNormalizationService();
    const invalid = {
      provider: 'mock',
      location: { longitude: 1, latitude: 1 },
      period: { years: 10, type: 'climatology' },
      temperature: {
        annualMeanC: 1,
        growingSeasonMeanC: 1,
        summerMeanC: 1,
        winterMeanC: 1,
        annualMinC: 0,
        annualMaxC: 2,
        frostRisk: 'low',
        extremeHeatRisk: 'low',
      },
      precipitation: {
        annualTotalMm: -1,
        growingSeasonTotalMm: 0,
        summerTotalMm: 0,
        seasonality: 'low',
      },
      water: { estimatedIrrigationNeed: 'low', droughtRisk: 'low' },
      confidence: 'low',
      limitations: [],
      metadata: { source: 'x', generatedAt: new Date().toISOString(), isMock: true },
    } as ClimateProfile;

    expect(() => normalization.normalize(invalid)).toThrow(/invalid response/i);
  });

  it('hits climate cache on second call', async () => {
    const provider = new MockClimateProvider();
    const spy = vi.spyOn(provider, 'getProfile');
    const service = new ClimateProfileService(
      provider,
      new ParcelQueryService(new MockParcelProvider()),
    );

    await service.getProfile({ parcelQuery, years: 10 });
    await service.getProfile({ parcelQuery, years: 10 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('maps external timeout to 504', async () => {
    process.env.CLIMATE_PROVIDER = 'external';
    process.env.EXTERNAL_CLIMATE_BASE_URL = 'https://example.invalid';
    resetEnvCache();

    vi.spyOn(axios, 'post').mockRejectedValue(
      Object.assign(new Error('timeout'), { code: 'ECONNABORTED', isAxiosError: true }),
    );

    const provider = new ExternalClimateProvider();
    await expect(
      provider.getProfile({
        geometry: { type: 'Polygon', coordinates: [] },
        centroid: { longitude: 1, latitude: 1 },
        years: 10,
      }),
    ).rejects.toMatchObject({ statusCode: 504 });
  });

  it('maps invalid external response to 502', async () => {
    process.env.CLIMATE_PROVIDER = 'external';
    process.env.EXTERNAL_CLIMATE_BASE_URL = 'https://example.invalid';
    resetEnvCache();

    vi.spyOn(axios, 'post').mockResolvedValue({ data: { broken: true } });
    const provider = new ExternalClimateProvider();
    await expect(
      provider.getProfile({
        geometry: { type: 'Polygon', coordinates: [] },
        centroid: { longitude: 1, latitude: 1 },
        years: 10,
      }),
    ).rejects.toMatchObject({ statusCode: 502 });
  });
});

describe('soil provider', () => {
  beforeEach(() => {
    ensureEnv();
    vi.restoreAllMocks();
  });

  it('returns a valid mock soil profile schema', async () => {
    const provider = new MockSoilProvider();
    const profile = await provider.getProfile({
      geometry: { type: 'Polygon', coordinates: [] },
      centroid: { longitude: 37.475, latitude: 37.206 },
    });

    expect(soilProfileSchema.parse(profile).metadata.isMock).toBe(true);
    expect(profile.limitations[0]).toContain('laboratuvar');
    expect(profile.soil.texture).toBe('clay_loam');
  });

  it('rejects invalid pH and negative organic matter', () => {
    const normalization = new SoilNormalizationService();
    const base = {
      provider: 'mock',
      location: { longitude: 1, latitude: 1 },
      soil: {
        ph: 15,
        texture: 'loam',
        organicMatterPercent: 1,
        electricalConductivityDsM: 0,
        salinityRisk: 'low',
        drainage: 'good',
        waterHoldingCapacity: 'medium',
        calciumCarbonatePercent: 0,
        depthCm: 50,
      },
      suitabilitySignals: {
        rootDevelopment: 'good',
        waterRetention: 'good',
        salinityConstraint: 'low',
        generalSoilCondition: 'good',
      },
      confidence: 'low',
      limitations: [],
      metadata: { source: 'x', generatedAt: new Date().toISOString(), isMock: true },
    } as SoilProfile;

    expect(() => normalization.normalize(base)).toThrow(/invalid response/i);

    base.soil.ph = 7;
    base.soil.organicMatterPercent = -1;
    expect(() => normalization.normalize(base)).toThrow(/invalid response/i);
  });

  it('hits soil cache on second call', async () => {
    const provider = new MockSoilProvider();
    const spy = vi.spyOn(provider, 'getProfile');
    const service = new SoilProfileService(
      provider,
      new ParcelQueryService(new MockParcelProvider()),
    );

    await service.getProfile({ parcelQuery });
    await service.getProfile({ parcelQuery });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('maps external soil timeout and invalid schema', async () => {
    process.env.SOIL_PROVIDER = 'external';
    process.env.EXTERNAL_SOIL_BASE_URL = 'https://example.invalid';
    resetEnvCache();

    vi.spyOn(axios, 'post').mockRejectedValueOnce(
      Object.assign(new Error('timeout'), { code: 'ECONNABORTED', isAxiosError: true }),
    );
    await expect(
      new ExternalSoilProvider().getProfile({
        geometry: { type: 'Polygon', coordinates: [] },
        centroid: { longitude: 1, latitude: 1 },
      }),
    ).rejects.toMatchObject({ statusCode: 504 });

    vi.spyOn(axios, 'post').mockResolvedValueOnce({ data: { nope: true } });
    await expect(
      new ExternalSoilProvider().getProfile({
        geometry: { type: 'Polygon', coordinates: [] },
        centroid: { longitude: 1, latitude: 1 },
      }),
    ).rejects.toMatchObject({ statusCode: 502 });
  });
});

describe('combined environment profile', () => {
  beforeEach(ensureEnv);
  afterEach(() => vi.restoreAllMocks());

  it('reuses parcel resolve and returns combined schema fields', async () => {
    const parcelProvider = new MockParcelProvider();
    const parcelQueryService = new ParcelQueryService(parcelProvider);
    const resolveSpy = vi.spyOn(parcelQueryService, 'resolve');

    const climateService = new ClimateProfileService(
      new MockClimateProvider(),
      parcelQueryService,
    );
    const soilService = new SoilProfileService(new MockSoilProvider(), parcelQueryService);
    const combined = new EnvironmentProfileService(
      parcelQueryService,
      climateService,
      soilService,
    );

    const result = await combined.getProfile({ parcelQuery, years: 10 });

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(result.parcel?.title).toContain('Güngürge');
    expect(result.climate.metadata.isMock).toBe(true);
    expect(result.soil.metadata.isMock).toBe(true);
    expect(result.climate.limitations.length).toBeGreaterThan(0);
    expect(result.soil.limitations.length).toBeGreaterThan(0);
  });

  it('rejects geometry + parcelQuery together', async () => {
    const parcelQueryService = new ParcelQueryService(new MockParcelProvider());
    const combined = new EnvironmentProfileService(
      parcelQueryService,
      new ClimateProfileService(new MockClimateProvider(), parcelQueryService),
      new SoilProfileService(new MockSoilProvider(), parcelQueryService),
    );

    const geometry = (await parcelQueryService.resolve(parcelQuery)).parcel.geometry;
    await expect(
      combined.getProfile({ geometry, parcelQuery, years: 10 }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('computes centroid inside parcel polygon', async () => {
    const parcel = await new MockParcelProvider().resolve(parcelQuery);
    const centroid = computeParcelCentroid(parcel.geometry);
    expect(Number.isFinite(centroid.longitude)).toBe(true);
    expect(Number.isFinite(centroid.latitude)).toBe(true);
  });
});
