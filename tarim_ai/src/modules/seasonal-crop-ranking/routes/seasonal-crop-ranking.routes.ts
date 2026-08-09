import { Router } from 'express';
import { SeasonalCropRankingController } from '../controllers/seasonal-crop-ranking.controller.js';

export function createSeasonalCropRankingRouter(): Router {
  const router = Router();
  const controller = new SeasonalCropRankingController();

  router.get('/:parcelId', controller.getRanking);
  router.get('/:parcelId/export', controller.exportRanking);

  return router;
}
