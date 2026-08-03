import { Router } from 'express';
import type { FieldSurveyController } from '../controllers/field-survey.controller.js';

export function createFieldSurveyRouter(
  controller: FieldSurveyController,
): Router {
  const router = Router();

  router.post('/', controller.create);
  router.post('/by-parcel', controller.listByParcel);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.patch);
  router.post('/:id/samples', controller.addSample);
  router.post('/:id/submit', controller.submit);
  router.post('/:id/start-review', controller.startReview);
  router.post('/:id/approve', controller.approve);
  router.post('/:id/reject', controller.reject);
  router.post('/:id/return-to-draft', controller.returnToDraft);

  return router;
}
