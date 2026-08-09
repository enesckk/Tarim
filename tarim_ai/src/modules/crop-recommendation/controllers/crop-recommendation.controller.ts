// @ts-nocheck
import type { Request, Response, NextFunction } from 'express';
import type { CropKnowledgeService } from '../services/crop-knowledge.service.js';
import type { CropRecommendationService } from '../services/crop-recommendation.service.js';
import {
  compareScenariosRequestSchema,
  cropRecommendationRequestSchema,
} from '../schemas/crop-recommendation-request.schema.js';
import { ScenarioComparisonService } from '../scenarios/scenario-comparison.service.js';
import { getDecisionMatrixRepository } from '../repositories/decision-matrix.repository.js';

export class CropRecommendationController {
  private readonly comparisonService: ScenarioComparisonService;

  constructor(
    private readonly cropKnowledgeService: CropKnowledgeService,
    private readonly cropRecommendationService: CropRecommendationService,
  ) {
    this.comparisonService = new ScenarioComparisonService(
      cropRecommendationService,
      cropKnowledgeService,
    );
  }

    listCrops = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = req.query.profileStatus as string;
      const category = req.query.category as string;
      const seasonalOrPerennial = req.query.seasonalOrPerennial as string;

      let crops = this.cropKnowledgeService.listSummaries().crops;

      if (status) {
        crops = crops.filter(c => c.profileStatus === status);
      }
      if (category) {
        crops = crops.filter(c => c.category === category);
      }
      if (seasonalOrPerennial) {
        crops = crops.filter(c => c.seasonalOrPerennial === seasonalOrPerennial);
      }

      res.json({ count: crops.length, crops });
    } catch (error) {
      next(error);
    }
  };

  adminStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const allCrops = this.cropKnowledgeService.listSummaries().crops;
      const stats = {
        total: allCrops.length,
        categories: {} as Record<string, number>,
        seasonal: 0,
        perennial: 0,
        approved: 0,
        draft: 0,
        missingProfile: 0,
      };

      for (const crop of allCrops) {
        stats.categories[crop.category] = (stats.categories[crop.category] || 0) + 1;
        if (crop.seasonalOrPerennial === 'seasonal') stats.seasonal++;
        if (crop.seasonalOrPerennial === 'perennial') stats.perennial++;
        if (crop.profileStatus === 'approved_for_analysis') stats.approved++;
        else if (crop.profileStatus === 'identity_only') stats.missingProfile++;
        else stats.draft++;
      }

      res.json(stats);
    } catch (error) {
      next(error);
    }
  };


  getCrop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cropId = String(req.params.cropId ?? '');
      const crop = this.cropKnowledgeService.getById(cropId);
      res.json(crop);
    } catch (error) {
      next(error);
    }
  };

  getCriteriaCatalog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const catalog = await getDecisionMatrixRepository().getCriteriaCatalog();
      res.json(catalog);
    } catch (error) {
      next(error);
    }
  };

  getDecisionRules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cropId = String(req.params.cropId ?? '');
      const rules = await getDecisionMatrixRepository().getDecisionRules(cropId);
      res.json(rules);
    } catch (error) {
      next(error);
    }
  };

  getScientificData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cropId = String(req.params.cropId ?? '');
      const data = await getDecisionMatrixRepository().getScientificData(cropId);
      if (!data) {
        res.status(404).json({ error: 'Not Found' });
        return;
      }
      res.json(data);
    } catch (error) {
      next(error);
    }
  };

  getRegionalProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cropId = String(req.params.cropId ?? '');
      const regionName = String(req.query.region ?? 'Gaziantep'); // Default to Gaziantep for now
      const data = await getDecisionMatrixRepository().getRegionalProfile(cropId, regionName);
      if (!data) {
        res.status(404).json({ error: 'Not Found' });
        return;
      }
      res.json(data);
    } catch (error) {
      next(error);
    }
  };

  evaluate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = cropRecommendationRequestSchema.parse(req.body);
      const result = await this.cropRecommendationService.evaluate({
        geometry: body.geometry as never,
        parcelQuery: body.parcelQuery,
        options: body.options,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  compareScenarios = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = compareScenariosRequestSchema.parse(req.body);
      const result = await this.comparisonService.compare({
        geometry: body.geometry as never,
        parcelQuery: body.parcelQuery,
        cropIds: body.cropIds,
        scenarios: body.scenarios,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  validationReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = cropRecommendationRequestSchema.parse(req.body);
      const result = await this.cropRecommendationService.validationReport({
        geometry: body.geometry as never,
        parcelQuery: body.parcelQuery,
        options: body.options,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
