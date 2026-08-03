export type RiskLevel = 'low' | 'medium' | 'high';

export interface ProviderLocation {
  longitude: number;
  latitude: number;
}

/** Base metadata — extended fields are optional for backward compatibility. */
export interface ProviderMetadata {
  source: string;
  generatedAt: string;
  isMock: boolean;
  isEstimated?: boolean;
  provider?: string;
  [key: string]: unknown;
}

export interface ParcelContext {
  province?: string;
  district?: string;
  neighborhood?: string;
  block?: string;
  parcel?: string;
}

export interface ProviderInputBase {
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: unknown;
  };
  centroid: ProviderLocation;
  parcel?: ParcelContext;
}
