import type { SoilTexture } from '../types/soil.types.js';

export interface TextureFractions {
  sand: number;
  silt: number;
  clay: number;
}

export interface TextureClassificationResult {
  texture: SoilTexture;
  fractions: TextureFractions;
  normalized: boolean;
  warning?: string;
}

/**
 * Deterministic USDA-inspired mapping onto the project's limited texture enum.
 */
export class SoilTextureClassificationService {
  classify(raw: TextureFractions): TextureClassificationResult {
    const sum = raw.sand + raw.silt + raw.clay;
    if (!Number.isFinite(sum) || sum <= 0) {
      return {
        texture: 'unknown',
        fractions: { sand: 0, silt: 0, clay: 0 },
        normalized: false,
        warning: 'Sand/silt/clay toplamı geçersiz; texture unknown.',
      };
    }

    let sand = raw.sand;
    let silt = raw.silt;
    let clay = raw.clay;
    let normalized = false;
    let warning: string | undefined;

    if (sum < 95 || sum > 105) {
      sand = (sand / sum) * 100;
      silt = (silt / sum) * 100;
      clay = (clay / sum) * 100;
      normalized = true;
      warning = `Sand/silt/clay toplamı ${sum.toFixed(1)} olduğu için normalize edildi.`;
    }

    const texture = mapUsdaNearest({ sand, silt, clay });
    return {
      texture,
      fractions: {
        sand: round1(sand),
        silt: round1(silt),
        clay: round1(clay),
      },
      normalized,
      warning,
    };
  }
}

function mapUsdaNearest(f: TextureFractions): SoilTexture {
  const { sand, silt, clay } = f;

  if (sand >= 85 && clay < 10) {
    return 'sand';
  }
  if (clay >= 40) {
    return 'clay';
  }
  if (clay >= 27 && clay < 40 && sand <= 45) {
    return 'clay_loam';
  }
  if (silt >= 50 && clay < 27 && sand <= 50) {
    return 'silt_loam';
  }
  if (sand >= 45 && sand < 85 && clay < 20 && silt < 50) {
    return 'sandy_loam';
  }
  if (clay >= 20 && clay < 35 && silt < 40 && sand < 45) {
    return 'clay_loam';
  }
  if (sand >= 70 && clay < 15) {
    return 'sandy_loam';
  }
  if (Math.abs(sand - 40) <= 20 && Math.abs(silt - 40) <= 20 && clay < 27) {
    return 'loam';
  }
  if (clay >= 35) {
    return 'clay_loam';
  }
  if (sand >= 50) {
    return 'sandy_loam';
  }
  if (silt >= 50) {
    return 'silt_loam';
  }
  return 'loam';
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
