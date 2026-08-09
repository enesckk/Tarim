// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import { FieldLogController } from '../controllers/field-log.controller.js';
import { idempotencyMiddleware } from '../../operations/index.js';

export function createFieldLogRouter(controller: FieldLogController): Router {
  const router = Router();

  // Queries
  router.get('/', controller.getEntries.bind(controller));
  router.get('/export', controller.exportEntries.bind(controller));
  router.get('/:id', controller.getEntryById.bind(controller));

  // Lifecycle (idempotent)
  router.post('/', idempotencyMiddleware, controller.createEntry.bind(controller));
  router.put('/:id', idempotencyMiddleware, controller.updateEntry.bind(controller));
  router.delete('/:id', idempotencyMiddleware, controller.deleteEntry.bind(controller));
  
  router.post('/:id/submit', idempotencyMiddleware, controller.submitEntry.bind(controller));
  router.post('/:id/verify', idempotencyMiddleware, controller.expertReview.bind(controller));
  router.post('/:id/reject', idempotencyMiddleware, controller.expertReview.bind(controller));
  router.post('/:id/request-revision', idempotencyMiddleware, controller.expertReview.bind(controller));
  router.post('/:id/cancel', idempotencyMiddleware, controller.cancelEntry.bind(controller));

  // Sub-resources (idempotent)
  router.post('/:id/inputs', idempotencyMiddleware, controller.addInputUsage.bind(controller));
  router.post('/:id/evidence', idempotencyMiddleware, controller.addEvidence.bind(controller));
  router.post('/:id/observations', idempotencyMiddleware, controller.addObservation.bind(controller));

  return router;
}
