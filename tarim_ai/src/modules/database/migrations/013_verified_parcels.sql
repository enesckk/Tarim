CREATE TABLE IF NOT EXISTS verified_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province TEXT NOT NULL,
  district TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  block TEXT NOT NULL,
  parcel TEXT NOT NULL,
  geometry_json JSONB NOT NULL,
  area_square_meters DOUBLE PRECISION NOT NULL CHECK (area_square_meters > 0),
  centroid_latitude DOUBLE PRECISION NOT NULL CHECK (centroid_latitude >= -90 AND centroid_latitude <= 90),
  centroid_longitude DOUBLE PRECISION NOT NULL CHECK (centroid_longitude >= -180 AND centroid_longitude <= 180),
  source TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('verified', 'pending', 'rejected')),
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  checksum TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_version INTEGER NOT NULL DEFAULT 1 CHECK (row_version >= 1),
  UNIQUE (province, district, neighborhood, block, parcel)
);

CREATE INDEX IF NOT EXISTS idx_verified_parcels_verified
  ON verified_parcels (verification_status, province, district, neighborhood, block, parcel);
