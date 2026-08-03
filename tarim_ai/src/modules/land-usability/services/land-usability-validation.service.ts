import type { LandUsabilityCalibration } from '../constants/land-usability-calibration.js';
import type { LandUsabilityCheckResult } from '../types/land-usability.types.js';
import type { ResolvedEvidenceBundle } from './evidence-resolution.service.js';
import type { DecisionOutcome } from './physical-suitability.service.js';
import { rockClassMeetsMinimum } from './surface-evidence-adapter.service.js';

export class LandUsabilityValidationService {
  buildChecks(
    bundle: ResolvedEvidenceBundle,
    outcome: DecisionOutcome,
    calibration: LandUsabilityCalibration,
  ): LandUsabilityCheckResult[] {
    const checks: LandUsabilityCheckResult[] = [];

    if (bundle.surface?.providerReal && bundle.surface.usableObservationCount > 0) {
      checks.push({
        code: 'LAND_USABILITY_REAL_SURFACE_AVAILABLE',
        status: 'passed',
        observedValue: bundle.surface.usableObservationCount,
        threshold: 1,
        source: 'sentinel-2',
        message: 'Gerçek Sentinel yüzey analizi mevcuttur.',
      });
    } else {
      checks.push({
        code: 'LAND_USABILITY_REAL_SURFACE_AVAILABLE',
        status: 'failed',
        observedValue: 0,
        threshold: 1,
        source: 'unknown',
        message: 'Gerçek Sentinel yüzey analizi yoktur.',
      });
    }

    checks.push({
      code: 'LAND_USABILITY_REAL_TERRAIN_AVAILABLE',
      status: bundle.terrainReal ? 'passed' : 'warning',
      observedValue: bundle.terrainReal ? 'true' : 'false',
      expectedValue: 'true',
      source: bundle.sourceResolution.terrain?.source,
      message: bundle.terrainReal
        ? 'Gerçek DEM terrain profili mevcuttur.'
        : 'Gerçek terrain profili yoktur (mock/unavailable).',
    });

    if (bundle.soil && !bundle.soilMock) {
      checks.push({
        code: 'LAND_USABILITY_SOIL_PROFILE_AVAILABLE',
        status: bundle.soilRealModeled ? 'warning' : 'passed',
        observedValue: bundle.soil.provider,
        source: String(bundle.soil.provider),
        message: bundle.soilRealModeled
          ? 'Soil profile modeled (SoilGrids); not laboratory-verified.'
          : 'Soil profile available.',
      });
    } else {
      checks.push({
        code: 'LAND_USABILITY_SOIL_PROFILE_AVAILABLE',
        status: 'warning',
        observedValue: null,
        message: 'Gerçek toprak profili yoktur veya mock’tur.',
      });
    }

    checks.push({
      code: 'ROOTABLE_SOIL_DEPTH_VERIFIED',
      status:
        bundle.rootableSoilDepth.status === 'field_measured' ? 'passed' : 'warning',
      observedValue: bundle.rootableSoilDepth.status,
      expectedValue: 'field_measured',
      source: bundle.rootableSoilDepth.source,
      message:
        bundle.rootableSoilDepth.status === 'field_measured'
          ? 'Köklenebilir derinlik saha ölçümü ile doğrulanmıştır.'
          : 'Köklenebilir toprak derinliği doğrulanmamıştır.',
    });

    const rockElevated = rockClassMeetsMinimum(
      bundle.surface?.probableRockClassification ?? null,
      calibration.rockSignal.fieldVerificationMinimumClass,
    );
    checks.push({
      code: 'PROBABLE_ROCK_REQUIRES_FIELD_CONFIRMATION',
      status: rockElevated ? 'warning' : 'informational',
      observedValue: bundle.surface?.probableRockScore ?? null,
      source: 'sentinel-2',
      message: rockElevated
        ? 'Muhtemel kayalık sinyali saha doğrulaması gerektirir.'
        : 'Probable rock düşük/orta; bilgilendirici saha disclaimer korunur.',
    });

    checks.push({
      code: 'PHYSICAL_CONSTRAINTS_FIELD_CONFIRMED',
      status:
        outcome.decision.status === 'strong_physical_constraints'
          ? 'warning'
          : 'passed',
      observedValue: bundle.hardConstraints.length,
      message:
        bundle.hardConstraints.length > 0
          ? 'Doğrulanmış fiziksel kısıtlar mevcuttur.'
          : 'Doğrulanmış strong physical constraint yoktur.',
    });

    checks.push({
      code: 'LAND_USABILITY_CALIBRATION_UNVALIDATED',
      status: 'warning',
      observedValue: calibration.validationStatus,
      expectedValue: 'validated',
      message: 'Land usability kalibrasyonu henüz uzman/saha doğrulamasından geçmemiştir.',
    });

    checks.push({
      code: 'LAND_USABILITY_EVIDENCE_SUFFICIENT',
      status:
        bundle.realEvidenceCount >= calibration.minimumRealEvidenceCount
          ? 'passed'
          : 'failed',
      observedValue: bundle.realEvidenceCount,
      threshold: calibration.minimumRealEvidenceCount,
      message: `Gerçek kanıt sayısı: ${bundle.realEvidenceCount}.`,
    });

    checks.push({
      code: 'MOCK_EVIDENCE_EXCLUDED_FROM_DECISION',
      status: 'passed',
      observedValue: bundle.ignoredEvidence.map((e) => e.code).join(','),
      message: 'Mock kanıtlar karar skorundan hariç tutulmuştur.',
    });

    return checks;
  }
}
