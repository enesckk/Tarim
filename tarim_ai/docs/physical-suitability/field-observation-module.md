# Field Observation Module (Phase 2.2H)

Professional field survey, observation, evidence, device measurement, and expert review for Physical Suitability.

## Scope

**In:** Aggregate `FieldSurvey`, observation points, field parameter catalog, results, evidence (+ link table), devices, expert review.  
**Out:** Suitability scores, crop recommendation, AI, fertilizer/irrigation advice, automatic decisions.

## Aggregate

```
FieldSurvey
  ├── FieldObservationPoint[]
  ├── FieldObservationResult[]  (dataOrigin: OBSERVED|MEASURED|…)
  ├── FieldEvidence[] ──< FieldEvidenceResultLink >── results
  ├── FieldSurveyReview[]
  └── (devices / device measurements linked via results)
```

Catalog aggregate: `FieldParameterCatalog` (+ empty option store until sources verified).

## Tables (`fo_*`)

`fo_field_survey`, `fo_field_observation_point`, `fo_field_parameter`, `fo_field_parameter_option`, `fo_field_observation_result`, `fo_field_evidence`, `fo_field_evidence_result_link`, `fo_field_measurement_device`, `fo_field_device_measurement`, `fo_field_survey_review`, `fo_parcel_geometry`

## Data origins

`OBSERVED` | `MEASURED` | `REPORTED_BY_FARMER` | `DERIVED` | `IMPORTED` | `EXPERT_ASSESSMENT`  
Never mixed with laboratory-reported sources.

## Evidence & verification

- File hash required; original path/metadata retained
- Evidence linked to results via relation table (no duplicate file copies)
- Photo-required parameters cannot verify without evidence

## Expert review flow

`PLANNED → IN_PROGRESS → COMPLETED → UNDER_REVIEW → APPROVED|REJECTED`  
Revision returns to `IN_PROGRESS`. Verified results are immutable (new version on change).

## Migration

`032_field_observation_module.sql`

## API note

`/api/field-surveys` is reserved by the legacy Field Survey module. Phase 2.2H uses **`/api/field-observation-surveys`** (plus field-parameters, evidence, devices, observation results/points).

## Related

- [field-parameter-catalog.md](./field-parameter-catalog.md)
- [field-evidence-management.md](./field-evidence-management.md)
- [field-survey-review.md](./field-survey-review.md)
