# Soil Parameter Definitions (Phase 2.2C)

## Amaç

Fiziksel uygunluk ve laboratuvar veri girişinde kullanılan toprak parametrelerini **merkezi katalog** ile tanımlamak: kod, veri tipi, birim, kapsam.

Bu fazda **yoktur**:

- bilimsel yorum aralıkları
- ürün eşikleri
- uygunluk puanı
- gübre / sulama / AI önerisi

## Entity: SoilParameter

| Alan | Not |
|------|-----|
| Code | UNIQUE, immutable |
| CanonicalName / TR / EN display | |
| Category / SubCategory | Chemical, Physical, Hydrological, FieldObservation, Nutrient |
| CanonicalUnitId | MeasurementUnit FK |
| DataType / ValueType / MeasurementScope | enums |
| IsRequiredForPhysicalSuitability | Nutrients = **false** |
| VerificationStatus | Seed = `Draft` |

## ValueType

`NUMERIC | TEXT | BOOLEAN | ENUM | PERCENTAGE | RATIO | CLASSIFICATION`

## MeasurementScope

`SAMPLE | DEPTH_INTERVAL | PARCEL | ZONE | PROFILE | LABORATORY_REPORT`

## Seed groups

- **A Chemical:** SOIL_PH, SOIL_EC, ORGANIC_MATTER, ORGANIC_CARBON, TOTAL_LIME, ACTIVE_LIME, CEC, ESP, SAR_SOIL, TOTAL_SALT
- **B Physical:** SAND, SILT, CLAY, SOIL_TEXTURE_CLASS, BULK_DENSITY, PARTICLE_DENSITY, TOTAL_POROSITY, COARSE_FRAGMENT_CONTENT, GRAVEL_CONTENT, STONE_CONTENT, SOIL_DEPTH, EFFECTIVE_ROOTING_DEPTH
- **C Hydrological:** FIELD_CAPACITY, PERMANENT_WILTING_POINT, AVAILABLE_WATER_CAPACITY, SATURATION_PERCENTAGE, SOIL_MOISTURE, INFILTRATION_RATE, HYDRAULIC_CONDUCTIVITY
- **D Field observation:** DRAINAGE_CLASS, COMPACTION_CLASS, HARDPAN_PRESENCE, PONDING_RISK, SURFACE_CRUSTING, ROCK_OUTCROP, EROSION_CLASS, SALINITY_CRUST, WATER_TABLE_DEPTH
- **E Nutrients:** TOTAL_NITROGEN … BORON (`IsRequiredForPhysicalSuitability=false`)

## SoilParameterOption

Altyapı mevcut (`sl_soil_parameter_option`). Enum sınıf kodları (tekstür, drenaj, …) **bilinçli olarak seed edilmedi**.

## API

Base: `/api`

| Method | Path |
|--------|------|
| GET/POST | `/soil-parameters` |
| GET | `/soil-parameters/{id}` |
| GET | `/soil-parameters/code/{code}` |
| PUT/DELETE | `/soil-parameters/{id}` |

## Migration

`027_soil_parameter_catalog.sql`

## Related

- [soil-unit-normalization.md](./soil-unit-normalization.md)
- [soil-parameter-aliases.md](./soil-parameter-aliases.md)
