# Soil Laboratory Core (Phase 2.2A)

## Amaç

Laboratuvardan gelen toprak analizlerini **standart veri modelinde** saklamak.

Bu faz **yalnızca altyapı**dır. Aşağıdakiler **yoktur**:

- suitability score
- ürün önerisi
- AI prediction
- gübre / sulama önerisi
- pH / EC / OM / tekstür parametre kataloğu

## Aggregate

**SoilAnalysis** (aggregate root — read model)

```
SoilAnalysis
  └── SoilSample
        └── SoilAnalysisResult[]   (parametre satırları; katalog sonra)
Laboratory                  (katalog)
AnalysisMethod              (katalog)
```

## Entity’ler

### Laboratory
Name, Country, City, AccreditationNumber, AccreditationStandard, Contact, Website, IsActive (+ versioning)

### AnalysisMethod
Code, Name, Description, Standard, Organization, Version (`methodVersion`), IsActive

### SoilSample
ParcelId, SampleCode, LaboratoryId, SamplingDate, AnalysisDate, DepthFrom/To, Lat/Lon/Elevation, SamplerName, SampleMethod, WeatherCondition, Notes

### SoilAnalysisResult
SampleId, ParameterCode, ParameterName, MeasuredValue, Unit, AnalysisMethod(+Id), DetectionLimit, MeasurementUncertainty, QualityFlag, IsAccredited, Source, VerificationStatus

`ParameterCode` bu fazda serbest metindir — standart parametre seed’i yok.

## QualityFlag

`Unknown | Accepted | Suspect | Rejected | BelowDetectionLimit | AboveRange`

## API

Base: `/api/physical-suitability`

| Resource | Paths |
|----------|--------|
| Laboratories | `/laboratories` CRUD |
| Analysis methods | `/analysis-methods` CRUD |
| Samples | `/soil-samples`, `/soil-samples/parcel/:parcelId`, validate |
| Aggregate | `GET /soil-analyses/:sampleId` |
| Results | `/soil-samples/:sampleId/results`, `/soil-analysis-results/:resultId` |

## Migration

`026_soil_laboratory_core.sql`

## Seed

Boş — laboratuvar / yöntem / örnek / parametre satırı üretilmez.

## Testler

- `tests/soil-laboratory.phase2.test.ts`
- `tests/soil-laboratory.integration.test.ts`

## OpenAPI

[openapi-soil-laboratory-core.yaml](./openapi-soil-laboratory-core.yaml)
