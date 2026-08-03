# Field Evidence Management (Phase 2.2H)

## FieldEvidence

Stores PHOTO / VIDEO / DOCUMENT / MEASUREMENT_SCREENSHOT / AUDIO_NOTE / SKETCH metadata with mandatory `fileHash`. Capture location/time optional.

## Linking

`FieldEvidenceResultLink` connects one evidence file to many observation results without copying binaries.

## API

- `POST /api/field-evidence/upload` (`fileHash` or `dataBase64`)
- `GET /api/field-observation-surveys/{surveyId}/evidence`
- `DELETE /api/field-evidence/{id}` (soft delete)
