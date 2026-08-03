# Laboratory Report Management (Phase 2.2D)

## Amaç

Laboratuvardan gelen analiz raporlarını **eksiksiz metadata + dosya ekleri + onay + import geçmişi** ile yönetmek.

Bu fazda **yoktur**:

- OCR
- PDF parsing
- AI yorumlama
- Excel / CSV parametre mapping
- otomatik suitability / gübre / sulama önerisi

## Aggregate Root

**LaboratoryReport**

```
LaboratoryReport
  ├── LaboratoryReportAttachment[]
  ├── LaboratoryApproval[]
  └── LaboratoryImportHistory[]
```

## Entity’ler

### LaboratoryReport
ReportNumber, ReportDate, LaboratoryId, ParcelId, SampleId, CustomerName, RequestedBy, ApprovedBy, Status, ReportLanguage, ReportVersion, OriginalFile*, FileHash, StoragePath, DigitalSignature, Notes (+ soft delete)

### LaboratoryReportAttachment
FileName, FileType, FileCategory (`PDF|EXCEL|CSV|IMAGE|SCAN|XML|JSON`), StoragePath, FileHash, PageCount, UploadedAt/By

### LaboratoryApproval
ApprovedBy, ApprovalDate, ApprovalStatus (`PENDING|UNDER_REVIEW|APPROVED|REJECTED|ARCHIVED`), ApprovalNotes

### LaboratoryImportHistory
ImportedBy/At, ImportType (`MANUAL|EXCEL|CSV|API|OCR`), parameter counts, ExecutionTimeMs, Logs

Upload bu fazda `ImportType=MANUAL` ve **0 parametre** ile history yazar (parsing yok).

## Validation

- Aynı `ReportNumber` aynı `LaboratoryId` altında aktifken tekrar edilemez
- Aktif raporlarda `FileHash` mükerrer olamaz
- DELETE soft-delete (`IsActive=false`); fiziksel satır silinmez
- Bir rapora birden fazla attachment eklenebilir

## API

Base: `/api`

| Method | Path |
|--------|------|
| GET | `/laboratory-reports` |
| GET | `/laboratory-reports/{id}` (aggregate) |
| POST | `/laboratory-reports` |
| PUT | `/laboratory-reports/{id}` |
| DELETE | `/laboratory-reports/{id}` |
| POST | `/laboratory-reports/upload` |
| GET | `/laboratory-reports/{id}/attachments` |

### Upload

JSON body: dosya metadata + opsiyonel `dataBase64` (yalnızca hash/size/storage). İçerik **parse edilmez**.

## Migration

`028_laboratory_report_management.sql`

## Seed

Boş — rapor / attachment / approval / import satırı üretilmez.

## OpenAPI

[openapi-laboratory-report-management.yaml](./openapi-laboratory-report-management.yaml)
