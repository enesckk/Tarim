# Crop Terrain Requirements (Phase 2.1F)

## Amaç

Ürün arazi / topografya gereksinimlerini yöneten **veri modeli**. Suitability hesaplamaz; eşikler seed’de `null`.

## Aggregate

`CropKnowledge` → `CropTerrainRequirements` (`ck_terrain_requirements`) → `TerrainRequirement` (`ck_terrain_requirement`)

## TerrainFactor

```
ELEVATION, SLOPE, ASPECT, SOLAR_EXPOSURE, TWI, FLOW_ACCUMULATION, EROSION_RISK
```

## Alanlar

CropId, TerrainFactor, Minimum, OptimalMinimum, OptimalMaximum, Maximum, Preferred,  
Unit, Description  
(+ Source, VerificationStatus, Version, timestamps, IsActive)

## API

Base: `/api/physical-suitability`

| Method | Path |
|--------|------|
| GET | `/crop-knowledge/:id/terrain-requirements` |
| GET | `/terrain-requirements/code/:cropCode` |
| GET | `/crop-knowledge/:id/terrain-requirements/factors` |
| GET | `/crop-knowledge/:id/terrain-requirements/factors/:terrainFactor` |
| GET | `/crop-knowledge/:id/terrain-requirements/:requirementId` |
| POST | `/crop-knowledge/:id/terrain-requirements` |
| PUT | `/crop-knowledge/:id/terrain-requirements/:requirementId` |
| DELETE | `/crop-knowledge/:id/terrain-requirements/:requirementId` |
| POST | `/crop-knowledge/:id/terrain-requirements/validate` |

## Migration

`022_crop_terrain_requirements.sql`

## Seed

10 pilot × 7 Draft factor shell.

## Testler

- `tests/terrain-requirements.phase2.test.ts`
- `tests/terrain-requirements.integration.test.ts`

## OpenAPI

[openapi-crop-terrain-requirements.yaml](./openapi-crop-terrain-requirements.yaml)
