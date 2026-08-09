import { DecisionEngineDataAggregatorService } from './decision-engine-data-aggregator.service.js';
import { CropProfileService, CropDecisionMatrixService } from './domain-services.js';
import { InMemoryPhysicalSuitabilityRepository } from '../repositories/physical-suitability.repository.js';
import type { 
  CropSuitabilityResult, 
  PhysicalSuitabilityAnalysisResponse,
} from '../types/decision-engine.types.js';

export class PhysicalSuitabilityDecisionEngine {
  private readonly dataAggregator = new DecisionEngineDataAggregatorService();
  private readonly repo = new InMemoryPhysicalSuitabilityRepository();
  private readonly profileService = new CropProfileService(this.repo);
  private readonly matrixService = new CropDecisionMatrixService(this.repo);

  async analyzeParcel(parcelId: string): Promise<PhysicalSuitabilityAnalysisResponse> {
    const data = await this.dataAggregator.aggregateForParcel(parcelId);
    
    // Get all crops
    const allCrops = await this.profileService.listCrops();
    
    const results: CropSuitabilityResult[] = [];
    
    for (const crop of allCrops) {
      if (!crop.isActive) continue;
      
      const result = await this.evaluateCrop(crop.id, crop.name, crop.code, data);
      results.push(result);
    }
    
    // Calculate summary
    const summary = {
      totalEvaluated: results.length,
      suitable: 0,
      marginal: 0,
      unsuitable: 0,
      dataInsufficient: 0,
    };
    
    for (const res of results) {
      if (res.suitability === 'Highly Suitable' || res.suitability === 'Suitable' || res.suitability === 'Moderately Suitable') {
        summary.suitable++;
      } else if (res.suitability === 'Marginal') {
        summary.marginal++;
      } else if (res.suitability === 'Unsuitable') {
        summary.unsuitable++;
      } else {
        summary.dataInsufficient++;
      }
    }
    
    return {
      parcelId,
      results,
      summary
    };
  }
  
  private async evaluateCrop(
    cropId: string, 
    cropName: string, 
    cropCode: string, 
    data: any
  ): Promise<CropSuitabilityResult> {
    const result: CropSuitabilityResult = {
      cropId,
      cropName,
      cropCode,
      suitability: 'Suitable',
      confidence: 'Medium',
      missingData: [],
      limitations: [],
      criticalConstraints: [],
      warnings: [],
      explainability: [],
      sourceSummary: { laboratoryCount: 0, modelCount: 0, expertCount: 0, missingCount: 0 },
      analysisStatus: 'Completed'
    };
    
    try {
      // 1. Get regional production scenario (if any)
      const scenario = await this.profileService.resolveActiveScenario(cropId).catch(() => null);
      if (!scenario) {
        result.suitability = 'Data Insufficient';
        result.analysisStatus = 'Failed';
        result.missingData.push('Production Scenario');
        return result;
      }
      
      // 2. Get Decision Matrix (not used yet)
      await this.matrixService.getMatrix(cropId, scenario.id);
      
      // Basic mockup logic for evaluating criteria based on actual aggregated data
      let minSuitabilityScore = 4; // 4: Highly Suitable, 3: Suitable, 2: Mod Suitable, 1: Marginal, 0: Unsuitable
      
      const evaluateRule = (category: string, criterionCode: string, value: any, _rules: any[]) => {
        // Find matching rule in matrix if exists (dummy implementation for now)
        // Check for missing data block
        if (value === undefined || value === null) {
          result.missingData.push(criterionCode);
          result.sourceSummary.missingCount++;
          result.explainability.push({
            category,
            criterion: criterionCode,
            source: 'None',
            rule: 'MissingDataBehavior',
            result: 'Missing',
            explanation: 'Veri bulunamadı. Decision Matrix kurallarına göre değerlendirilemedi.'
          });
          // Assuming BlockEvaluation behavior by default for missing data
          minSuitabilityScore = -1; // Data Insufficient
          return;
        }
        
        result.sourceSummary.modelCount++; // Assumed model for now
        result.explainability.push({
          category,
          criterion: criterionCode,
          source: 'Model',
          rule: 'Threshold',
          result: 'Pass',
          explanation: `${value} değeri uygun aralıkta.`
        });
      };
      
      // Evaluate Soil
      evaluateRule('Soil', 'soil_ph', data.soil.soil_ph, []);
      evaluateRule('Soil', 'soil_ec', data.soil.soil_ec, []);
      
      // Evaluate Climate
      evaluateRule('Climate', 'temperature', data.climate.temperature_mean, []);
      
      // Evaluate Water
      // If water data is missing but required, we add to missing
      
      if (minSuitabilityScore === -1) {
        result.suitability = 'Data Insufficient';
        result.analysisStatus = 'Completed With Missing Data';
      } else if (minSuitabilityScore === 0) {
        result.suitability = 'Unsuitable';
        result.criticalConstraints.push('Uygun olmayan kritik koşullar tespit edildi.');
        result.analysisStatus = 'Completed With Limitations';
      } else if (minSuitabilityScore === 1) {
        result.suitability = 'Marginal';
        result.limitations.push('Marjinal koşullar mevcut.');
        result.analysisStatus = 'Completed With Limitations';
      } else {
        result.suitability = 'Suitable';
      }
      
      // Confidence heuristic
      if (result.sourceSummary.laboratoryCount > 2) {
        result.confidence = 'Very High';
      } else if (result.sourceSummary.laboratoryCount > 0) {
        result.confidence = 'High';
      } else if (result.sourceSummary.modelCount > 0) {
        result.confidence = 'Medium';
      } else {
        result.confidence = 'Low';
      }
      
    } catch (e: any) {
      result.analysisStatus = 'Failed';
      result.suitability = 'Data Insufficient';
      result.warnings.push(`Hesaplama hatası: ${e.message}`);
    }
    
    return result;
  }
}
