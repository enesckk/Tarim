import { Router } from 'express';
import { PerennialCropRankingController } from '../controllers/perennial-crop-ranking.controller.js';

export function createPerennialCropRankingRouter(): Router {
  const router = Router();
  const controller = new PerennialCropRankingController();

  router.get('/:parcelId', controller.getRanking);
  router.get('/:parcelId/export', controller.exportRanking);

  return router;
}
