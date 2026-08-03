import type { LandUsabilityCalibration } from '../constants/land-usability-calibration.js';
import type { FieldCheckRequirement } from '../types/land-usability.types.js';
import type { ResolvedEvidenceBundle } from './evidence-resolution.service.js';
import { rockClassMeetsMinimum, rockRank } from './surface-evidence-adapter.service.js';

export class FieldVerificationRequirementsService {
  build(
    bundle: ResolvedEvidenceBundle,
    calibration: LandUsabilityCalibration,
  ): FieldCheckRequirement[] {
    const checks: FieldCheckRequirement[] = [];
    const field = bundle.fieldEvidence;

    if (bundle.rootableSoilDepth.status === 'unknown') {
      checks.push({
        code: 'ROOTABLE_SOIL_DEPTH_MEASUREMENT',
        priority: 'high',
        required: true,
        suggestedSampleCount: calibration.fieldDepth.recommendedSampleCount,
        reason: 'Köklenebilir toprak derinliği uzaktan doğrulanamamaktadır.',
        relatedEvidenceCodes: ['ROOTABLE_SOIL_DEPTH_UNKNOWN'],
      });
    }

    const rockClass = bundle.surface?.probableRockClassification ?? null;
    const rockElevated = rockClassMeetsMinimum(
      rockClass,
      calibration.rockSignal.fieldVerificationMinimumClass,
    );
    const rockRoutine =
      rockRank(rockClass) > 0 &&
      rockRank(rockClass) <=
        rockRank(calibration.rockSignal.routineCheckMaximumClass);

    const stoninessVerified =
      field?.surfaceStoniness != null && field.surfaceStoniness !== 'unknown';
    const bedrockVerified =
      field?.bedrockOutcrop != null && field.bedrockOutcrop !== 'unknown';

    if (rockElevated && !stoninessVerified) {
      checks.push({
        code: 'SURFACE_STONINESS_INSPECTION',
        priority: 'high',
        required: true,
        reason: 'Muhtemel kayalık sinyali yükselmiştir; taşlılık saha kontrolü gerekir.',
        relatedEvidenceCodes: ['PROBABLE_ROCK_NEEDS_FIELD_CONFIRMATION'],
      });
    } else if (
      !stoninessVerified &&
      (rockRoutine || bundle.surface?.agriculturalCycleDetected)
    ) {
      checks.push({
        code: 'SURFACE_STONINESS_INSPECTION',
        priority: 'routine',
        required: false,
        reason: 'Rutin taşlılık kontrolü önerilir.',
        relatedEvidenceCodes: ['LOW_PROBABLE_ROCK_SIGNAL'],
      });
    }

    if (rockElevated && !bedrockVerified) {
      checks.push({
        code: 'BEDROCK_OUTCROP_INSPECTION',
        priority: 'high',
        required: true,
        reason: 'Kaya çıkışı saha gözlemi ile doğrulanmalıdır.',
        relatedEvidenceCodes: ['PROBABLE_ROCK_NEEDS_FIELD_CONFIRMATION'],
      });
    } else if (
      !bedrockVerified &&
      (rockRoutine || bundle.surface?.agriculturalCycleDetected)
    ) {
      checks.push({
        code: 'BEDROCK_OUTCROP_INSPECTION',
        priority: 'medium',
        required: false,
        reason: 'Kaya çıkışı için görsel saha kontrolü önerilir.',
        relatedEvidenceCodes: ['LOW_PROBABLE_ROCK_SIGNAL'],
      });
    }

    if (!bundle.terrainReal) {
      checks.push({
        code: 'TERRAIN_VISUAL_CONFIRMATION',
        priority: 'medium',
        required: false,
        reason: 'Gerçek DEM yoktur; arazi eğimi / erişim görsel olarak doğrulanmalıdır.',
        relatedEvidenceCodes: ['REAL_TERRAIN_PROFILE_UNAVAILABLE', 'MOCK_TERRAIN_NOT_USED'],
      });
    } else {
      checks.push({
        code: 'TERRAIN_VISUAL_CONFIRMATION',
        priority: 'routine',
        required: false,
        reason:
          'Gerçek DEM mevcuttur; görsel arazi doğrulaması rutin/opsiyonel seviyeye indirilmiştir.',
        relatedEvidenceCodes: ['REAL_TERRAIN_PROFILE_AVAILABLE'],
      });
    }

    if (!field?.machineAccess || field.machineAccess === 'unknown') {
      checks.push({
        code: 'MACHINE_ACCESS_INSPECTION',
        priority: 'medium',
        required: false,
        reason: 'Makine erişimi saha ile doğrulanmamıştır.',
        relatedEvidenceCodes: [],
      });
    }

    if (bundle.soilRealModeled || bundle.soilMock) {
      checks.push({
        code: 'LAB_SOIL_ANALYSIS',
        priority: 'medium',
        required: false,
        reason:
          'SoilGrids / mock toprak profili laboratuvar analizi yerine geçmez (EC, drenaj, CaCO3).',
        relatedEvidenceCodes: ['MODELED_SOIL_PROFILE_AVAILABLE'],
      });
    }

    if (
      !field?.drainageObservation ||
      field.drainageObservation === 'unknown'
    ) {
      checks.push({
        code: 'DRAINAGE_FIELD_INSPECTION',
        priority: 'routine',
        required: false,
        reason: 'Drenaj durumu saha gözlemi ile netleştirilebilir.',
        relatedEvidenceCodes: [],
      });
    }

    return dedupeChecks(checks);
  }
}

function dedupeChecks(checks: FieldCheckRequirement[]): FieldCheckRequirement[] {
  const seen = new Set<string>();
  return checks.filter((c) => {
    if (seen.has(c.code)) return false;
    seen.add(c.code);
    return true;
  });
}
