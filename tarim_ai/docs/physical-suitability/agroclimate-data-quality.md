# AgroClimate Data Quality (Phase 2.3A)

Provenance and completeness signals for climate observations and indicator results. Not suitability scores.

## Observation rules

- Store **raw** and **normalized** separately. Calculations use normalized values only.
- **null ≠ 0** — missing numeric values stay null; use `missingReason` / `qualityFlag: MISSING` when appropriate.
- Unique active observation key: `parcelId + dataSourceId + observationDate + parameterCode`.
- Quality flags: `RAW` | `ESTIMATED` | `GAP_FILLED` | `QC_FLAGGED` | `MISSING` — describe provenance, not a numeric grade.

## Analysis coverage

- `actualCoveragePercent` and per-result `dataCoveragePercent` measure known vs expected days.
- Run-level `qualityStatus`: `VALID` | `LIMITED` | `INSUFFICIENT` | `CONFLICTING_SOURCES` | `REQUIRES_REVIEW`.
- Optional `minimumCoverageRequirement` on a run: if set and coverage falls below it → `INSUFFICIENT`. Never invent a default minimum.

## Indicator outcomes

| Status | Meaning |
|---|---|
| `CALCULATED` | Value computed from available normalized inputs |
| `INSUFFICIENT_DATA` | Missing inputs or missing required thresholds |
| `INVALID_INPUT` | Inputs fail validation |
| `SOURCE_CONFLICT` | Reserved for conflicting multi-source cases |
| `REQUIRES_REVIEW` | Needs human / future config review |
| `FAILED` | Engine failure |

`confidenceLevel` (`LOW`…`VERY_HIGH`) is derived from coverage only — not crop suitability.

## Catalog

All **58** indicators seed as Draft. `minimumDataCoveragePercent` on catalog rows stays null until an expert rule exists. Results are **versioned**; recalculation does not overwrite history.

## Out of scope

Suitability scoring, AI gap-filling of climate values, inventing zeros for missing days.
