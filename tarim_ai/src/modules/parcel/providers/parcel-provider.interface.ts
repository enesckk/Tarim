import type { ParcelQuery, ResolvedParcel } from '../types/parcel.types.js';

/**
 * Abstraction over cadastral data sources.
 * Controllers must never depend on a concrete TKGM client.
 */
export interface ParcelProvider {
  readonly name: string;
  resolve(query: ParcelQuery): Promise<ResolvedParcel>;
}

export interface ParcelProviderFailure extends Error {
  code?: string;
  provider?: string;
  retryable?: boolean;
}
