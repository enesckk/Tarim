# Water Source Management (Phase 2.2G)

## Entity: WaterSource

Tracks wells, springs, canals, reservoirs, and other irrigation sources linked optionally to a parcel.

### Key fields

- Identity: `sourceCode`, `sourceName`, `sourceType`, `ownershipType`
- Location: `latitude`, `longitude`, `geometry`, `isInsideParcel`, `parcelId` / `relatedParcelId`
- Licensing: `licenseNumber`, `licenseStatus`, `permitStartDate`, `permitEndDate`
- Hydraulics: `declaredDischarge` / `measuredDischarge` (+ units), `wellDepth`, static/dynamic levels
- Continuity: `continuityStatus`, `seasonalAvailability`

### Enums

- **SourceType:** WELL, SPRING, STREAM, RIVER, CANAL, RESERVOIR, POND, DAM, MUNICIPAL_NETWORK, RAINWATER_STORAGE, TREATED_WASTEWATER, OTHER
- **OwnershipType:** PRIVATE, PUBLIC, COOPERATIVE, SHARED, UNKNOWN
- **LicenseStatus:** LICENSED, UNLICENSED, PENDING, EXPIRED, UNKNOWN
- **ContinuityStatus:** CONTINUOUS, SEASONAL, INTERMITTENT, UNKNOWN

### Validation

- Negative discharge or well depth rejected
- Null discharge is allowed and distinct from zero
- Soft delete via `isActive=false`

## API

- `GET/POST /api/water-sources`
- `GET/PUT/DELETE /api/water-sources/{id}`
- `GET /api/parcels/{parcelId}/water-sources`
