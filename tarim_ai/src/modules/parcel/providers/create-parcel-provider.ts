import { getEnv } from '../../../config/env.js';
import type { ParcelProvider } from '../providers/parcel-provider.interface.js';
import { MockParcelProvider } from '../providers/mock-parcel.provider.js';
import { TkgmParcelProvider } from '../providers/tkgm-parcel.provider.js';
import { VerifiedGeoJsonParcelProvider } from '../providers/verified-geojson-parcel.provider.js';
import { DatabaseParcelProvider } from '../providers/database-parcel.provider.js';
import { FallbackParcelProvider } from '../providers/fallback-parcel.provider.js';
import { TkgmProviderService } from '../services/tkgm-provider.service.js';

/**
 * Simple DI factory for parcel providers.
 * Controllers depend on ParcelProvider, never on TKGM HTTP details.
 */
export function createParcelProvider(): ParcelProvider {
  const env = getEnv();
  const factories: Record<string, () => ParcelProvider> = {
    tkgm: () => new TkgmParcelProvider(new TkgmProviderService()),
    verified_geojson: () => new VerifiedGeoJsonParcelProvider(),
    database: () => new DatabaseParcelProvider(),
    mock: () => new MockParcelProvider(),
  };

  if (env.PARCEL_PROVIDER === 'fallback') {
    const order = env.PARCEL_PROVIDER_ORDER.split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value) => value !== 'fallback');
    const providers = order
      .map((name) => factories[name]?.())
      .filter((provider): provider is ParcelProvider => provider != null);
    if (providers.length === 0) {
      return new MockParcelProvider();
    }
    return new FallbackParcelProvider(providers, order);
  }

  return factories[env.PARCEL_PROVIDER]?.() ?? new MockParcelProvider();
}
