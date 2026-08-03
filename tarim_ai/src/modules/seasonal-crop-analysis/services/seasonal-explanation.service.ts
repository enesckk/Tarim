import type {
  ConfidenceResult,
  CriticalBarrierOutcome,
  OverallSuitabilityResult,
} from '../types/seasonal-crop-analysis.types.js';

/**
 * Produces deterministic, neutral explanations. Absolute language such as
 * "kesin yetişir" / "definitely grows" is intentionally avoided — every
 * statement is qualified by data source and confidence.
 */
export class SeasonalExplanationService {
  build(input: {
    cropName: string | null;
    catalogCropCode: string;
    overall: OverallSuitabilityResult;
    barriers: CriticalBarrierOutcome[];
    confidence: ConfidenceResult;
  }): string {
    const label = input.cropName ?? input.catalogCropCode;

    if (input.overall.classification === 'blocked_by_barrier') {
      const blocked = input.barriers
        .filter((b) => input.overall.blockingBarrierCodes.includes(b.code))
        .map((b) => b.reason)
        .join(' ');
      return `${label}: Bu senaryoda kritik bir engel tespit edildi. ${blocked}`.trim();
    }

    if (input.overall.classification === 'preliminary_only') {
      return `${label}: Bu senaryo için onaylı puanlama kaynağı bulunmadığından sayısal bir uygunluk skoru üretilmedi. Sonuç ön değerlendirme niteliğindedir ve nihai karar için ek doğrulama gerekir.`;
    }

    const scoreText = input.overall.score != null ? input.overall.score.toFixed(1) : 'bilinmiyor';
    return `${label}: Mevcut verilere göre hesaplanan uygunluk puanı ${scoreText} olarak bulundu (güven düzeyi: ${input.confidence.level}). Bu bir tahmindir, kesin bir garanti ifade etmez.`;
  }
}
