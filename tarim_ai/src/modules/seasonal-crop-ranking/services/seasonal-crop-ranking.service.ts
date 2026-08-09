import { PhysicalSuitabilityDecisionEngine } from '../../physical-suitability/services/decision-engine.service.js';
import type { RankedCropResult, SeasonalCropRankingResponse } from '../types/ranking.types.js';
import type { 
  SuitabilityClass, 
  ConfidenceLevel,
  CropSuitabilityResult 
} from '../../physical-suitability/types/decision-engine.types.js';

const SEASONAL_CROPS = new Set([
  'wheat', 'barley', 'maize', 'oat', 'triticale',
  'chickpea', 'red_lentil', 'green_lentil', 'bean', 'cowpea',
  'cotton', 'sunflower', 'sugar_beet',
  'tomato', 'pepper', 'eggplant', 'cucumber', 'zucchini', 'watermelon', 'melon', 'onion', 'garlic', 'potato',
  'lettuce', 'spinach', 'cabbage', 'cauliflower', 'broccoli',
  'carrot', 'radish', 'parsley', 'dill', 'rocket',
  'alfalfa', 'vetch', 'sainfoin', 'silage_maize',
  'cumin', 'fennel', 'thyme', 'sage', 'lavender'
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

export class SeasonalCropRankingService {
  private readonly engine = new PhysicalSuitabilityDecisionEngine();

  async rankCropsForParcel(parcelId: string, options?: { top?: number; suitability?: string; confidence?: string }): Promise<SeasonalCropRankingResponse> {
    const analysis = await this.engine.analyzeParcel(parcelId);
    
    // 1. Filter seasonal crops
    const seasonalResults = analysis.results.filter(r => SEASONAL_CROPS.has(r.cropCode));

    // 2. Filter by options if provided
    let filteredResults = seasonalResults;
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

    // 4. Map to RankedCropResult & Generate Explainability
    let ranked: RankedCropResult[] = sorted.map((res, index) => {
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
      totalSeasonalCropsEvaluated: seasonalResults.length,
      results: ranked
    };
  }

  private generateExplainability(res: CropSuitabilityResult): string {
    const reasons: string[] = [];
    
    reasons.push(`Ürün ${res.suitability} sınıfında değerlendirildi.`);
    
    if (res.criticalConstraints.length > 0) {
      reasons.push(`${res.criticalConstraints.length} adet kritik engel bulundu.`);
    } else {
      reasons.push('Kritik veri engeli bulunmuyor.');
    }
    
    if (res.missingData.length > 0) {
      reasons.push(`${res.missingData.length} parametrede veri eksikliği var (örn: ${res.missingData.slice(0, 2).join(', ')}).`);
    }
    
    if (res.sourceSummary.laboratoryCount > 0) {
      reasons.push('Toprak/Su laboratuvar verileri ile desteklendi.');
    } else if (res.sourceSummary.modelCount > 0) {
      reasons.push('Sadece model verilerine dayanıyor.');
    }
    
    reasons.push(`(Confidence: ${res.confidence})`);
    
    return reasons.join(' ');
  }
}
