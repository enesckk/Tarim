import type { ParcelProvider } from './parcel-provider.interface.js';
import type { ParcelQuery, ResolvedParcel } from '../types/parcel.types.js';
import {
  loadVerifiedParcelDocument,
  toResolvedVerifiedParcel,
} from '../services/verified-parcel-geometry.service.js';

export class VerifiedGeoJsonParcelProvider implements ParcelProvider {
  readonly name = 'verified_geojson';

  async resolve(query: ParcelQuery): Promise<ResolvedParcel> {
    const document = await loadVerifiedParcelDocument(query);
    return toResolvedVerifiedParcel(query, document);
  }
}
