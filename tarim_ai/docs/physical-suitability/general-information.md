# General Information (Crop Knowledge)

Ürün katalog kimliği — suitability eşiği veya skor içermez.

## Alan haritası

| Alan | Tip | Not |
|------|-----|-----|
| identityCode | string | Stabil kod (`wheat`, …) |
| nameTr / nameEn | string | Zorunlu |
| scientificName | string? | Tavsiye |
| faoCode / eppoCode | string? | Kaynak sonrası |
| cropGroup / family | string | Grup zorunlu |
| lifecycle | Seasonal\|Perennial\|Biennial | |
| growingType | FieldCrop\|Vegetable\|Melon\|Industrial\|Other | |
| supportsOpenField / Greenhouse / Rainfed / Irrigated / FirstCrop / SecondCrop | boolean | En az biri true |
| seedType / harvestType | enum? | |
| typicalGrowingDurationDays | number? | Tanımlayıcı; seed null |
| typicalRootDepthCm | number? | Tanımlayıcı; seed null |
| typicalPlantHeightCm | number? | Tanımlayıcı; seed null |
| economicPart / primaryUsage / secondaryUsage | string? | |
| regionAvailability | string[] | örn. `TR-GA` |
| description / photoUrl / iconUrl | string? | |
| scientificReferenceIds | uuid[] | SourceReference |
| version / sourceReferenceId / verificationStatus / timestamps / isActive | meta | |

## Sürümleme

`PUT` yeni satır oluşturur (`version+1`), önceki `isActive=false`. Silme yok.

## Kasıtlı dışarıda

- Suitability score / ranking
- İklim-toprak-su sayısal eşikler (diğer bölümlerde sonraki faz)
- Recommendation / AI prediction
