# Soil Unit Normalization (Phase 2.2C)

## MeasurementUnit

| Alan | Açıklama |
|------|----------|
| Code / Symbol / Name | Katalog kimliği |
| QuantityType | ElectricalConductivity, Length, … |
| ConversionType | Identity, Linear, OffsetLinear, Unsupported |
| ConversionFactor / Offset | Quantity canonical’a göre |
| CanonicalUnitId | Aynı quantity içindeki referans birim |

## Desteklenen birimler

`NONE`, `PH_UNIT`, `DS_PER_M`, `MS_PER_CM`, `PERCENT`, `G_PER_KG`, `MG_PER_KG`, `CMOL_PER_KG`, `MEQ_PER_100G`, `G_PER_CM3`, `CM`, `MM`, `MM_PER_HOUR`, `CM_PER_HOUR`

## Dönüşüm motoru

`convertMeasurementValue` yalnızca:

1. aynı `QuantityType`
2. aynı canonical referans
3. `Unsupported` olmayan

çiftlerde çalışır.

### Bilimsel 1:1 örnekler

- **mS/cm ↔ dS/m** (1:1)
- **meq/100g ↔ cmol/kg** (1:1)
- **mm ↔ cm**, **cm/h ↔ mm/h** (sabit linear)

### Dönüştürülmeyen

- `% ↔ g/kg` (bağlama bağlı → `REQUIRES_REVIEW` / `Unsupported`)
- Farklı quantity’ler → `UNSUPPORTED_UNIT`

## SoilParameterUnit

Parametre ↔ kabul edilen birim eşlemesi. Sistem içinde saklama **canonical unit** ile yapılır.

## SoilAnalysisResult raw / normalized

| Alan | Kural |
|------|-------|
| RawValue / RawUnit | Lab raporu; create sonrası **immutable** |
| NormalizedValue / NormalizedUnitId | Canonical |
| NormalizationStatus | `NOT_REQUIRED \| NORMALIZED \| FAILED \| REQUIRES_REVIEW \| UNSUPPORTED_UNIT` |
| Null vs 0 | Ayrı; eksik değer asla 0 yazılmaz |

## API

| Method | Path |
|--------|------|
| GET | `/api/soil-units` |
| POST | `/api/soil-units/convert` |
| POST | `/api/soil-analysis-results/normalize` |
| POST | `/api/soil-analysis-results/validate` |
