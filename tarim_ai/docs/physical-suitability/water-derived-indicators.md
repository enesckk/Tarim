# Water Derived Indicators (Phase 2.2G)

Engine-calculated indicators stored in `WaterDerivedIndicator`, separate from laboratory-reported `WaterAnalysisResult` rows (even when the lab also reports SAR/RSC).

## Indicators & formula versions

| Code | Formula version | Formula (inputs in meq/L unless noted) |
|------|-----------------|----------------------------------------|
| SAR | `SAR_v1_meqL` | `Na / sqrt((Ca+Mg)/2)` |
| RSC | `RSC_v1_meqL` | `(CO3+HCO3)-(Ca+Mg)`; missing CO3 treated as 0 only when HCO3 present |
| TOTAL_HARDNESS | `TOTAL_HARDNESS_v1_caco3` | `(Ca+Mg)*50` as mg/L CaCO₃ |
| SODIUM_PERCENTAGE | `SODIUM_PERCENTAGE_v1` | `100*Na/(Na+Ca+Mg+K)`; K optional (null→0 only if Na/Ca/Mg present) |
| ION_BALANCE_ERROR | `ION_BALANCE_ERROR_v1` | `100*\|Σcat−Σan\|/(Σcat+Σan)` |
| ADJUSTED_SAR | `ADJUSTED_SAR_v1_deferred_cax` | **Not computed** — Caₓ lookup table intentionally not seeded |

## Rules

- Central service: `water-derived-indicator.calculation.ts`
- Persist `formulaVersion` + `inputParametersJson` for auditability
- Missing inputs → `INSUFFICIENT_DATA` (never invent zeros for required ions)
- No irrigation water quality class thresholds (e.g. “SAR &lt; 10 = excellent”)

## API

- `POST /api/water-samples/{sampleId}/calculate-indicators`
- `GET /api/water-samples/{sampleId}/derived-indicators`
