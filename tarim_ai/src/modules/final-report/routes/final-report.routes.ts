import { Router } from 'express';
import { FinalReportController } from '../controllers/final-report.controller.js';

export function createFinalReportRouter(): Router {
  const router = Router();
  const controller = new FinalReportController();

  router.get('/:parcelId', controller.getReport);
  router.get('/:parcelId/json', controller.getReportJson);
  router.get('/:parcelId/html', controller.getReportHtml);
  router.get('/:parcelId/pdf', controller.getReportPdf);

  return router;
}
