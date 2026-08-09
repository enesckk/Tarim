import { PhysicalSuitabilityDecisionEngine } from '../../physical-suitability/services/decision-engine.service.js';
import type { RankedPerennialCropResult, PerennialCropRankingResponse } from '../types/ranking.types.js';
import type { 
  SuitabilityClass, 
  ConfidenceLevel,
  CropSuitabilityResult 
} from '../../physical-suitability/types/decision-engine.types.js';

const PERENNIAL_CROPS = new Set([
  'pistachio', 'olive', 'grape', 'pomegranate', 'almond', 'walnut', 
  'fig', 'apricot', 'peach', 'plum', 'apple', 'pear'
]);

const SUITABILITY_WEIGHTS: Record<SuitabilityClass, number> = {
  'Highly Suitable': 5,
  'Suitable': 4,
  'Moderately Suitable': 3,
  'Marginal': 2,
  'Data Insufficient': 1,
  'Unsuitable': 0
};

const CONFIDENCE_WEIGHTS: Record<ConfidenceLevel, number> = {
  'Very High': 5,
  'High': 4,
  'Medium': 3,
  'Low': 2,
  'Very Low': 1
};

export class PerennialCropRankingService {
  private readonly engine = new PhysicalSuitabilityDecisionEngine();

  async rankCropsForParcel(parcelId: string, options?: { top?: number; suitability?: string; confidence?: string }): Promise<PerennialCropRankingResponse> {
    const analysis = await this.engine.analyzeParcel(parcelId);
    
    // 1. Filter perennial crops
    const perennialResults = analysis.results.filter(r => PERENNIAL_CROPS.has(r.cropCode));

    // 2. Filter by options if provided
    let filteredResults = perennialResults;
    if (options?.suitability) {
      filteredResults = filteredResults.filter(r => r.suitability === options.suitability);
    }
    if (options?.confidence) {
      filteredResults = filteredResults.filter(r => r.confidence === options.confidence);
    }

    // 3. Sort logic
    const sorted = filteredResults.sort((a, b) => {
      // 3.1 Suitability Weight
      const diffSuit = SUITABILITY_WEIGHTS[b.suitability] - SUITABILITY_WEIGHTS[a.suitability];
      if (diffSuit !== 0) return diffSuit;

      // 3.2 Confidence Weight
      const diffConf = CONFIDENCE_WEIGHTS[b.confidence] - CONFIDENCE_WEIGHTS[a.confidence];
      if (diffConf !== 0) return diffConf;

      // 3.3 Critical Constraints count (fewer is better)
      const diffConstraints = a.criticalConstraints.length - b.criticalConstraints.length;
      if (diffConstraints !== 0) return diffConstraints;

      // 3.4 Missing Data count (fewer is better)
      const diffMissing = a.missingData.length - b.missingData.length;
      if (diffMissing !== 0) return diffMissing;

      // Alphabetical as tie-breaker
      return a.cropName.localeCompare(b.cropName);
    });

    // 4. Map to RankedPerennialCropResult & Generate Explainability
    let ranked: RankedPerennialCropResult[] = sorted.map((res, index) => {
      return {
        ...res,
        rank: index + 1,
        explainabilitySummary: this.generateExplainability(res)
      };
    });

    // 5. Apply top N
    if (options?.top && options.top > 0) {
      ranked = ranked.slice(0, options.top);
    }

    return {
      parcelId,
      totalPerennialCropsEvaluated: perennialResults.length,
      results: ranked
    };
  }

  private generateExplainability(res: CropSuitabilityResult): string {
    const reasons: string[] = [];
    
    reasons.push(`Uzun vadeli bahçe yatırımı için ${res.suitability} olarak değerlendirildi.`);
    
    if (res.criticalConstraints.length > 0) {
      reasons.push(`${res.criticalConstraints.length} adet kritik gelişim engeli bulundu. Bu durum çok yıllık bir yatırım için risk teşkil edebilir.`);
    } else {
      reasons.push('Kritik fizyolojik kısıt bulunmuyor.');
    }
    
    if (res.missingData.length > 0) {
      reasons.push(`${res.missingData.length} temel parametrede veri eksikliği var (örn: ${res.missingData.slice(0, 2).join(', ')}). Yatırım öncesi saha analizi önerilir.`);
    }
    
    if (res.sourceSummary.laboratoryCount > 0) {
      reasons.push('Toprak/Su laboratuvar sonuçlarıyla doğrulanmış güvenilir analiz.');
    } else if (res.sourceSummary.modelCount > 0) {
      reasons.push('Bölgesel model tahminlerine dayanmaktadır.');
    }
    
    reasons.push(`(Güven Skoru: ${res.confidence})`);
    
    return reasons.join(' ');
  }
}
