import type { ParcelProvider } from '../providers/parcel-provider.interface.js';
import type { ParcelQuery, ParcelResolveResponse, ResolvedParcel } from '../types/parcel.types.js';
import { ParcelNormalizationService } from './parcel-normalization.service.js';
import { mapParcelProviderError } from '../utils/parcel-error.mapper.js';

interface CacheEntry {
  value: ResolvedParcel;
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export class ParcelQueryService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly provider: ParcelProvider,
    private readonly normalization = new ParcelNormalizationService(),
  ) {}

  async resolve(query: ParcelQuery): Promise<ParcelResolveResponse> {
    const cacheKey = this.normalization.toCacheKey(query);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      console.info('[ParcelCache] hit', { provider: this.provider.name, cacheKey });
      return {
        query,
        parcel: cached.value,
      };
    }

    console.info('[ParcelCache] miss', { provider: this.provider.name, cacheKey });

    try {
      const parcel = await this.provider.resolve(query);
      this.cache.set(cacheKey, {
        value: parcel,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return { query, parcel };
    } catch (error) {
      throw mapParcelProviderError(error, 'parcel resolve failed');
    }
  }

  /** Test helper */
  clearCache(): void {
    this.cache.clear();
  }
}
