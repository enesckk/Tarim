import type { SurfaceAnalysisResponse, SurfaceCheckResult } from './surface-analysis.types.js';
import type { CalibrationProfile } from '../../crop-recommendation/calibration/calibration.types.js';
import { resolveSurfaceCalibration } from './surface-calibration.js';

export function buildSurfaceValidationChecks(
  analysis: SurfaceAnalysisResponse | null | undefined,
  calibrationProfile?: CalibrationProfile,
): SurfaceCheckResult[] {
  const calibration = resolveSurfaceCalibration(calibrationProfile?.surface);
  const checks: SurfaceCheckResult[] = [];

  if (!analysis) {
    checks.push({
      code: 'SURFACE_TIME_SERIES_SUFFICIENT',
      status: 'failed',
      message: 'Yüzey analizi üretilemedi.',
    });
    return checks;
  }

  const dq = analysis.dataQuality;
  if (
    dq.successfulAcquisitionCount >=
    calibration.minimumSuccessfulAcquisitions.mediumConfidence
  ) {
    checks.push({
      code: 'SURFACE_TIME_SERIES_SUFFICIENT',
      status: 'passed',
      message: `Başarılı acquisition sayısı yeterlidir (${dq.successfulAcquisitionCount}).`,
    });
  } else if (
    dq.successfulAcquisitionCount >=
    calibration.minimumSuccessfulAcquisitions.lowConfidence
  ) {
    checks.push({
      code: 'SURFACE_TIME_SERIES_SUFFICIENT',
      status: 'warning',
      message: `Başarılı acquisition sayısı sınırlıdır (${dq.successfulAcquisitionCount}).`,
    });
  } else {
    checks.push({
      code: 'SURFACE_TIME_SERIES_SUFFICIENT',
      status: 'failed',
      message: `Başarılı acquisition sayısı yetersizdir (${dq.successfulAcquisitionCount}).`,
    });
  }

  if (
    dq.seasonCoverageRatio >= calibration.minimumSeasonCoverageRatio.mediumConfidence
  ) {
    checks.push({
      code: 'SURFACE_SEASON_COVERAGE',
      status: 'passed',
      message: `Mevsim kapsamı yeterlidir (${dq.seasonCoverageRatio}).`,
    });
  } else {
    checks.push({
      code: 'SURFACE_SEASON_COVERAGE',
      status: 'warning',
      message: `Mevsim kapsamı sınırlıdır (${dq.seasonCoverageRatio}).`,
    });
  }

  checks.push({
    code: 'SURFACE_CALIBRATION_UNVALIDATED',
    status: 'warning',
    message:
      'Yüzey analizi kalibrasyon eşikleri henüz saha / uzman doğrulamasından geçmemiştir.',
  });

  checks.push({
    code: 'PROBABLE_ROCK_SIGNAL_INFORMATIVE',
    status: 'informational',
    message:
      'Muhtemel kayalık / sığ yüzey sinyali bilgilendiricidir; kesin kaya yüzdesi değildir.',
  });

  return checks;
}
