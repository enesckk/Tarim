# Crop Water Requirements (Phase 2.1E)

## Amaç

Ürün su gereksinimlerini yöneten **veri modeli**. Suitability hesaplamaz; eşikler seed’de `null`.

## Aggregate

`CropKnowledge` → `CropWaterRequirements` (`ck_water_requirements`) → `WaterRequirement` (`ck_water_requirement`)

## WaterFactor

```
TOTAL_WATER_REQUIREMENT, IRRIGATION_REQUIREMENT, IRRIGATION_INTERVAL,
CRITICAL_IRRIGATION_STAGE, WATER_STRESS_TOLERANCE, DROUGHT_TOLERANCE,
SALINE_WATER_TOLERANCE, BORON_TOLERANCE, SAR_TOLERANCE
```

## Alanlar

CropId, WaterFactor, Minimum, OptimalMinimum, OptimalMaximum, Maximum, Preferred,  
Unit, ToleranceLevel, ImportanceLevel, Description  
(+ Source, VerificationStatus, Version, timestamps, IsActive)

## API

Base: `/api/physical-suitability`

| Method | Path |
|--------|------|
| GET | `/crop-knowledge/:id/water-requirements` |
| GET | `/water-requirements/code/:cropCode` |
| GET | `/crop-knowledge/:id/water-requirements/factors` |
| GET | `/crop-knowledge/:id/water-requirements/factors/:waterFactor` |
| GET | `/crop-knowledge/:id/water-requirements/:requirementId` |
| POST | `/crop-knowledge/:id/water-requirements` |
| PUT | `/crop-knowledge/:id/water-requirements/:requirementId` |
| DELETE | `/crop-knowledge/:id/water-requirements/:requirementId` |
| POST | `/crop-knowledge/:id/water-requirements/validate` |

## Migration

`021_crop_water_requirements.sql`

## Seed

10 pilot × 9 Draft factor shell.

## Testler

- `tests/water-requirements.phase2.test.ts`
- `tests/water-requirements.integration.test.ts`
