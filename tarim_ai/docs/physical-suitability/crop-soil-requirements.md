# Crop Soil Requirements (Phase 2.1D)

## Amaç

Ürün toprak gereksinimlerini yöneten **veri modeli**.

Bu faz:

- Suitability hesaplamaz
- Laboratuvar verileri ile ilişki kurmaz
- Gerçek sayısal eşikleri doldurmaz (değerler `null`)

## Aggregate

`CropKnowledge` → `CropSoilRequirements` (`ck_soil_requirements`) →:

| Entity | Tablo |
|--------|--------|
| `SoilRequirement` | `ck_soil_requirement` |

`CropId` = Crop Knowledge root id.

## SoilFactor enum

```
TEXTURE, PH, EC, ORGANIC_MATTER, LIME, CEC, BULK_DENSITY,
ROOTING_DEPTH, DRAINAGE, STONE_CONTENT, SALINITY, SODICITY,
SOIL_DEPTH, SOIL_MOISTURE, FIELD_CAPACITY, PERMANENT_WILTING_POINT
```

## SoilRequirement alanları

CropId, SoilFactor,  
Minimum, OptimalMinimum, OptimalMaximum, Maximum, Preferred,  
ImportanceLevel, ToleranceLevel, Unit, Description,  
Source (`sourceReferenceId`), VerificationStatus, CreatedAt, UpdatedAt, Version  
(+ `id`, `isActive` for soft-delete / identity)

## Validation

- SoilFactor ürün içinde benzersiz
- Unit zorunlu
- Aralık tutarlılığı (değer set edildiğinde)
- `Approved` erken onay engeli
- Seed için eşiklerin null olması warning (`THRESHOLDS_UNSET`)

## API

Base: `/api/physical-suitability`

| Method | Path |
|--------|------|
| GET | `/crop-knowledge/:id/soil-requirements` |
| GET | `/soil-requirements/code/:cropCode` |
| GET | `/crop-knowledge/:id/soil-requirements/factors` |
| GET | `/crop-knowledge/:id/soil-requirements/factors/:soilFactor` |
| GET | `/crop-knowledge/:id/soil-requirements/:requirementId` |
| POST | `/crop-knowledge/:id/soil-requirements` |
| PUT | `/crop-knowledge/:id/soil-requirements/:requirementId` |
| DELETE | `/crop-knowledge/:id/soil-requirements/:requirementId` |
| POST | `/crop-knowledge/:id/soil-requirements/validate` |

OpenAPI: [openapi-crop-soil-requirements.yaml](./openapi-crop-soil-requirements.yaml)

## Seed

10 pilot × 16 Draft factor shell.

## Migration

`020_crop_soil_requirements.sql`

## Testler

- Unit: `tests/soil-requirements.phase2.test.ts`
- Integration: `tests/soil-requirements.integration.test.ts`
