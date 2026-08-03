# ADR-001: Phase 1 Crop Decision Matrix & Knowledge Base

## Status
Accepted (2026-07-30)

## Context
Gaziantep seasonal physical suitability V1 needs a scientific decision foundation before any ranking or suitability score. Existing `crop-recommendation` JSON knowledge and `crop-physical-compatibility` engines must remain untouched.

## Decision
Add a sibling module `src/modules/physical-suitability/` that owns:

- Crop profiles, production scenarios, criterion catalog
- Crop criterion rules (decision matrix) and critical barrier rules
- Source references, regional profiles, data-source priority
- Missing-data and unit-normalization helpers
- Admin/validation APIs under `/api/physical-suitability`
- In-memory repository (default) + PostgreSQL schema migration `015_*`
- Seed of 10 pilot crops with **structural** matrix only (no invented numeric thresholds)

## Consequences
- No OverallSuitabilityService / CropRankingService in this phase
- Draft / SourceVerified statuses; never auto-Approved
- Existing analysis orchestrator and crop-recommendation paths unchanged
- Later phases may consume this matrix when computing scores
