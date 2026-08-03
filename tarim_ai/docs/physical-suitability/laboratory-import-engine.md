# Laboratory Import Engine (Phase 2.2E)

## Amaç

Farklı laboratuvarlardan gelen analiz dosyalarını ortak veri modeline dönüştürecek **import mimarisi**.

Bu fazda **yoktur**:

- OCR / AI / PDF parsing
- Excel / CSV / XML parser implementasyonu
- Gerçek satır import (SoilAnalysisResult yazımı)
- API entegrasyonu

## Aggregate

**LaboratoryImport**

```
ImportSession
  ├── ImportFile[]
  ├── ImportValidation[]
  └── ImportMapping[]   (laboratory-scoped, reusable)
```

## Pipeline

```
Upload
  → Structure Validation
  → Parameter Mapping
  → Unit Mapping
  → Normalization
  → Validation
  → Preview
  → Import
```

Status akışı: `CREATED → UPLOADED → VALIDATING → MAPPING → IMPORTING → COMPLETED | FAILED | PARTIALLY_IMPORTED`

2.2E’de her aşama **status + ImportValidation kayıtları** üretir; dosya içeriği parse edilmez. Preview `sampleRows=[]`. Import `confirm=true` ile status’ü `COMPLETED` yapar ama sonuç satırı yazmaz.

## Entity’ler

### ImportSession
SessionCode, LaboratoryId, ImportType (`CSV|EXCEL|XML|JSON|API|MANUAL`), ImportStatus, counters, ExecutionTimeMs

### ImportFile
OriginalFileName, FileType, FileSize, StoragePath, Hash, Encoding, SheetName, Delimiter

### ImportMapping
ExternalParameterName/Unit → InternalParameterCode/Unit, ConfidenceScore, RequiresReview

### ImportValidation
RuleName, Severity (`INFO|WARNING|ERROR|CRITICAL`), Result (`PASS|FAIL|SKIPPED`), Message, AffectedRow/Column

## Validation Rules

| Rule | Açıklama |
|------|----------|
| MISSING_COLUMN | Zorunlu sütun |
| UNKNOWN_PARAMETER | Katalog / mapping dışı parametre |
| UNKNOWN_UNIT | Bilinmeyen birim |
| UNSUPPORTED_FILE_TYPE | Desteklenmeyen tip |
| DUPLICATE_ROW | Tekrarlayan satır fingerprint |
| MISSING_SAMPLE_CODE | SampleCode eksik |
| MISSING_LABORATORY | Laboratory yok |
| INVALID_NUMBER_FORMAT | Sayı formatı |
| INVALID_DATE_FORMAT | Tarih formatı |

Kurallar **caller-supplied metadata** üzerinde çalışır (`declaredColumns`, `externalParameters`, …) — dosya okunmaz.

## API

Base: `/api`

| Method | Path |
|--------|------|
| GET | `/laboratory-imports` |
| GET | `/laboratory-imports/{sessionId}` |
| POST | `/laboratory-imports/upload` |
| POST | `/laboratory-imports/{sessionId}/preview` |
| POST | `/laboratory-imports/{sessionId}/validate` |
| POST | `/laboratory-imports/{sessionId}/import` |
| GET | `/laboratory-imports/{sessionId}/validations` |
| POST | `/laboratory-imports/mappings` |

## Migration

`029_laboratory_import_engine.sql`

## Seed

Boş.

## OpenAPI

[openapi-laboratory-import-engine.yaml](./openapi-laboratory-import-engine.yaml)
