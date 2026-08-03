# AgroClimate Indicators Engine (Phase 2.3A)

Parcel-level climate indicators for Physical Suitability. Produces calculated climate metrics only.

## Scope

**In:** 58 Draft catalog indicators, climate data sources, daily observations, calculation configs, analysis runs, versioned results, source comparisons.  
**Out:** Suitability scores, crop-fit labels, AI/ML, irrigation scheduling, yield estimates, crop recommendations.

## Aggregate

```
AgroClimateAnalysis
  ├── AgroClimateAnalysisRun
  ├── AgroClimateIndicatorResult[]  (versioned per run + indicator)
  └── ClimateSourceComparison[]
```

Catalog: `AgroClimateIndicator` (58 codes). Supporting: `ClimateDataSource`, `ClimateObservation`, `AgroClimateCalculationConfig`.

## Indicator groups (58 Draft)

| Category | Count |
|---|---|
| TEMPERATURE | 5 |
| FROST | 7 |
| HEAT | 5 |
| GROWING_SEASON | 6 |
| PRECIPITATION | 7 |
| DROUGHT | 5 |
| WATER_BALANCE / EVAPOTRANSPIRATION | 6 |
| RADIATION | 4 |
| HUMIDITY | 4 |
| WIND | 4 |
| DATA_QUALITY | 5 |

All catalog rows seed as Draft (`verificationStatus: Draft`). `isRequiredForPhysicalSuitability` stays false until a criterion formally depends on an indicator.

## Core rules

- **null ≠ 0** — missing observations stay null; never invent zeros for calculation.
- **Normalized-only calc** — engines read `normalizedValue`; raw-only days are skipped.
- **Missing thresholds → `INSUFFICIENT_DATA`** — never guess frost/heat/rain/GDD thresholds.
- **Versioned results** — recalculate inserts a new result row; prior versions are kept.
- No suitability scoring or AI in this module.

## Tables (`ac_*`)

`ac_climate_data_source`, `ac_climate_observation`, `ac_agroclimate_indicator`, `ac_calculation_config`, `ac_analysis_run`, `ac_indicator_result`, `ac_source_comparison`

## Migration

`033_agroclimate_indicators.sql`

## API (soil catalog router)

`/agroclimate/indicators`, `/agroclimate/configurations`, `/agroclimate/analyses`, `/agroclimate/data-sources`, `/agroclimate/observations`, `/agroclimate/source-comparisons`, plus parcel-scoped list routes.

## Related

- [agroclimate-calculation-methods.md](./agroclimate-calculation-methods.md)
- [agroclimate-data-quality.md](./agroclimate-data-quality.md)
- [climate-source-comparison.md](./climate-source-comparison.md)
