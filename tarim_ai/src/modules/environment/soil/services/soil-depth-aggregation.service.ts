import {
  SOIL_DEPTH_WEIGHTS,
  type SoilGridsDepth,
} from '../config/soilgrids-units.config.js';

export class SoilDepthAggregationService {
  /**
   * Weighted average across agricultural topsoil depths.
   * Missing depths are skipped and remaining weights renormalized.
   */
  weightedAverage(
    valuesByDepth: Partial<Record<SoilGridsDepth, number | null | undefined>>,
  ): { value: number | null; usedDepths: SoilGridsDepth[]; renormalized: boolean } {
    let weightSum = 0;
    let weighted = 0;
    const usedDepths: SoilGridsDepth[] = [];

    for (const [depth, weight] of Object.entries(SOIL_DEPTH_WEIGHTS) as Array<
      [SoilGridsDepth, number]
    >) {
      const raw = valuesByDepth[depth];
      if (raw == null || !Number.isFinite(raw)) {
        continue;
      }
      weighted += raw * weight;
      weightSum += weight;
      usedDepths.push(depth);
    }

    if (weightSum <= 0) {
      return { value: null, usedDepths, renormalized: false };
    }

    return {
      value: weighted / weightSum,
      usedDepths,
      renormalized: Math.abs(weightSum - 1) > 1e-6,
    };
  }

  assertWeightsSumToOne(): number {
    const total = Object.values(SOIL_DEPTH_WEIGHTS).reduce((a, b) => a + b, 0);
    return Math.round(total * 1000) / 1000;
  }
}
