/** Thin wrapper kept for future agronomic rule packs. */
export class AgronomicValidationService {
  assertStageWeights(weights: number[]): boolean {
    const sum = weights.reduce((a, b) => a + b, 0);
    return Math.abs(sum - 1) <= 0.02;
  }
}
