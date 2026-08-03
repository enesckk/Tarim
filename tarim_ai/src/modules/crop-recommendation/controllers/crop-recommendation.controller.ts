import type { Request, Response, NextFunction } from 'express';
import type { CropKnowledgeService } from '../services/crop-knowledge.service.js';
import type { CropRecommendationService } from '../services/crop-recommendation.service.js';
import {
  compareScenariosRequestSchema,
  cropRecommendationRequestSchema,
} from '../schemas/crop-recommendation-request.schema.js';
import { ScenarioComparisonService } from '../scenarios/scenario-comparison.service.js';

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

  listCrops = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(this.cropKnowledgeService.listSummaries());
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
