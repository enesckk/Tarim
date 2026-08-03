# Climate Source Comparison (Phase 2.3A)

Compare two climate data sources for the same parcel, parameter, and period. Descriptive statistics only.

## Purpose

Surface overlap and difference metrics between a primary and secondary `ClimateDataSource` so analysts can review consistency. Does not classify “good” or “bad for crop X”.

## Inputs

- `parcelId`, `parameterCode`, `periodStart` / `periodEnd`
- `primarySourceId`, `secondarySourceId` (must differ)
- Daily series built from observations; **normalized-only**, **null ≠ 0**

## Outputs (`ClimateSourceComparison`)

- Record counts per source
- `meanAbsoluteDifference`, `percentageDifference`, `correlationValue` when overlapping known days exist
- `comparisonStatus`

## Status policy

| Status | Phase 2.3A assignment |
|---|---|
| `INSUFFICIENT_DATA` | No overlapping known values |
| `REQUIRES_REVIEW` | Overlap exists; raw stats computed, classification deferred |
| `CONSISTENT` / `MINOR_DIFFERENCE` / `MAJOR_DIFFERENCE` | Schema-reserved only — **never auto-assigned** (no agreement thresholds invented) |

## API

- `POST /agroclimate/source-comparisons`
- `GET /parcels/:parcelId/climate-source-comparisons`

## Out of scope

Suitability scoring, AI reconciliation of sources, automatic preference of one source over another, inventing consistency cutoffs.
