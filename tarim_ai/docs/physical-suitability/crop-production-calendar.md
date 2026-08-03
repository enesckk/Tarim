# Crop Production Calendar (Phase 2.1H)

## Amaç

Ürün üretim takvimini **bölge kapsamlı** yöneten veri modeli. Suitability hesaplamaz.  
Phase 2.1H’de **planting/harvest verisi eklenmez** (tüm pencereler `null`).

İl (`Province`) ve ilçe (`District`) takvimleri için hiyerarşi alanları hazırdır.

## Aggregate

`CropKnowledge` → `CropProductionCalendar` (`ck_production_calendar`) → `ProductionCalendar` (`ck_production_calendar_entry`)

## Region hierarchy

| Scope | Anlam |
|-------|--------|
| `Country` | Ülke |
| `Province` | İl |
| `District` | İlçe (`parentRegionId` → Province) |
| `AgroClimatic` | Agro-iklim bölgesi (örn. TR-GA) |
| `Custom` | Özel bölge |

Alanlar: `regionId`, `regionScope`, `regionCode`, `parentRegionId`

## Entity alanları

CropId, RegionId, PlantingStart, PlantingEnd, HarvestStart, HarvestEnd,  
SecondCropSupported, GreenhouseSupported, RainfedSupported, IrrigatedSupported  
(+ Scope/Code/Parent, Source, VerificationStatus, Version, timestamps, IsActive)

Tarih formatı: `YYYY-MM-DD` veya mevsimsel `MM-DD`.

## API

Base: `/api/physical-suitability`

| Method | Path |
|--------|------|
| GET | `/crop-knowledge/:id/production-calendar` |
| GET | `/production-calendar/code/:cropCode` |
| GET | `/crop-knowledge/:id/production-calendar/regions` |
| GET | `/crop-knowledge/:id/production-calendar/regions/:regionId` |
| GET | `/crop-knowledge/:id/production-calendar/:calendarId` |
| POST | `/crop-knowledge/:id/production-calendar/regions` |
| PUT | `/crop-knowledge/:id/production-calendar/:calendarId` |
| DELETE | `/crop-knowledge/:id/production-calendar/:calendarId` |
| POST | `/crop-knowledge/:id/production-calendar/validate` |

## Migration

`024_crop_production_calendar.sql`

## Seed

Section shell korunur (`regionCode: TR-GA`). **Region calendar satırı seed edilmez.**

## Testler

- `tests/production-calendar.phase2.test.ts`
- `tests/production-calendar.integration.test.ts`

## OpenAPI

[openapi-crop-production-calendar.yaml](./openapi-crop-production-calendar.yaml)
