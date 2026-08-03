# Soil Sampling Management (Phase 2.2F)

## Amaç

Toprak numunesinin **saha yaşam döngüsünü** yönetmek (kampanya → nokta → numune → gözlem → zincir).

Laboratuvar analizinden (**2.2A SoilSample**) **bağımsızdır**.

Bu fazda **yoktur**:

- ürün uygunluğu / suitability score
- AI / OCR
- harita entegrasyonu
- QR / barkod üretimi
- mobil uygulama

## Aggregate Root

**SoilSampling**

```
SamplingCampaign
  └── SamplingPoint[]
        ├── SoilSample[]          (field; tip: SamplingSoilSample / SoilSample alias)
        │     └── ChainOfCustody[]
        └── SamplingObservation[]
```

> Laboratuvar `SoilSample` (2.2A) ile çakışmayı önlemek için runtime tip adı `SamplingSoilSample`;
> spec adı `SoilSample` olarak alias export edilir (`soil-sampling/dto`).

## Entity alan checklist

### SamplingCampaign
`Id, CampaignCode, CampaignName, Purpose, Description, Organization, ResponsiblePerson, StartDate, EndDate, Status, CreatedAt, UpdatedAt, Version`

Status: `PLANNED | ONGOING | COMPLETED | CANCELLED`

### SamplingPoint
`Id, CampaignId, ParcelId, PointCode, Latitude, Longitude, Elevation, Geometry, SamplingDepthFrom, SamplingDepthTo, SamplingArea, SamplingMethod, Slope, Aspect, LandUse, CropAtSampling, Notes, CreatedAt, UpdatedAt, Version`

### SoilSample (field)
`Id, SamplingPointId, SampleCode, SampleType, CollectionDate, CollectedBy, TransportDate, ReceivedDate, StorageCondition, ContainerType, CurrentStatus, Barcode, QRCode, SealNumber, Notes, CreatedAt, UpdatedAt, Version`

SampleType: `COMPOSITE | SINGLE_POINT | DISTURBED | UNDISTURBED`  
Status: `COLLECTED | IN_TRANSPORT | RECEIVED | IN_ANALYSIS | ANALYZED | ARCHIVED | DISCARDED`

### SamplingObservation
`Id, SamplingPointId, ObservationType, ObservationValue, PhotoPath, Notes, CreatedAt`

ObservationType: `STONE | ROCK | EROSION | COMPACTION | SURFACE_CRUST | DRAINAGE | ROOTING_DEPTH | MOISTURE | WATERLOGGING | SALINITY`

### ChainOfCustody
`Id, SampleId, Action, PerformedBy, PerformedDate, Location, Notes` (+ CreatedAt/UpdatedAt/Version)

Action: `COLLECTED | PACKAGED | TRANSPORTED | RECEIVED | OPENED | ANALYZED | ARCHIVED | DESTROYED`

## Validation

- SampleCode benzersiz
- Numune iki kampanyaya bağlanamaz
- GPS (Latitude/Longitude) zorunlu
- Derinlik negatif olamaz; From ≤ To
- Custody kayıtları kronolojik

## API

Base: `/api`

| Resource | Paths |
|----------|--------|
| Campaigns | `GET/POST /sampling-campaigns`, `GET/PUT/DELETE /sampling-campaigns/{id}` |
| Points | `GET/POST /sampling-points`, `GET/PUT/DELETE /sampling-points/{id}` |
| Samples | `GET/POST /sampling-samples`, `GET/PUT/DELETE /sampling-samples/{id}` |
| Observations | `GET/POST /sampling-observations`, `GET/PUT/DELETE /sampling-observations/{id}` |
| Custody | `GET/POST /sampling-chain-of-custody`, `GET/PUT/DELETE /sampling-chain-of-custody/{id}` |
| | `GET /sampling-samples/{id}/chain-of-custody` |

## Artifacts

| Artifact | Path |
|----------|------|
| Types | `soil-sampling/types/soil-sampling.types.ts` |
| DTO | `soil-sampling/dto/soil-sampling.dto.ts` |
| Validation | `soil-sampling/services/soil-sampling-validation.service.ts` |
| Service | `soil-sampling/services/soil-sampling.service.ts` |
| Repository | `soil-sampling/repositories/soil-sampling.repository.ts` |
| Migration | `030_soil_sampling_management.sql` |
| OpenAPI | [openapi-soil-sampling-management.yaml](./openapi-soil-sampling-management.yaml) |
| Tests | `tests/soil-sampling.phase2.test.ts`, `tests/soil-sampling.integration.test.ts`, completeness suite |

## Seed

Boş.
