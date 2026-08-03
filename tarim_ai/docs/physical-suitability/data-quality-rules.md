# Veri Kalitesi Kuralları

## Veri kaynakları (`SourceType`)

- Laboratory
- FieldMeasurement
- OfficialLocal
- RemoteSensing
- GlobalModel
- UserDeclared

## Kaynak önceliği

Kriter bazında yapılandırılır. Örnek `soil.ph`: Lab > Saha > Resmi > UA > Global model > Beyan.

Seçim gerekçesi `ResolvedCriterionValue.selectionReason` alanında tutulur; aday listesi izlenebilir kalır.

## Güncellik ve doğrulama

`DataSourceRecord` alanları:

- `observationDate`, `retrievedAt`
- `isVerified`, `verificationStatus`
- `confidence`
- `originalValue` / `normalizedValue` / `unit`

Eski veya Draft kaynaklar silinmez; öncelik sırasında geride kalır.

## Mekansal / zamansal çözünürlük

`spatialResolution`, `temporalResolution` metadata olarak saklanır (Phase 1’de soft metadata).

## Eksik veri

`MissingDataEvaluationService` — Required/Important/Supporting mesajları ayrılır.  
Null → asla sıfır/false varsayılmaz.

## Ölçülen vs tahmini

- Laboratory / FieldMeasurement → ölçülen adayı
- GlobalModel (SoilGrids, NASA POWER) → tahmini
- Öncelik ve `isVerified` ile ayrıştırılır

## Birim normalizasyonu

`convertToStandardUnit` / `normalizeCriterionValue`  
Desteklenmeyen birim → `ApiError` (sessiz geçiş yok).
