# API Contract Audit

> Generated: 2026-07-29

## Summary

| Metric | Value |
|--------|-------|
| Total Endpoints | 48 |
| Modules | 10 |
| Overall Status | **Ready** |

### Module Breakdown

| Module | Endpoints |
|--------|-----------|
| Health | 6 |
| Parcel | 2 |
| Satellite | 6 |
| Environment | 3 |
| Terrain | 1 |
| Field Survey | 11 |
| Land Usability | 1 |
| Crop Recommendations | 5 |
| Crop Physical Compatibility | 1 |
| Calibration Management | 12 |

---

## Health

| Module | Method | Path | Input | Output | Error Codes | Idempotency | Frontend Usage | Status |
|--------|--------|------|-------|--------|-------------|-------------|----------------|--------|
| Health | GET | `/health` | — | `{ status, uptime }` | 503 | N/A | yes | ready |
| Health | GET | `/api/health` | — | `{ status, services, version }` | 503 | N/A | yes | ready |
| Health | GET | `/api/health/metrics-summary` | — | `{ metrics, counters, histograms }` | 500 | N/A | admin | ready |
| Health | GET | `/api/health/ready` | — | `{ ready: boolean }` | 503 | N/A | yes | ready |
| Health | GET | `/api/health/live` | — | `{ alive: boolean }` | 503 | N/A | yes | ready |
| Health | GET | `/api/health/database` | — | `{ connected, latencyMs }` | 500, 503 | N/A | admin | ready |

## Parcel

| Module | Method | Path | Input | Output | Error Codes | Idempotency | Frontend Usage | Status |
|--------|--------|------|-------|--------|-------------|-------------|----------------|--------|
| Parcel | POST | `/api/parcel/resolve` | `{ province, district, neighborhood, block, parcel }` | `{ parcelId, geometry, area, address }` | 400, 404, 502 | supported | yes | ready |
| Parcel | POST | `/api/parcel/analyze` | `{ parcelId }` or `{ geometry }` | `{ parcelInfo, boundaries, metadata }` | 400, 404, 502 | supported | yes | ready |

## Satellite

| Module | Method | Path | Input | Output | Error Codes | Idempotency | Frontend Usage | Status |
|--------|--------|------|-------|--------|-------------|-------------|----------------|--------|
| Satellite | POST | `/api/satellite/search` | `{ bbox, dateRange, cloudCover?, collections? }` | `{ features[], totalResults }` | 400, 502 | supported | yes | ready |
| Satellite | POST | `/api/satellite/process` | `{ bbox, dateRange, evalscript, format? }` | `{ imageUrl, metadata }` | 400, 502 | supported | yes | ready |
| Satellite | POST | `/api/satellite/statistics` | `{ bbox, dateRange, evalscript, aggregation? }` | `{ statistics, bands[] }` | 400, 502 | supported | yes | ready |
| Satellite | POST | `/api/satellite/time-series` | `{ bbox, dateRange, interval, evalscript }` | `{ series[], timestamps[] }` | 400, 502 | supported | yes | ready |
| Satellite | POST | `/api/satellite/trend` | `{ bbox, dateRange, index }` | `{ trend, slope, correlation, series[] }` | 400, 502 | supported | yes | ready |
| Satellite | POST | `/api/satellite/surface-analysis` | `{ bbox, dateRange, analysisTypes[] }` | `{ ndvi, moisture, classification, composite }` | 400, 502 | supported | yes | ready |

## Environment

| Module | Method | Path | Input | Output | Error Codes | Idempotency | Frontend Usage | Status |
|--------|--------|------|-------|--------|-------------|-------------|----------------|--------|
| Environment | POST | `/api/environment/profile` | `{ lat, lon, dateRange? }` | `{ climate, soil, combined }` | 400, 502 | supported | yes | ready |
| Environment | POST | `/api/environment/climate/profile` | `{ lat, lon, dateRange? }` | `{ temperature, precipitation, humidity, wind, solar }` | 400, 502 | supported | yes | ready |
| Environment | POST | `/api/environment/soil/profile` | `{ lat, lon, depth? }` | `{ texture, ph, organicCarbon, nutrients, classification }` | 400, 502 | supported | yes | ready |

## Terrain

| Module | Method | Path | Input | Output | Error Codes | Idempotency | Frontend Usage | Status |
|--------|--------|------|-------|--------|-------------|-------------|----------------|--------|
| Terrain | POST | `/api/terrain/profile` | `{ lat, lon }` or `{ bbox }` | `{ elevation, slope, aspect, roughness }` | 400, 502 | supported | yes | ready |

## Field Survey

| Module | Method | Path | Input | Output | Error Codes | Idempotency | Frontend Usage | Status |
|--------|--------|------|-------|--------|-------------|-------------|----------------|--------|
| Field Survey | POST | `/api/field-surveys` | `{ parcelId, surveyDate, observations }` | `{ id, status, createdAt }` | 400, 409 | supported | yes | ready |
| Field Survey | GET | `/api/field-surveys` | query: `page, limit, status?, parcelId?` | `{ items[], total, page, limit }` | 400 | N/A | yes | ready |
| Field Survey | GET | `/api/field-surveys/:id` | param: `id` | `{ id, parcelId, status, samples[], observations }` | 404 | N/A | yes | ready |
| Field Survey | PATCH | `/api/field-surveys/:id` | `{ observations?, surveyDate? }` | `{ id, updated fields }` | 400, 404, 409 | supported | yes | ready |
| Field Survey | POST | `/api/field-surveys/:id/samples` | `{ sampleType, location, measurements }` | `{ sampleId, createdAt }` | 400, 404, 409 | supported | yes | ready |
| Field Survey | POST | `/api/field-surveys/:id/submit` | — | `{ id, status: "submitted" }` | 404, 409 | supported | yes | ready |
| Field Survey | POST | `/api/field-surveys/:id/start-review` | — | `{ id, status: "in_review" }` | 404, 409 | supported | admin | ready |
| Field Survey | POST | `/api/field-surveys/:id/approve` | `{ comments? }` | `{ id, status: "approved" }` | 404, 409 | supported | admin | ready |
| Field Survey | POST | `/api/field-surveys/:id/reject` | `{ reason }` | `{ id, status: "rejected" }` | 400, 404, 409 | supported | admin | ready |
| Field Survey | POST | `/api/field-surveys/:id/return-to-draft` | `{ reason? }` | `{ id, status: "draft" }` | 404, 409 | supported | admin | ready |
| Field Survey | POST | `/api/field-surveys/:id/create-revision` | `{ changes? }` | `{ id, revisionNumber, status: "draft" }` | 404, 409 | supported | yes | ready |

## Land Usability

| Module | Method | Path | Input | Output | Error Codes | Idempotency | Frontend Usage | Status |
|--------|--------|------|-------|--------|-------------|-------------|----------------|--------|
| Land Usability | POST | `/api/land-usability/analyze` | `{ parcelId }` or `{ geometry, environment, terrain }` | `{ score, classification, factors[], limitations[] }` | 400, 502 | supported | yes | ready |

## Crop Recommendations

| Module | Method | Path | Input | Output | Error Codes | Idempotency | Frontend Usage | Status |
|--------|--------|------|-------|--------|-------------|-------------|----------------|--------|
| Crop Recommendations | POST | `/api/crop-recommendations/evaluate` | `{ parcelId, environment, terrain, preferences? }` | `{ recommendations[], topCrops[] }` | 400, 502 | supported | yes | ready |
| Crop Recommendations | POST | `/api/crop-recommendations/compare-scenarios` | `{ parcelId, scenarios[] }` | `{ comparisons[], bestScenario }` | 400, 502 | supported | yes | ready |
| Crop Recommendations | POST | `/api/crop-recommendations/validation-report` | `{ parcelId, cropId, season? }` | `{ report, validations[], confidence }` | 400, 404, 502 | supported | yes | ready |
| Crop Recommendations | GET | `/api/crops` | query: `page?, limit?, category?` | `{ items[], total }` | 400 | N/A | yes | ready |
| Crop Recommendations | GET | `/api/crops/:id` | param: `id` | `{ id, name, requirements, seasons }` | 404 | N/A | yes | ready |

## Crop Physical Compatibility

| Module | Method | Path | Input | Output | Error Codes | Idempotency | Frontend Usage | Status |
|--------|--------|------|-------|--------|-------------|-------------|----------------|--------|
| Crop Physical Compatibility | POST | `/api/crop-physical-compatibility/analyze` | `{ parcelId, cropId, terrain, soil }` | `{ compatible, score, factors[], warnings[] }` | 400, 404, 502 | supported | yes | ready |

## Calibration Management

| Module | Method | Path | Input | Output | Error Codes | Idempotency | Frontend Usage | Status |
|--------|--------|------|-------|--------|-------------|-------------|----------------|--------|
| Calibration Management | POST | `/api/calibration-management/bootstrap` | `{ source?, overwrite? }` | `{ created, skipped, errors[] }` | 400, 409 | supported | admin | ready |
| Calibration Management | POST | `/api/calibration-management/crop-requirements` | `{ cropId, parameters, ranges }` | `{ id, status: "draft", createdAt }` | 400, 409 | supported | admin | ready |
| Calibration Management | GET | `/api/calibration-management/crop-requirements` | query: `page?, limit?, status?, cropId?` | `{ items[], total, page, limit }` | 400 | N/A | admin | ready |
| Calibration Management | GET | `/api/calibration-management/crop-requirements/:id` | param: `id` | `{ id, cropId, parameters, status, version }` | 404 | N/A | admin | ready |
| Calibration Management | PATCH | `/api/calibration-management/crop-requirements/:id` | `{ parameters?, ranges? }` | `{ id, updated fields }` | 400, 404, 409 | supported | admin | ready |
| Calibration Management | POST | `/api/calibration-management/crop-requirements/:id/submit` | — | `{ id, status: "submitted" }` | 404, 409 | supported | admin | ready |
| Calibration Management | POST | `/api/calibration-management/crop-requirements/:id/start-review` | — | `{ id, status: "in_review" }` | 404, 409 | supported | admin | ready |
| Calibration Management | POST | `/api/calibration-management/crop-requirements/:id/reviews` | `{ decision, comments }` | `{ reviewId, createdAt }` | 400, 404, 409 | supported | admin | ready |
| Calibration Management | POST | `/api/calibration-management/crop-requirements/:id/approve` | `{ comments? }` | `{ id, status: "approved" }` | 404, 409 | supported | admin | ready |
| Calibration Management | POST | `/api/calibration-management/crop-requirements/:id/publish` | — | `{ id, status: "published", version }` | 404, 409 | supported | admin | ready |
| Calibration Management | POST | `/api/calibration-management/crop-requirements/:id/impact-analysis` | `{ changes? }` | `{ affectedCrops[], affectedParcels[], riskLevel }` | 404, 502 | supported | admin | ready |
| Calibration Management | POST | `/api/calibration-management/crop-requirements/:id/create-revision` | `{ changes? }` | `{ id, revisionNumber, status: "draft" }` | 404, 409 | supported | admin | ready |
| Calibration Management | POST | `/api/calibration-management/crop-requirements/:id/rollback` | `{ targetVersion }` | `{ id, restoredVersion, status }` | 400, 404, 409 | supported | admin | ready |
