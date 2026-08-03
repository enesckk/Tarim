import type { Env } from '../../../../config/env.js';
import { ApiError } from '../../../../utils/api-error.js';
import { axiosGetWithRetry } from '../../shared/utils/http-retry.js';
import { ProviderCircuitBreaker } from '../../shared/utils/provider-circuit-breaker.js';
import type { SoilProvider } from './soil-provider.interface.js';
import type { SoilProviderInput, SoilProfile } from '../types/soil.types.js';
import {
  SOC_TO_ORGANIC_MATTER_FACTOR,
  SOILGRIDS_DEPTHS,
  SOILGRIDS_PROPERTY_CONFIG,
  SOILGRIDS_REQUEST_PROPERTIES,
  SOILGRIDS_SPATIAL_RESOLUTION_METERS,
  type SoilGridsDepth,
  type SoilGridsProperty,
} from '../config/soilgrids-units.config.js';
import { SoilDepthAggregationService } from '../services/soil-depth-aggregation.service.js';
import { SoilTextureClassificationService } from '../services/soil-texture-classification.service.js';

export interface SoilGridsConfig {
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

export function soilGridsConfigFromEnv(env: Env): SoilGridsConfig {
  return {
    baseUrl: env.SOILGRIDS_BASE_URL.replace(/\/$/, ''),
    timeoutMs: env.SOILGRIDS_TIMEOUT_MS,
    maxRetries: env.SOILGRIDS_MAX_RETRIES,
  };
}

interface SoilGridsLayer {
  name?: string;
  unit?: string;
  depths?: Array<{
    label?: string;
    values?: { mean?: number | null };
  }>;
}

interface SoilGridsResponse {
  properties?: {
    layers?: SoilGridsLayer[];
  };
}

const sharedSoilGridsBreaker = new ProviderCircuitBreaker({
  name: 'soilgrids',
  failureThreshold: 3,
  cooldownMs: 10 * 60 * 1000,
});

export class SoilGridsSoilProvider implements SoilProvider {
  readonly name = 'soilgrids';

  constructor(
    private readonly config: SoilGridsConfig,
    private readonly depthAggregation = new SoilDepthAggregationService(),
    private readonly textureClassification = new SoilTextureClassificationService(),
    private readonly fetchJson: typeof axiosGetWithRetry = axiosGetWithRetry,
    private readonly circuitBreaker = sharedSoilGridsBreaker,
  ) {}

  async getProfile(input: SoilProviderInput): Promise<SoilProfile> {
    if (this.circuitBreaker.isOpen()) {
      throw new ApiError(503, 'SoilGrids temporarily unavailable (circuit open).');
    }

    const url = this.buildUrl(input.centroid.longitude, input.centroid.latitude);

    let payload: SoilGridsResponse;
    try {
      payload = await this.fetchJson<SoilGridsResponse>(
        url,
        {
          timeout: this.config.timeoutMs,
          headers: { Accept: 'application/json' },
        },
        {
          maxRetries: this.config.maxRetries,
          providerLabel: 'SoilGrids',
          rateLimitStatus: 503,
        },
      );
      this.circuitBreaker.recordSuccess();
    } catch (error) {
      this.circuitBreaker.recordFailure();
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(502, 'SoilGrids is unavailable.');
    }

    const layers = payload.properties?.layers;
    if (!Array.isArray(layers) || layers.length === 0) {
      this.circuitBreaker.recordFailure();
      throw new ApiError(502, 'SoilGrids returned an invalid response.');
    }

    const parsed = parseLayers(layers);
    const warnings: string[] = [];
    const availableFields: string[] = [];
    const unavailableFields: string[] = [];
    const derivedFields: string[] = [];

    const phAgg = this.depthAggregation.weightedAverage(parsed.phh2o);
    if (phAgg.value == null) {
      throw new ApiError(502, 'SoilGrids returned an invalid response.');
    }
    availableFields.push('ph');

    const socAgg = this.depthAggregation.weightedAverage(parsed.soc);
    const clayAgg = this.depthAggregation.weightedAverage(parsed.clay);
    const sandAgg = this.depthAggregation.weightedAverage(parsed.sand);
    const siltAgg = this.depthAggregation.weightedAverage(parsed.silt);

    if (clayAgg.value == null || sandAgg.value == null || siltAgg.value == null) {
      unavailableFields.push('texture');
    } else {
      availableFields.push('texture', 'sand', 'silt', 'clay');
    }

    const textureResult = this.textureClassification.classify({
      sand: sandAgg.value ?? 0,
      silt: siltAgg.value ?? 0,
      clay: clayAgg.value ?? 0,
    });
    if (textureResult.warning) {
      warnings.push(textureResult.warning);
    }

    let organicMatterPercent = 0;
    if (socAgg.value != null) {
      // SOC g/kg → %C ≈ /10; then SOM ≈ %C × 1.724
      const organicCarbonPercent = socAgg.value / 10;
      organicMatterPercent =
        Math.round(organicCarbonPercent * SOC_TO_ORGANIC_MATTER_FACTOR * 100) / 100;
      availableFields.push('organicMatterPercent');
      derivedFields.push('organicMatterPercent');
      warnings.push(
        'Organik madde, SoilGrids SOC değerinden Van Bemmelen faktörü (×1.724) ile tahmin edilmiştir.',
      );
    } else {
      unavailableFields.push('organicMatterPercent');
    }

    unavailableFields.push(
      'electricalConductivityDsM',
      'calciumCarbonatePercent',
      'drainage',
      'trueRootingDepthCm',
    );

    const waterHoldingCapacity = deriveWaterHolding(
      textureResult.texture,
      organicMatterPercent,
    );
    derivedFields.push('waterHoldingCapacity');

    const rootDevelopment = deriveRootDevelopment(textureResult.texture);
    const waterRetention = deriveWaterRetention(textureResult.texture, organicMatterPercent);
    const generalSoilCondition =
      unavailableFields.length >= 3
        ? 'moderate'
        : waterRetention === 'good' && rootDevelopment !== 'poor'
          ? 'moderate'
          : 'moderate';

    const depthProfile: Record<string, Record<string, number | null>> = {};
    for (const depth of SOILGRIDS_DEPTHS) {
      depthProfile[depth] = {
        phh2o: parsed.phh2o[depth] ?? null,
        soc: parsed.soc[depth] ?? null,
        clay: parsed.clay[depth] ?? null,
        sand: parsed.sand[depth] ?? null,
        silt: parsed.silt[depth] ?? null,
      };
    }

    return {
      provider: this.name,
      location: {
        longitude: input.centroid.longitude,
        latitude: input.centroid.latitude,
      },
      soil: {
        ph: Math.round(phAgg.value * 100) / 100,
        texture: textureResult.texture,
        organicMatterPercent,
        electricalConductivityDsM: null,
        salinityRisk: 'unknown',
        drainage: 'unknown',
        waterHoldingCapacity,
        calciumCarbonatePercent: null,
        depthCm: null,
      },
      suitabilitySignals: {
        rootDevelopment,
        waterRetention,
        salinityConstraint: 'unknown',
        generalSoilCondition,
      },
      confidence: 'low',
      limitations: [
        'SoilGrids 250 m grid tahmini veridir; parsel içi değişkenliği göstermeyebilir.',
        'Laboratuvar analizinin yerini tutmaz.',
        'EC, drenaj, kireç ve gerçek köklenebilir toprak derinliği bu kaynaktan doğrudan gelmez.',
        'Organik madde tahmini SOC dönüşümüne dayanır.',
      ],
      metadata: {
        source: 'ISRIC SoilGrids',
        provider: this.name,
        generatedAt: new Date().toISOString(),
        isMock: false,
        isEstimated: true,
        spatialResolutionMeters: SOILGRIDS_SPATIAL_RESOLUTION_METERS,
        queriedProperties: [...SOILGRIDS_REQUEST_PROPERTIES],
        queriedDepths: [...SOILGRIDS_DEPTHS],
        availableFields,
        unavailableFields,
        derivedFields,
        warnings,
        depthProfile,
        sampledDepthCm: 60,
        textureFractions: textureResult.fractions,
      },
    };
  }

  buildUrl(longitude: number, latitude: number): string {
    const params = new URLSearchParams();
    params.set('lon', String(longitude));
    params.set('lat', String(latitude));
    for (const property of SOILGRIDS_REQUEST_PROPERTIES) {
      params.append('property', property);
    }
    for (const depth of SOILGRIDS_DEPTHS) {
      params.append('depth', depth);
    }
    params.append('value', 'mean');
    return `${this.config.baseUrl}/soilgrids/v2.0/properties/query?${params.toString()}`;
  }

  /** Test helper */
  static resetCircuitBreaker(): void {
    sharedSoilGridsBreaker.reset();
  }

  getCircuitBreaker(): ProviderCircuitBreaker {
    return this.circuitBreaker;
  }
}

function parseLayers(layers: SoilGridsLayer[]): Record<
  'phh2o' | 'soc' | 'clay' | 'sand' | 'silt',
  Partial<Record<SoilGridsDepth, number>>
> {
  const result: Record<
    'phh2o' | 'soc' | 'clay' | 'sand' | 'silt',
    Partial<Record<SoilGridsDepth, number>>
  > = {
    phh2o: {},
    soc: {},
    clay: {},
    sand: {},
    silt: {},
  };

  for (const layer of layers) {
    const name = layer.name as SoilGridsProperty | undefined;
    if (!name || !(name in SOILGRIDS_PROPERTY_CONFIG)) {
      continue;
    }
    if (!(name in result)) {
      continue;
    }
    const factor = SOILGRIDS_PROPERTY_CONFIG[name].dFactor;
    for (const depthEntry of layer.depths ?? []) {
      const label = depthEntry.label as SoilGridsDepth | undefined;
      const mean = depthEntry.values?.mean;
      if (!label || !SOILGRIDS_DEPTHS.includes(label as SoilGridsDepth)) {
        continue;
      }
      if (mean == null || !Number.isFinite(mean)) {
        continue;
      }
      result[name as 'phh2o' | 'soc' | 'clay' | 'sand' | 'silt'][label] = mean / factor;
    }
  }

  return result;
}

function deriveWaterHolding(
  texture: SoilProfile['soil']['texture'],
  organicMatterPercent: number,
): SoilProfile['soil']['waterHoldingCapacity'] {
  if (texture === 'unknown') {
    return 'unknown';
  }
  if (texture === 'sand' || texture === 'sandy_loam') {
    return organicMatterPercent >= 2 ? 'medium' : 'low';
  }
  if (texture === 'clay' || texture === 'clay_loam') {
    return 'high';
  }
  return organicMatterPercent >= 1.5 ? 'medium' : 'low';
}

function deriveRootDevelopment(
  texture: SoilProfile['soil']['texture'],
): SoilProfile['suitabilitySignals']['rootDevelopment'] {
  if (texture === 'unknown' || texture === 'clay') {
    return 'moderate';
  }
  if (texture === 'loam' || texture === 'sandy_loam' || texture === 'silt_loam') {
    return 'moderate';
  }
  return 'moderate';
}

function deriveWaterRetention(
  texture: SoilProfile['soil']['texture'],
  organicMatterPercent: number,
): SoilProfile['suitabilitySignals']['waterRetention'] {
  if (texture === 'sand') {
    return organicMatterPercent >= 2 ? 'moderate' : 'poor';
  }
  if (texture === 'clay' || texture === 'clay_loam') {
    return 'good';
  }
  if (texture === 'unknown') {
    return 'moderate';
  }
  return organicMatterPercent >= 1.2 ? 'moderate' : 'poor';
}
