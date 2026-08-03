# Crop Climate Requirements (Phase 2.1C)

## Amaç

Her ürünün iklim gereksinimlerini bilimsel olarak tanımlayan **veri modeli**.

Bu faz:

- Suitability hesaplamaz
- Gerçek sayısal eşikleri doldurmaz (alanlar yapısal; değerler `null`)

## Aggregate

`CropKnowledge` → `CropClimateRequirements` (`ck_climate_requirements`) →:

| Entity | Tablo |
|--------|--------|
| `ClimateRequirement` | `ck_climate_requirement` |

`CropId` = Crop Knowledge root id.

## ClimateFactor enum

```
AIR_TEMPERATURE, SOIL_TEMPERATURE, GDD, FROST, FROST_FREE_PERIOD,
EXTREME_HEAT, HEAT_WAVE, RAINFALL, RAINFALL_DISTRIBUTION, HUMIDITY,
SOLAR_RADIATION, SUNSHINE_DURATION, DAY_LENGTH, WIND,
EVAPOTRANSPIRATION, CLIMATIC_WATER_DEFICIT
```

## ClimateRequirement alanları

Id, CropId, ClimateFactor,  
MinimumValue, OptimalMinimum, OptimalMaximum, MaximumValue, PreferredValue,  
ToleranceLevel (`Unknown|Narrow|Moderate|Wide`),  
ImportanceLevel (`Required|Important|Supporting|Optional`),  
Unit, ScientificExplanation, Notes,  
Source (`sourceReferenceId`), VerificationStatus, CreatedAt, UpdatedAt, Version, IsActive

## Validation

- ClimateFactor ürün içinde benzersiz
- Unit zorunlu
- Aralık tutarlılığı (değerler set edildiğinde): min ≤ optMin ≤ optMax ≤ max; preferred aralıkta
- `Approved` erken onay engeli
- Seed için eşiklerin null olması warning (`THRESHOLDS_UNSET`)

## API

Base: `/api/physical-suitability`

| Method | Path |
|--------|------|
| GET | `/crop-knowledge/:id/climate-requirements` |
| GET | `/climate-requirements/code/:cropCode` |
| GET | `/crop-knowledge/:id/climate-requirements/factors` |
| GET | `/crop-knowledge/:id/climate-requirements/factors/:climateFactor` |
| GET | `/crop-knowledge/:id/climate-requirements/:requirementId` |
| POST | `/crop-knowledge/:id/climate-requirements` |
| PUT | `/crop-knowledge/:id/climate-requirements/:requirementId` |
| DELETE | `/crop-knowledge/:id/climate-requirements/:requirementId` |
| POST | `/crop-knowledge/:id/climate-requirements/validate` |

OpenAPI: [openapi-crop-climate-requirements.yaml](./openapi-crop-climate-requirements.yaml)

## Seed

10 pilot ürün × 16 Draft factor shell (eşikler `null`).

## Migration

`019_crop_climate_requirements.sql`

## Testler

- Unit: `tests/climate-requirements.phase2.test.ts`
- Integration: `tests/climate-requirements.integration.test.ts`
