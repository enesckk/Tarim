/**
 * Deterministic crop selection for reports.
 * Never labels an arbitrary crop list as "Top-5" unless items are the true top ranks.
 */
export type CropReportSelectionMode = 'top_n' | 'selected_crops';

export interface RankedCropRef {
  cropId: string;
  rank: number;
}

export interface CropReportSelection {
  mode: CropReportSelectionMode;
  label: 'Top-5' | 'Selected Crops';
  cropIds: string[];
  ranks: number[];
}

/**
 * Option A: first N by ascending rank.
 * Option B: explicit cropIds → labeled "Selected Crops" (any ranks allowed).
 */
export function selectCropsForReport(input: {
  ranked: RankedCropRef[];
  cropIds?: string[] | null;
  topN?: number;
}): CropReportSelection {
  const topN = input.topN ?? 5;
  const sorted = [...input.ranked].sort((a, b) => a.rank - b.rank);

  if (input.cropIds?.length) {
    const byId = new Map(sorted.map((r) => [r.cropId, r]));
    const selected = input.cropIds.map((id) => {
      const found = byId.get(id);
      return {
        cropId: id,
        rank: found?.rank ?? Number.POSITIVE_INFINITY,
      };
    });
    return {
      mode: 'selected_crops',
      label: 'Selected Crops',
      cropIds: selected.map((s) => s.cropId),
      ranks: selected.map((s) => s.rank),
    };
  }

  const top = sorted.slice(0, topN);
  return {
    mode: 'top_n',
    label: 'Top-5',
    cropIds: top.map((t) => t.cropId),
    ranks: top.map((t) => t.rank),
  };
}

/** True if every selected rank is within 1..topN (for dynamic Top-N tables). */
export function isValidTopNSelection(
  ranks: number[],
  topN = 5,
): boolean {
  return ranks.every((r) => Number.isFinite(r) && r >= 1 && r <= topN);
}
