# Water Parameter Catalog (Phase 2.2G)

## Purpose

Canonical irrigation-water parameter definitions with units. No scientific classification ranges or suitability thresholds are seeded.

## Seeded parameters (24)

| Code | Category | Canonical unit | Measured / Calculated |
|------|----------|----------------|------------------------|
| WATER_PH | GENERAL | PH_UNIT | Measured |
| WATER_EC | SALINITY | DS_PER_M | Measured |
| TDS | SALINITY | MG_PER_L | Measured |
| SODIUM | MAJOR_CATION | MEQ_PER_L | Measured |
| CALCIUM | MAJOR_CATION | MEQ_PER_L | Measured |
| MAGNESIUM | MAJOR_CATION | MEQ_PER_L | Measured |
| POTASSIUM | MAJOR_CATION | MEQ_PER_L | Measured |
| BICARBONATE | MAJOR_ANION | MEQ_PER_L | Measured |
| CARBONATE | MAJOR_ANION | MEQ_PER_L | Measured |
| CHLORIDE | MAJOR_ANION | MEQ_PER_L | Measured |
| SULFATE | MAJOR_ANION | MEQ_PER_L | Measured |
| BORON | TOXICITY | MG_PER_L | Measured |
| NITRATE | NUTRIENT | MG_PER_L | Measured |
| AMMONIUM | NUTRIENT | MG_PER_L | Measured |
| FLUORIDE | TOXICITY | MG_PER_L | Measured |
| IRON | TOXICITY | MG_PER_L | Measured |
| MANGANESE | TOXICITY | MG_PER_L | Measured |
| TURBIDITY | PHYSICAL | NTU | Measured |
| WATER_TEMPERATURE | PHYSICAL | DEG_C | Measured |
| SAR | DERIVED | NONE | Calculated |
| ADJUSTED_SAR | DERIVED | NONE | Calculated |
| RSC | DERIVED | MEQ_PER_L | Calculated |
| TOTAL_HARDNESS | DERIVED | MG_PER_L_CACO3 | Calculated |
| SODIUM_PERCENTAGE | DERIVED | PERCENT | Calculated |

`verificationStatus` defaults to **Draft**. Descriptions/ranges left null when unknown.

## Canonical units seeded

`NONE`, `PH_UNIT`, `DS_PER_M`, `MS_PER_CM` (→ DS_PER_M), `PERCENT`, `MG_PER_L`, `MEQ_PER_L`, `MG_PER_L_CACO3`, `NTU`, `DEG_C`.

**Note:** mg/L ↔ meq/L is not auto-converted by the unit engine (ion-specific). Ionic calculations convert per parameter in the derived-indicator service.

## API

- `GET/POST /api/water-parameters`
- `GET /api/water-parameters/code/{code}`
- `PUT /api/water-parameters/{id}`
