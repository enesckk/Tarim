# Karar Matrisi (Decision Matrix)

## RequirementLevel

| Değer | Anlam |
|-------|--------|
| Required | Değerlendirme için zorunlu |
| Important | Güven / skor için önemli |
| Supporting | Destekleyici |

## DecisionRole

| Değer | Anlam |
|-------|--------|
| CriticalBarrier | Aşılırsa üretim kabul edilemez |
| Scoring | (Gelecek faz) puan bileşeni |
| Supporting | Destek sinyali |
| Informational | Bilgi |

## EvaluationType

Range, Boolean, EnumMatch, Threshold, Distribution, DateWindow, Duration, CustomRule.

## MissingDataBehavior

| Davranış | Sonuç |
|----------|--------|
| BlockEvaluation | Analiz engellenir |
| MarkInsufficientData | Sonuç veri yetersiz |
| ContinueWithReducedConfidence | Devam, güven düşer |
| IgnoreForSuitability | Uygunluk hesabına dahil edilmez |
| WarningOnly | Yalnızca uyarı |

**Eksik değer asla 0 / false kabul edilmez.**

## Kritik engel mantığı

`CriticalBarrierEvaluationService.evaluateSingle(rule, observedValue)`:

- `observedValue == null` → engel tetiklenmez; missing-data servisi kullanılır
- Boolean (ör. sulama zorunlu) → beklenen değerle karşılaştırır
- Enum disallow list → yasaklı sınıf
- Threshold → yalnızca `criticalMinimum` / `criticalMaximum` doluysa

Phase 1’de sayısal eşikler seed’de **null** bırakılmıştır.

## Örnek: Domates / açık tarla / sulamalı

Yapısal roller (eşikler yok):

- `water.irrigation_available` → Required / CriticalBarrier / Boolean / MarkInsufficientData
- `soil.ph` → Important / Scoring / Range / ContinueWithReducedConfidence
- `soil.ec` → Important / CriticalBarrier / Threshold / ContinueWithReducedConfidence
- `soil.drainage` → Required / CriticalBarrier / EnumMatch / MarkInsufficientData
- `terrain.mean_slope` → Important / Scoring / Range / ContinueWithReducedConfidence
- `terrain.aspect` → Supporting / Supporting / EnumMatch / WarningOnly
- `climate.growing_degree_days` → Required / CriticalBarrier / Threshold / MarkInsufficientData
- `season.planting_date` → Required / CriticalBarrier / DateWindow / MarkInsufficientData
