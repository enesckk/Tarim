import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newId, type PhysicalSuitabilityRepository } from '../repositories/physical-suitability.repository.js';
import type { SourceReference, VerificationStatus } from '../types/physical-suitability.types.js';

/**
 * Phase-1 seeded every catalog rule as `Draft` with null thresholds — by
 * design, Draft rules can never block (see seasonal-critical-barrier.service.ts).
 *
 * This seed promotes a narrow, source-backed slice of that catalog to
 * `ExpertReviewed`:
 *   - soil.ec critical-barrier thresholds for the 8 crops that already have a
 *     verified maximumElectricalConductivityDsM number in the Crop
 *     Recommendation knowledge package (thresholds.json, loaded below).
 *   - water.irrigation_available critical-barrier rules for the irrigated
 *     scenarios of those same crops, plus melon/watermelon (irrigation-only —
 *     no EC/pH numbers are invented for melon/watermelon).
 *
 * Every number originates from thresholds.json, which is itself a literal
 * copy of `maximumElectricalConductivityDsM` values already present in
 * src/modules/crop-recommendation/knowledge/crops/*.json. Nothing here
 * invents a new number. Crops or scenarios missing from the physical-suitability
 * catalog are silently skipped — never fabricated.
 *
 * Idempotent: reruns update the same barrier/rule rows in place (matched by
 * cropId + productionScenarioId + criterionCode) and reuse the same
 * SourceReference (matched by title), so calling this seed on an
 * already-seeded repository is a no-op in effect.
 */

interface ScientificProfileCropEntry {
  cropRecommendationId: string;
  maximumElectricalConductivityDsM: number;
  hasIrrigatedScenario: boolean;
}

interface ScientificProfileSourceReferenceSeed {
  title: string;
  organization: string;
  verificationStatus: VerificationStatus;
  notes: string;
}

interface ScientificProfileThresholds {
  sourceReference: ScientificProfileSourceReferenceSeed;
  crops: Record<string, ScientificProfileCropEntry>;
  irrigationOnlyCrops: string[];
}

function resolveThresholdsPath(): string {
  const besideModule = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'seasonal-crop-scientific-profile-v1/thresholds.json',
  );
  if (existsSync(besideModule)) {
    return besideModule;
  }
  const fromCwd = path.join(
    process.cwd(),
    'src/modules/physical-suitability/seed/seasonal-crop-scientific-profile-v1/thresholds.json',
  );
  if (existsSync(fromCwd)) {
    return fromCwd;
  }
  throw new Error(
    `seasonal-crop-scientific-profile-v1 thresholds.json not found. Checked: ${besideModule} and ${fromCwd}`,
  );
}

let cachedThresholds: ScientificProfileThresholds | null = null;

function loadThresholds(): ScientificProfileThresholds {
  if (!cachedThresholds) {
    cachedThresholds = JSON.parse(
      readFileSync(resolveThresholdsPath(), 'utf8'),
    ) as ScientificProfileThresholds;
  }
  return cachedThresholds;
}

async function ensureSourceReference(
  repo: PhysicalSuitabilityRepository,
  def: ScientificProfileSourceReferenceSeed,
): Promise<SourceReference> {
  const existing = (await repo.listSourceReferences()).find((r) => r.title === def.title);
  if (existing) return existing;
  return repo.upsertSourceReference({
    id: newId(),
    title: def.title,
    organization: def.organization,
    author: null,
    publicationYear: null,
    urlOrIdentifier: null,
    region: 'TR-GA',
    notes: def.notes,
    retrievedAt: new Date().toISOString(),
    verificationStatus: def.verificationStatus,
  });
}

async function upsertIrrigationAvailabilityBarrier(
  repo: PhysicalSuitabilityRepository,
  cropId: string,
  scenarioId: string,
  sourceReferenceId: string,
): Promise<void> {
  const barriers = await repo.listBarrierRules({ cropId, productionScenarioId: scenarioId });
  const existing = barriers.find((b) => b.criterionCode === 'water.irrigation_available');
  if (!existing) return; // structural gap in the catalog — never invent a new rule row
  await repo.upsertBarrierRule({
    ...existing,
    booleanExpected: true,
    verificationStatus: 'ExpertReviewed',
    sourceReferenceId,
  });
}

async function upsertSoilEcBarrier(
  repo: PhysicalSuitabilityRepository,
  cropId: string,
  scenarioId: string,
  criticalMaximum: number,
  sourceReferenceId: string,
): Promise<void> {
  const barriers = await repo.listBarrierRules({ cropId, productionScenarioId: scenarioId });
  const existingBarrier = barriers.find((b) => b.criterionCode === 'soil.ec');
  if (existingBarrier) {
    await repo.upsertBarrierRule({
      ...existingBarrier,
      criticalMaximum,
      verificationStatus: 'ExpertReviewed',
      sourceReferenceId,
      explanationTemplate: `Toprak elektriksel iletkenliği (EC) ${criticalMaximum} dS/m eşiğini aşıyor (Tarım AI Crop Recommendation Knowledge Package).`,
    });
  }

  const rules = await repo.listRules({ cropId, productionScenarioId: scenarioId });
  const existingRule = rules.find((r) => r.criterionCode === 'soil.ec');
  if (existingRule) {
    await repo.upsertRule({
      ...existingRule,
      criticalMaximum,
      verificationStatus: 'ExpertReviewed',
      sourceReferenceId,
      notes: 'ExpertReviewed via seasonal-crop-scientific-profile-v1 seed — sourced from Crop Recommendation knowledge package.',
    });
  }
}

export async function seedSeasonalCropScientificProfileV1(
  repo: PhysicalSuitabilityRepository,
): Promise<void> {
  const thresholds = loadThresholds();
  const sourceRef = await ensureSourceReference(repo, thresholds.sourceReference);

  for (const [cropCode, entry] of Object.entries(thresholds.crops)) {
    const crop = await repo.getCropByCode(cropCode);
    if (!crop) continue; // not in the physical-suitability catalog — never invented

    const scenarios = await repo.listScenarios(crop.id);
    for (const scenario of scenarios) {
      await upsertSoilEcBarrier(
        repo,
        crop.id,
        scenario.id,
        entry.maximumElectricalConductivityDsM,
        sourceRef.id,
      );
      if (entry.hasIrrigatedScenario && scenario.productionType === 'Irrigated') {
        await upsertIrrigationAvailabilityBarrier(repo, crop.id, scenario.id, sourceRef.id);
      }
    }
  }

  // Melon/watermelon: irrigation-only ExpertReviewed promotion. No EC/pH
  // numbers exist for these crops in the knowledge package, so none are set.
  for (const cropCode of thresholds.irrigationOnlyCrops) {
    const crop = await repo.getCropByCode(cropCode);
    if (!crop) continue;

    const scenarios = await repo.listScenarios(crop.id);
    for (const scenario of scenarios) {
      if (scenario.productionType === 'Irrigated') {
        await upsertIrrigationAvailabilityBarrier(repo, crop.id, scenario.id, sourceRef.id);
      }
    }
  }
}
