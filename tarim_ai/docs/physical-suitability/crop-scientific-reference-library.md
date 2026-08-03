# Scientific Reference Library (Phase 2.1I)

## Amaç

Merkezi **bilimsel referans kütüphanesi**. Suitability hesaplamaz.  
Bir ürün birden fazla referansa, bir referans birden fazla ürüne bağlanabilir (**many-to-many**).

Bibliyografik satırlar seed’de **üretilmez**; CRUD ile eklenir.

## Aggregate / ilişkiler

```
ScientificReference (ck_scientific_reference)  ← library
        ↕ M2M
CropKnowledge → CropReferences section (ck_references)
        ↕
CropScientificReferenceLink (ck_crop_scientific_reference)
```

## ReferenceType

```
FAO, TAGEM, MINISTRY, UNIVERSITY, JOURNAL, BOOK, THESIS, STANDARD
```

## Alanlar

Title, Authors, Organization, PublicationYear, Country, DOI, ISBN, ISSN, URL,  
ReferenceType, Language, ReliabilityScore (0–100, seed’de null), Notes  
(+ Source, VerificationStatus, Version, timestamps, IsActive)

## API

Base: `/api/physical-suitability`

### Library

| Method | Path |
|--------|------|
| GET | `/scientific-references` |
| POST | `/scientific-references` |
| GET | `/scientific-references/:referenceId` |
| PUT | `/scientific-references/:referenceId` |
| DELETE | `/scientific-references/:referenceId` |
| POST | `/scientific-references/:referenceId/validate` |

### Crop links

| Method | Path |
|--------|------|
| GET | `/crop-knowledge/:id/references` |
| GET | `/references/code/:cropCode` |
| GET | `/crop-knowledge/:id/references/items` |
| POST | `/crop-knowledge/:id/references/link` `{ scientificReferenceId }` |
| DELETE | `/crop-knowledge/:id/references/:referenceId` |
| POST | `/crop-knowledge/:id/references/validate` |

## Migration

`025_scientific_reference_library.sql`

## Seed

References section shell korunur. Library satırı / link **seed edilmez**.

## Testler

- `tests/scientific-references.phase2.test.ts`
- `tests/scientific-references.integration.test.ts`

## OpenAPI

[openapi-scientific-reference-library.yaml](./openapi-scientific-reference-library.yaml)
