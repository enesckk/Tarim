# Crop Risk Profile (Phase 2.1G)

## Amaç

Ürün risk profilini yöneten **veri modeli**. Suitability hesaplamaz; skor / sıralama üretmez.  
Seed’de `RiskLevel` ve `Sensitivity` = `Unknown`, `MitigationSuggestion` = `null`.

## Aggregate

`CropKnowledge` → `CropRiskProfile` (`ck_risk_profile`) → `CropRisk` (`ck_crop_risk`)

## RiskType

```
FROST, DROUGHT, HEAT, EXCESS_RAIN, FLOOD, SALINITY,
SODICITY, EROSION, DISEASE, PEST, WIND, HAIL
```

## Alanlar

CropId, RiskType, RiskLevel, Sensitivity, Description, MitigationSuggestion  
(+ Source, VerificationStatus, Version, timestamps, IsActive)

### RiskLevel

`Unknown | Low | Moderate | High | Critical`

### Sensitivity

`Unknown | Low | Moderate | High`

## API

Base: `/api/physical-suitability`

| Method | Path |
|--------|------|
| GET | `/crop-knowledge/:id/risk-profile` |
| GET | `/risk-profile/code/:cropCode` |
| GET | `/crop-knowledge/:id/risk-profile/risks` |
| GET | `/crop-knowledge/:id/risk-profile/risks/:riskType` |
| GET | `/crop-knowledge/:id/risk-profile/:riskId` |
| POST | `/crop-knowledge/:id/risk-profile/risks` |
| PUT | `/crop-knowledge/:id/risk-profile/:riskId` |
| DELETE | `/crop-knowledge/:id/risk-profile/:riskId` |
| POST | `/crop-knowledge/:id/risk-profile/validate` |

## Migration

`023_crop_risk_profile.sql`

## Seed

10 pilot × 12 Draft risk-type shell.

## Testler

- `tests/crop-risk-profile.phase2.test.ts`
- `tests/crop-risk-profile.integration.test.ts`

## OpenAPI

[openapi-crop-risk-profile.yaml](./openapi-crop-risk-profile.yaml)
