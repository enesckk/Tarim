# Crop Knowledge Base (Phase 2.1)

## Amaç

Physical Suitability modülü içinde merkezi **Crop Knowledge Base** — ürün bilgisini normalize edilmiş bölüm entity’lerinde saklar.

Bu faz **yalnızca bilgi yönetimi** yapar. Aşağıdakiler **yoktur**:

- ürün sıralaması
- suitability score
- recommendation
- AI / yield / fertilizer prediction

Sayısal tarımsal eşikler henüz eklenmez.

## Domain: `CropKnowledge`

Her ürün için kök kayıt + bağımsız bölümler:

| Bölüm | Tablo | Durum |
|-------|--------|--------|
| Root | `ck_crop_knowledge` | Aktif |
| General Information | `ck_general_information` | Geliştirildi |
| Scientific Identity | `ck_scientific_identity` | Kabuk |
| Phenology | `ck_phenology` + `ck_crop_growth_stage` + transitions/references | Phase 2.1B engine |
| Climate Requirements | `ck_climate_requirements` + `ck_climate_requirement` | Phase 2.1C |
| Soil Requirements | `ck_soil_requirements` + `ck_soil_requirement` | Phase 2.1D |
| Water Requirements | `ck_water_requirements` + `ck_water_requirement` | Phase 2.1E |
| Terrain Requirements | `ck_terrain_requirements` + `ck_terrain_requirement` | Phase 2.1F |
| Production Calendar | `ck_production_calendar` + `ck_production_calendar_entry` | Phase 2.1H |
| Risk Profile | `ck_risk_profile` + `ck_crop_risk` | Phase 2.1G |
| References | `ck_references` + `ck_scientific_reference` + `ck_crop_scientific_reference` | Phase 2.1I |
| Soil Laboratory | `sl_laboratory` + `sl_analysis_method` + `sl_soil_sample` + `sl_soil_analysis_result` | Phase 2.2A |
| Soil Parameter Catalog | `sl_soil_parameter` + units/aliases/options + raw/normalized result fields | Phase 2.2C |
| Laboratory Report Management | `sl_laboratory_report` + attachments + approvals + import history | Phase 2.2D |
| Laboratory Import Engine | `sl_import_session` + file/mapping/validation (architecture only) | Phase 2.2E |
| Soil Sampling Management | `ss_sampling_campaign` + points/samples/observations/custody | Phase 2.2F |

Tek büyük tablo yoktur; her bölüm ayrı entity’dir.

## Ortak meta alanlar

Her entity taşır:

- `version`
- `source` → `sourceReferenceId`
- `verificationStatus`
- `createdAt` / `updatedAt`
- `isActive`

## General Information alanları

Kimlik ve katalog bilgisi:

- Türkçe / İngilizce / bilimsel ad
- FAO Code, EPPO Code (seed’de null — kaynak doğrulaması bekleniyor)
- Crop Group, Family, Lifecycle, Growing Type
- Production types: Open Field, Greenhouse, Rainfed, Irrigated, First/Second Crop
- Seed Type, Harvest Type
- Typical Growing Duration / Root Depth / Plant Height — alan var, değer **null** (eşik değil)
- Economic Part, Primary/Secondary Usage
- Region Availability, Description, Photo, Icon
- Scientific References (`scientificReferenceIds`)

## Seed

Phase 1’deki 10 pilot ürün için Draft General Information + bölüm kabukları:

`wheat`, `barley`, `chickpea`, `red_lentil`, `corn`, `cotton`, `tomato`, `pepper`, `melon`, `watermelon`

`cropProfileId` Phase 1 `ps_crops` kaydına bağlanır (varsa).

## API

Base: `/api/physical-suitability`

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/crop-knowledge` | Özet liste |
| GET | `/crop-knowledge/code/:cropCode` | Bundle by code |
| GET | `/crop-knowledge/:id` | Bundle (tüm bölümler) |
| GET | `/general-information` | GI listesi |
| GET | `/general-information/code/:cropCode` | GI by code |
| GET | `/crop-knowledge/:id/general-information` | Tek GI |
| PUT | `/crop-knowledge/:id/general-information` | Yeni sürüm (önceki soft-deactivate) |
| POST | `/crop-knowledge/:id/general-information/validate` | Validasyon |
| GET | `/phenology/code/:cropCode` | Phenology section + stages |
| GET | `/crop-knowledge/:id/phenology` | Phenology DTO |
| GET | `/crop-knowledge/:id/phenology/stages` | Stage listesi |
| GET | `/crop-knowledge/:id/phenology/stages/:stageCode` | Tek stage |
| PUT | `/crop-knowledge/:id/phenology/stages` | Stage sürümleme |
| POST | `/crop-knowledge/:id/phenology/validate` | Phenology validasyon |

## Validation

Zorunlu: identity, adlar, crop group, lifecycle, growing type, en az bir production flag.

Uyarı: eksik FAO/EPPO, Draft kayıt, kaynak bağlantısı.

Hata: `Approved` (Phase 2.1’de erken onay yok), geçersiz tanımlayıcı ölçüler.

## Migration

`016_crop_knowledge_base.sql`  
`017_crop_phenology_stages.sql` (legacy shell)  
`018_crop_phenology_engine.sql` (CropGrowthStage / Transition / Reference)  
`019_crop_climate_requirements.sql` (ClimateRequirement)  
`020_crop_soil_requirements.sql` (SoilRequirement)  
`021_crop_water_requirements.sql` (WaterRequirement)  
`022_crop_terrain_requirements.sql` (TerrainRequirement)  
`023_crop_risk_profile.sql` (CropRisk)  
`024_crop_production_calendar.sql` (ProductionCalendar)  
`025_scientific_reference_library.sql` (ScientificReference + M2M)  
`026_soil_laboratory_core.sql` (Soil Laboratory core)  
`027_soil_parameter_catalog.sql` (Parameter definitions / units / aliases)

## Testler

`src/modules/physical-suitability/tests/crop-knowledge.phase2.test.ts`  
`src/modules/physical-suitability/tests/phenology.phase2.test.ts`  
`src/modules/physical-suitability/tests/crop-phenology.integration.test.ts`

Ayrıca: [general-information.md](./general-information.md), [crop-phenology.md](./crop-phenology.md), [crop-water-requirements.md](./crop-water-requirements.md), [crop-terrain-requirements.md](./crop-terrain-requirements.md), [crop-risk-profile.md](./crop-risk-profile.md), [crop-production-calendar.md](./crop-production-calendar.md), [crop-scientific-reference-library.md](./crop-scientific-reference-library.md), [soil-laboratory-core.md](./soil-laboratory-core.md), [soil-parameter-definitions.md](./soil-parameter-definitions.md), [soil-unit-normalization.md](./soil-unit-normalization.md), [soil-parameter-aliases.md](./soil-parameter-aliases.md), [laboratory-report-management.md](./laboratory-report-management.md), [laboratory-import-engine.md](./laboratory-import-engine.md), [soil-sampling-management.md](./soil-sampling-management.md)
