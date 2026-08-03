# Scientific Threshold Review — `seasonal-crop-scientific-profile-v1`

**Date:** 2026-08-01
**Scope:** Seasonal Crop Analysis V1 — promoting a narrow slice of Phase-1 `Draft` catalog barrier rules to `ExpertReviewed` using numbers that already exist in the codebase, and nothing else.

## 1. Policy change

`seasonal-critical-barrier.service.ts` previously let only `verificationStatus: 'Approved'` catalog rules block a crop. That gate is widened to `Approved OR ExpertReviewed`. `Draft` rules — still the default for every Phase-1 seeded rule — continue to never block, regardless of evaluation type or observed value (unit-tested; see `catalog barrier rules — Draft never blocks`).

Every catalog barrier outcome now also carries `threshold`, `unit`, and `sourceReference` (all optional, additive), so API consumers can see exactly what a barrier was evaluated against without re-deriving it from the rule catalog.

## 2. Source of every number

**No new agronomic number was invented for this pass.** Every threshold comes from `src/modules/crop-recommendation/knowledge/crops/*.json` (field `soil.maximumElectricalConductivityDsM`), copied verbatim into
`src/modules/physical-suitability/seed/seasonal-crop-scientific-profile-v1/thresholds.json`.

| PS catalog crop | CR knowledge file | `maximumElectricalConductivityDsM` (dS/m) | Has irrigated scenario? |
|---|---|---|---|
| `wheat` | `wheat.json` | 4 | yes |
| `barley` | `barley.json` | 5 | no |
| `chickpea` | `chickpea.json` | 3.5 | no |
| `red_lentil` | `lentil.json` | 3 | no |
| `corn` (maize) | `corn.json` | 2.5 | yes |
| `cotton` | `cotton.json` | 4 | yes |
| `tomato` | `tomato.json` | 2.5 | yes |
| `pepper` | `pepper.json` | 2 | yes |

`melon` and `watermelon` are **irrigation-only** in this pass: their `water.irrigation_available` barrier is promoted to `ExpertReviewed`, but their `soil.ec` barrier is left untouched (`Draft`, `criticalMaximum: null`) because no EC/pH number exists for them anywhere in the codebase. Inventing one was explicitly out of scope.

All 8 EC-bearing crops are attributed to the same `SourceReference`:

> **Tarım AI Crop Recommendation Knowledge Package** — `verificationStatus: ExpertReviewed`, region `TR-GA`.

## 3. What actually changed per crop/scenario

For each of the 8 crops above, for **every** active production scenario (rainfed and irrigated alike, since `soil.ec` is a scenario-agnostic criterion in the Phase-1 matrix):

- The `soil.ec` `CriticalBarrierRule` is updated in place (same `id`, same `code`) — `criticalMaximum` set to the CR value, `verificationStatus: 'ExpertReviewed'`, `sourceReferenceId` set, `explanationTemplate` rewritten to cite the threshold and source.
- The matching `CropCriterionRule` (`decisionRole: 'CriticalBarrier'`, same criterion) is updated the same way, so the decision matrix and the barrier rule never disagree.

For the crop's **irrigated** scenario only (where one exists — `wheat`, `corn`, `cotton`, `tomato`, `pepper`, plus `melon`/`watermelon`):

- The `water.irrigation_available` `CriticalBarrierRule` is updated in place — `booleanExpected: true` (unchanged value, now scientifically attributed), `verificationStatus: 'ExpertReviewed'`, `sourceReferenceId` set.

`barley`, `chickpea`, and `red_lentil` have no irrigated scenario in the Phase-1 catalog, so no irrigation barrier is touched for them — nothing is invented to fill that gap.

## 4. Untouched crops (still fully `Draft`)

`sunflower`, `eggplant`, `cucumber`, `zucchini`, `potato`, `onion`, `garlic` were added to the catalog in this same pass as **structural shells only** — new `CropProfile` + `ProductionScenario` + `Draft` rules/barriers with `null` thresholds, exactly like the original Phase-1 pilots. None of them are touched by the scientific seed. This is verified directly: the "Draft never blocks" unit test now targets `sunflower` specifically because it is guaranteed untouched by any later seed.

## 5. Idempotency & ordering

`seedSeasonalCropScientificProfileV1(repo)` runs once per process, immediately after `seedPhysicalSuitabilityPhase1` inside `createPhysicalSuitabilityModule().ensureSeed()`. It:

- Reuses the existing `SourceReference` if one with the same title already exists (matched by `title`, not re-created).
- Looks up each barrier/rule row by `cropId` + `productionScenarioId` + `criterionCode` and updates it in place — it never creates a duplicate row, and it never touches a crop/scenario that doesn't already exist in the catalog (skip, don't invent).
- Re-running it against an already-seeded repository is a no-op in effect (same values written again).

## 6. Verification

- `src/modules/seasonal-crop-analysis/tests/seasonal-crop-analysis.phase2.test.ts` — new `ExpertReviewed catalog barriers` describe block: asserts the wheat `soil.ec` barrier is `ExpertReviewed` with `criticalMaximum === 4`, blocks when the observed EC (6) exceeds it, does not block below it (1.5), and that the returned `CriticalBarrierOutcome` carries `threshold`/`unit`/`sourceReference`. A second test asserts corn's irrigation barrier is `ExpertReviewed` while melon's `soil.ec` barrier stays `Draft`/`null`.
- `npm run build` and `npx vitest run src/modules/seasonal-crop-analysis` are green (see `final-release-validation.md`).
