# Crop Phenology Engine (Phase 2.1B)

## Amaç

Crop Knowledge Base içinde ürün yaşam döngüsünü bilimsel olarak yöneten **veri modeli**.

Bu faz:

- Suitability hesaplamaz
- AI / task / irrigation / fertilizer / disease prediction yapmaz
- Sıcaklık, yağış, su, GDD, gübre, ilaç alanları **içermez**

## Aggregate

`CropKnowledge` → `CropPhenology` (section: `ck_phenology`) →:

| Entity | Tablo | İlişki |
|--------|--------|--------|
| `CropGrowthStage` | `ck_crop_growth_stage` | N stage / crop |
| `StageTransition` | `ck_stage_transition` | FromStage → ToStage |
| `StageReference` | `ck_stage_reference` | N reference / stage |

`CropId` = Crop Knowledge root id (`crop_knowledge_id`).

## StageCode enum

```
SEED → GERMINATION → EMERGENCE → VEGETATIVE → BRANCHING →
FLOWERING → POLLINATION → FRUIT_SET → FRUIT_DEVELOPMENT →
MATURITY → HARVEST → POST_HARVEST → RESIDUE
```

## CropGrowthStage alanları

Id, CropId, StageCode, StageName, StageOrder, Description, ScientificDescription,  
TypicalDurationDays, MinimumDurationDays, MaximumDurationDays,  
CanOverlapPreviousStage, IsCriticalStage, RequiresValidation,  
CreatedAt, UpdatedAt, Version, Source (`sourceReferenceId`), VerificationStatus, IsActive

Süre alanları seed’de **null** (yapısal; eşik değil).

## Validation

- StageOrder ürün içinde benzersiz
- StageCode ürün içinde benzersiz
- İlk stage (en düşük order) her zaman `SEED`
- `HARVEST` sonrası yalnızca `POST_HARVEST` / `RESIDUE`
- Geçersiz `StageTransition` engellenir (sıra, canSkip, harvest sonrası)

## API

Base: `/api/physical-suitability`

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/crop-knowledge/:id/growth-stages` | Stage list |
| GET | `/crop-knowledge/:id/growth-stages/:stageId` | Stage details (+ references) |
| POST | `/crop-knowledge/:id/growth-stages` | Create stage |
| PUT | `/crop-knowledge/:id/growth-stages/:stageId` | Update (version + soft-deactivate previous) |
| DELETE | `/crop-knowledge/:id/growth-stages/:stageId` | Soft delete (`isActive=false`) |
| GET | `/crop-knowledge/:id/phenology` | Section + stages + transitions |
| POST | `/crop-knowledge/:id/phenology/validate` | Aggregate validation |

OpenAPI: [openapi-crop-phenology.yaml](./openapi-crop-phenology.yaml)

## Seed (10 pilot)

Buğday, Arpa, Nohut, Mercimek (`red_lentil`), Pamuk, Mısır, Domates, Biber, Karpuz, Kavun  

Her biri: 13 Draft stage + 12 sequential transition + StageReference kabukları.

## Migration

`018_crop_phenology_engine.sql`  
(önceki kabuk: `017_crop_phenology_stages.sql` — legacy)

## Testler

- Unit: `tests/phenology.phase2.test.ts`
- Integration: `tests/crop-phenology.integration.test.ts`

## Sonraki fazlar (bilinçli dışarıda)

Sıcaklık, yağış, su ihtiyacı, GDD, gübre, ilaçlama eşikleri.
