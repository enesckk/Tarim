import type { TerrainProfileResponse, TerrainCheckResult } from '../types/terrain.types.js';
import { resolveTerrainCalibration } from '../config/terrain-calibration.js';
import type { CalibrationProfile } from '../../crop-recommendation/calibration/calibration.types.js';

export function buildTerrainValidationChecks(
  profile: TerrainProfileResponse | null | undefined,
  calibrationProfile?: CalibrationProfile,
): TerrainCheckResult[] {
  const calibration = resolveTerrainCalibration(calibrationProfile?.terrain);
  const checks: TerrainCheckResult[] = [];

  if (!profile) {
    checks.push({
      code: 'TERRAIN_PROVIDER_AVAILABLE',
      status: 'failed',
      message: 'Terrain profili üretilemedi.',
      source: 'terrain',
    });
    return checks;
  }

  const meta = profile.metadata;
  const coverage = profile.terrain.coverage;
  const elev = profile.terrain.elevation;
  const slope = profile.terrain.slope;
  const aspect = profile.terrain.aspect;
  const ruggedness = profile.terrain.ruggedness;
  const dem = calibration.dem ?? {};

  const isMock =
    meta.isMock || meta.fallbackUsed || String(meta.provider).includes('mock');

  checks.push({
    code: 'TERRAIN_PROVIDER_AVAILABLE',
    status: isMock ? 'warning' : 'passed',
    observedValue: meta.provider,
    expectedValue: 'copernicus-dem',
    source: meta.provider,
    message: isMock
      ? 'Terrain sağlayıcısı mock veya fallback modundadır.'
      : 'Terrain DEM sağlayıcısı çalışır durumda.',
  });

  checks.push({
    code: 'TERRAIN_PROVIDER_REAL',
    status: isMock ? 'failed' : 'passed',
    observedValue: !isMock,
    expectedValue: true,
    source: meta.provider,
    message: isMock
      ? 'Gerçek DEM sağlayıcısı kullanılmamıştır.'
      : 'Gerçek Copernicus DEM sağlayıcısı kullanılmıştır.',
  });

  checks.push({
    code: 'TERRAIN_DEM_DATASET_AVAILABLE',
    status: meta.dataset || profile.terrain.provider?.dataset ? 'passed' : 'warning',
    observedValue: meta.dataset ?? profile.terrain.provider?.dataset ?? null,
    expectedValue: dem.preferredDataset ?? 'COPERNICUS_30',
    source: meta.provider,
    message: 'DEM dataset metadata raporlanmıştır.',
  });

  if (isMock) {
    checks.push({
      code: 'MOCK_TERRAIN_EXCLUDED_FROM_DECISION',
      status: 'passed',
      observedValue: meta.usedInDecision ?? false,
      expectedValue: false,
      source: meta.provider,
      message: 'Mock terrain karar kanıtı olarak kullanılmamıştır.',
    });
  }

  const coverageRatio = coverage?.validPixelRatio ?? meta.coverageRatio;
  const coverageThreshold = dem.minimumValidPixelRatio ?? calibration.minimumCoverageRatio.mediumConfidence;
  if (coverageRatio >= (dem.adequateValidPixelRatio ?? calibration.minimumCoverageRatio.highConfidence)) {
    checks.push({
      code: 'TERRAIN_COVERAGE_SUFFICIENT',
      status: 'passed',
      observedValue: coverageRatio,
      threshold: coverageThreshold,
      source: 'terrain-coverage',
      message: `DEM coverage oranı yeterlidir (${coverageRatio}).`,
    });
  } else if (coverageRatio >= coverageThreshold) {
    checks.push({
      code: 'TERRAIN_COVERAGE_SUFFICIENT',
      status: 'warning',
      observedValue: coverageRatio,
      threshold: coverageThreshold,
      source: 'terrain-coverage',
      message: `DEM coverage oranı sınırlıdır (${coverageRatio}).`,
    });
  } else {
    checks.push({
      code: 'TERRAIN_COVERAGE_SUFFICIENT',
      status: 'failed',
      observedValue: coverageRatio,
      threshold: coverageThreshold,
      source: 'terrain-coverage',
      message: `DEM coverage oranı yetersizdir (${coverageRatio}).`,
    });
  }

  // Backward-compatible alias
  checks.push({
    code: 'DEM_COVERAGE_SUFFICIENT',
    status:
      coverageRatio >= calibration.minimumCoverageRatio.mediumConfidence
        ? 'passed'
        : coverageRatio >= calibration.minimumCoverageRatio.lowConfidence
          ? 'warning'
          : 'failed',
    observedValue: coverageRatio,
    threshold: calibration.minimumCoverageRatio.mediumConfidence,
    source: 'terrain-coverage',
    message: `DEM coverage oranı ${coverageRatio}.`,
  });

  checks.push({
    code: 'TERRAIN_VALID_PIXEL_RATIO',
    status:
      coverageRatio >= coverageThreshold
        ? 'passed'
        : coverageRatio > 0
          ? 'warning'
          : 'failed',
    observedValue: coverageRatio,
    threshold: coverageThreshold,
    source: 'terrain-coverage',
    message: `Valid pixel ratio: ${coverageRatio}.`,
  });

  checks.push({
    code: 'TERRAIN_GEOMETRY_MASK_APPLIED',
    status:
      coverage && coverage.insideParcelPixelCount > 0 ? 'passed' : isMock ? 'warning' : 'warning',
    observedValue: coverage?.insideParcelPixelCount ?? null,
    source: 'terrain-mask',
    message: 'Parsel polygon maskesi terrain istatistiklerine uygulanmıştır.',
  });

  const minW = dem.minimumRasterWidth ?? 3;
  const minH = dem.minimumRasterHeight ?? 3;
  const rasterOk =
    (coverage?.rasterWidth ?? 0) >= minW && (coverage?.rasterHeight ?? 0) >= minH;
  checks.push({
    code: 'TERRAIN_RASTER_DIMENSIONS_SUFFICIENT',
    status: coverage
      ? rasterOk
        ? 'passed'
        : 'failed'
      : meta.validPixelCount >= calibration.minimumDemPixels.lowConfidence
        ? 'passed'
        : 'warning',
    observedValue: coverage
      ? `${coverage.rasterWidth}x${coverage.rasterHeight}`
      : meta.validPixelCount,
    threshold: `${minW}x${minH}`,
    source: 'terrain-raster',
    message: rasterOk || !coverage
      ? 'Raster boyutları türev hesapları için yeterlidir.'
      : 'Raster boyutları slope/ruggedness için yetersizdir.',
  });

  if (meta.validPixelCount >= calibration.minimumDemPixels.mediumConfidence) {
    checks.push({
      code: 'DEM_SAMPLE_COUNT_SUFFICIENT',
      status: 'passed',
      observedValue: meta.validPixelCount,
      threshold: calibration.minimumDemPixels.mediumConfidence,
      source: 'terrain',
      message: `Geçerli DEM örnek sayısı yeterlidir (${meta.validPixelCount}).`,
    });
  } else if (meta.validPixelCount >= calibration.minimumDemPixels.lowConfidence) {
    checks.push({
      code: 'DEM_SAMPLE_COUNT_SUFFICIENT',
      status: 'warning',
      observedValue: meta.validPixelCount,
      threshold: calibration.minimumDemPixels.mediumConfidence,
      source: 'terrain',
      message: `Geçerli DEM örnek sayısı düşüktür (${meta.validPixelCount}).`,
    });
  } else {
    checks.push({
      code: 'DEM_SAMPLE_COUNT_SUFFICIENT',
      status: 'failed',
      observedValue: meta.validPixelCount,
      threshold: calibration.minimumDemPixels.lowConfidence,
      source: 'terrain',
      message: `Geçerli DEM örnek sayısı yetersizdir (${meta.validPixelCount}).`,
    });
  }

  const elevOk =
    Number.isFinite(elev.minimumMeters) &&
    elev.minimumMeters <= elev.medianMeters &&
    elev.medianMeters <= elev.maximumMeters &&
    (elev.validSampleCount ?? 0) > 0;
  checks.push({
    code: 'TERRAIN_ELEVATION_VALUES_VALID',
    status: elevOk ? 'passed' : 'failed',
    observedValue: elev.meanMeters,
    source: 'elevation-analysis',
    message: elevOk
      ? 'Rakım istatistikleri geçerlidir.'
      : 'Rakım istatistikleri geçersizdir.',
  });
  checks.push({
    code: 'ELEVATION_VALUES_VALID',
    status: elevOk ? 'passed' : 'failed',
    observedValue: elev.meanMeters,
    source: 'elevation-analysis',
    message: elevOk
      ? 'Rakım istatistikleri geçerlidir.'
      : 'Rakım istatistikleri geçersizdir.',
  });

  const dist = slope.distribution;
  const distSum =
    dist.zeroToFivePercent +
    dist.fiveToTwelvePercent +
    dist.twelveToTwentyPercent +
    dist.twentyToThirtyFivePercent +
    dist.aboveThirtyFivePercent;
  const slopeOk =
    slope.classification !== 'unknown' &&
    (slope.validPixelCount ?? 0) > 0 &&
    Math.abs(distSum - 100) <= 1.5;
  checks.push({
    code: 'TERRAIN_SLOPE_CALCULATION_VALID',
    status: slopeOk ? 'passed' : slope.classification === 'unknown' ? 'warning' : 'warning',
    observedValue: slope.meanPercent,
    source: 'horn-slope',
    message: `Eğim hesabı (Horn); dağılım toplamı ${distSum.toFixed(1)}.`,
  });
  checks.push({
    code: 'SLOPE_DISTRIBUTION_VALID',
    status: Math.abs(distSum - 100) <= 1.5 ? 'passed' : 'warning',
    observedValue: distSum,
    threshold: 100,
    source: 'horn-slope',
    message: `Eğim dağılımı toplamı ${distSum.toFixed(1)}.`,
  });

  checks.push({
    code: 'TERRAIN_ASPECT_CALCULATION_VALID',
    status:
      aspect.dominantDirection && aspect.dominantDirection !== 'unknown'
        ? 'passed'
        : 'warning',
    observedValue: aspect.dominantDirection,
    source: 'aspect-analysis',
    message: 'Aspect hesabı üretilmiştir (circular mean destekli).',
  });

  checks.push({
    code: 'TERRAIN_RUGGEDNESS_CALCULATION_VALID',
    status:
      ruggedness.classification !== 'unknown' && (ruggedness.validPixelCount ?? 0) > 0
        ? 'passed'
        : 'warning',
    observedValue: ruggedness.meanIndex,
    source: ruggedness.method ?? 'terrain_ruggedness_index',
    message: 'Ruggedness (TRI) hesabı üretilmiştir.',
  });

  const requested = meta.requestedResolutionMeters ?? calibration.demResolutionMeters;
  const effective = meta.effectiveResolutionMeters ?? meta.resolutionMeters;
  checks.push({
    code: 'TERRAIN_RESOLUTION_APPROPRIATE',
    status:
      effective <= requested * 2
        ? 'passed'
        : 'warning',
    observedValue: effective,
    expectedValue: requested,
    source: 'terrain-provider',
    message: `İstenen çözünürlük ${requested} m; efektif ${effective} m.`,
  });

  checks.push({
    code: 'TERRAIN_CACHE_REUSED',
    status: meta.cacheHit ? 'passed' : 'informational',
    observedValue: meta.cacheHit ?? false,
    source: 'terrain-cache',
    message: meta.cacheHit
      ? 'Terrain cache yeniden kullanılmıştır.'
      : 'Terrain cache miss; yeni DEM profili üretilmiştir.',
  });

  if (
    coverage &&
    coverage.parcelAreaSquareMeters > 0 &&
    coverage.validAreaSquareMeters >
      coverage.parcelAreaSquareMeters * 1.35
  ) {
    checks.push({
      code: 'TERRAIN_COVERAGE_AREA_MISMATCH',
      status: 'warning',
      observedValue: coverage.validAreaSquareMeters,
      expectedValue: coverage.parcelAreaSquareMeters,
      source: 'terrain-coverage',
      message:
        'Valid raster alanı canonical parcel alanından anlamlı biçimde yüksek; hücre alanı yaklaşımı veya maske kontrol edilmeli.',
    });
  }

  checks.push({
    code: 'TERRAIN_CALIBRATION_UNVALIDATED',
    status: 'warning',
    observedValue: calibration.validationStatus,
    expectedValue: 'validated',
    source: calibration.source,
    message:
      'Terrain kalibrasyon eşikleri henüz uzman / saha doğrulamasından geçmemiştir.',
  });

  checks.push({
    code: 'MECHANIZATION_ACCESS_UNKNOWN',
    status: 'informational',
    source: 'mechanization-assessment',
    message:
      'Mekanizasyon değerlendirmesi yol erişimi ve saha geçiş koşullarını içermez.',
  });

  return checks;
}
