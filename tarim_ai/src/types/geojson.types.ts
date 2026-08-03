export type Position = number[];

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

/** Geometry accepted by catalog/process after input normalization. */
export type NormalizedGeometry = PolygonGeometry | MultiPolygonGeometry;

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: NormalizedGeometry | null;
  properties?: Record<string, unknown> | null;
  id?: string | number;
}

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

/** Accepted request geometry payloads before normalization. */
export type GeoJsonInput = NormalizedGeometry | GeoJsonFeature | FeatureCollection;
