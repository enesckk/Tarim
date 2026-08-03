# Irrigation Water Laboratory (Phase 2.2G)

Professional management of irrigation water sources, samples, laboratory results, and calculated quality indicators within Physical Suitability.

## Scope

**In scope**

- Aggregate root `IrrigationWaterAnalysis`
- Water sources, samples, parameter catalog, analysis results, derived indicators, chain of custody
- Unit normalization (raw values preserved)
- Centralized formula service with versioned indicators

**Out of scope (this phase)**

- Crop suitability scores
- Crop recommendations
- Irrigation scheduling
- AI predictions / automatic decisions
- QR / barcode generation
- Map UI

## Aggregate

```
IrrigationWaterAnalysis
  └── WaterSource
        └── WaterSample[]
              ├── WaterAnalysisResult[]   (laboratory-reported)
              ├── WaterDerivedIndicator[] (engine-calculated; separate store)
              └── WaterSampleChainOfCustody[]
```

Separate catalog aggregate: `WaterParameterCatalog` (parameters + measurement units).

## Entities & tables (`iw_*`)

| Entity | Table |
|--------|-------|
| WaterSource | `iw_water_source` |
| WaterSample | `iw_water_sample` |
| WaterParameter | `iw_water_parameter` |
| MeasurementUnit | `iw_measurement_unit` |
| WaterAnalysisResult | `iw_water_analysis_result` |
| WaterDerivedIndicator | `iw_water_derived_indicator` |
| WaterSampleChainOfCustody | `iw_water_sample_chain_of_custody` |

Shared `Laboratory` / `AnalysisMethod` (Phase 2.2A) are referenced as opaque UUIDs.

## Validation highlights

- Unique `SampleCode`
- GPS range checks; lat/lon both set or both null
- Non-negative discharge and well depth; **null ≠ 0**
- Numeric parameters reject non-numeric text
- Calculated catalog params must not be marked directly measured
- Failed unit conversion does not erase raw/measured data
- Duplicate result: same sample + parameter + analysis method
- Custody records must be chronological
- Lab results and derived indicators are never mixed in one table

## API (mounted under `/api`)

See OpenAPI: `openapi-irrigation-water-laboratory.yaml`.

## Migration

`031_irrigation_water_laboratory.sql`

## Related docs

- [water-parameter-catalog.md](./water-parameter-catalog.md)
- [water-derived-indicators.md](./water-derived-indicators.md)
- [water-source-management.md](./water-source-management.md)
