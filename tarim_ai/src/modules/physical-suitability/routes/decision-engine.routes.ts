import { Router } from 'express';
import { DecisionEngineController } from '../controllers/decision-engine.controller.js';

export function createDecisionEngineRouter(): Router {
  const router = Router();
  const controller = new DecisionEngineController();

  router.get('/analyze', controller.analyzeParcel);

  return router;
}
