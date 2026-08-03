import type { NormalizedGeometry } from '../../../types/geojson.types.js';

export interface ParcelQuery {
  province: string;
  district: string;
  neighborhood: string;
  block: string;
  parcel: string;
}

export interface ResolvedParcel {
  title: string;
  province: string;
  district: string;
  neighborhood: string;
  block: string;
  parcel: string;
  landType: string | null;
  areaSquareMeters: number | null;
  sheet: string | null;
  geometry: NormalizedGeometry;
  bbox: [number, number, number, number];
  centroid?: {
    latitude: number;
    longitude: number;
  } | null;
  provider?: 'tkgm' | 'verified_geojson' | 'database' | 'mock';
  sourceType?:
    | 'official_service'
    | 'manually_verified_real_geometry'
    | 'verified_database_record'
    | 'mock_fixture';
  verified?: boolean;
  fallbackUsed?: boolean;
  fallbackReason?: string | null;
  sourceMetadata?: Record<string, unknown>;
}

export interface ParcelResolveResponse {
  query: ParcelQuery;
  parcel: ResolvedParcel;
}

export interface ParcelAnalyzeResponse {
  parcel: ResolvedParcel;
  currentAnalysis: unknown;
  timeSeries: unknown;
}
