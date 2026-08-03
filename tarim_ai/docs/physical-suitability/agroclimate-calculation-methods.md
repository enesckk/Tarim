# AgroClimate Calculation Methods (Phase 2.3A)

How indicator values are produced. No suitability interpretation.

## Inputs

- Daily climate series from `ClimateObservation` for the analysis period and primary source.
- Only **normalized** values enter calculation (`normalizedValue`). Raw-only rows are ignored.
- **null ≠ 0** — a missing day stays missing; it is not treated as zero precipitation or zero temperature.
- Per-indicator `AgroClimateCalculationConfig` supplies thresholds (frost, heat, rainy/dry day, GDD base, etc.). Unset thresholds remain null.

## Engines

| Engine | Indicators (examples) |
|---|---|
| Frost | frost day counts, last/first frost dates, frost-free period, event length |
| Heatwave | extreme heat days, heatwave events, high night temperature |
| GDD / growing season | GDD, base temperature, season start/end/length, active growing days |
| Precipitation | totals, rainy/heavy-rain days, variability, concentration |
| Drought | consecutive dry days, dry spells, precipitation deficit; meteorological drought index stays unresolved |
| ET0 / water balance | reference/potential ET, climatic deficit/surplus, P/ET0 ratio; FAO Penman–Monteith not invented |

Unresolved scientific methods report `INSUFFICIENT_DATA` / `REQUIRES_REVIEW` / `FAILED` — never guessed values.

## Config-driven thresholds

If a required threshold is null (e.g. frost threshold, GDD base temperature), the affected indicator returns **`INSUFFICIENT_DATA`** with a calculation message. Configs are region-scoped; `cropId` may be null for region-wide defaults.

## Results

Each calculation writes an `AgroClimateIndicatorResult` with `calculationStatus`, coverage counts, confidence from coverage (not a suitability score), formula code/version, and `inputSummaryJson`. Recalculation always creates a **new version** of the result for that `(analysisRunId, indicatorId)`.

## Out of scope

Suitability scoring, crop ranking, AI inference, irrigation advice, inventing agreement thresholds between sources.
