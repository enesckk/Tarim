import { Router } from 'express';
import type { ParcelQueryService } from '../modules/parcel/services/parcel-query.service.js';
import { SurfaceAnalysisOrchestratorService } from '../modules/satellite/surface-analysis/surface-analysis-orchestrator.service.js';
import {
  searchSatellite,
  latestTrueColor,
  latestNdvi,
  latestNdmi,
  latestBsi,
  bestTrueColor,
  bestNdvi,
  bestNdmi,
  bestBsi,
  bestNdviStatistics,
  bestNdmiStatistics,
  bestBsiStatistics,
  bestAnalysisSummary,
  timeSeries,
  createSurfaceAnalysisHandlers,
} from '../controllers/satellite.controller.js';

export function createSatelliteRouter(parcelQueryService: ParcelQueryService): Router {
  const surfaceOrchestrator = new SurfaceAnalysisOrchestratorService(parcelQueryService);
  const { surfaceAnalysis, surfacePersistence } =
    createSurfaceAnalysisHandlers(surfaceOrchestrator);

  const router = Router();
  router.post('/search', searchSatellite);
  router.post('/latest/true-color', latestTrueColor);
  router.post('/latest/ndvi', latestNdvi);
  router.post('/latest/ndmi', latestNdmi);
  router.post('/latest/bsi', latestBsi);
  router.post('/best/true-color', bestTrueColor);
  router.post('/best/ndvi', bestNdvi);
  router.post('/best/ndmi', bestNdmi);
  router.post('/best/bsi', bestBsi);
  router.post('/best/ndvi-statistics', bestNdviStatistics);
  router.post('/best/ndmi-statistics', bestNdmiStatistics);
  router.post('/best/bsi-statistics', bestBsiStatistics);
  router.post('/best/analysis-summary', bestAnalysisSummary);
  router.post('/time-series', timeSeries);
  router.post('/surface-analysis', surfaceAnalysis);
  router.post('/surface-persistence', surfacePersistence);
  return router;
}

/** @deprecated Prefer createSatelliteRouter for DI; kept for tests that only need legacy routes. */
const legacyRouter = Router();
legacyRouter.post('/search', searchSatellite);
legacyRouter.post('/latest/true-color', latestTrueColor);
legacyRouter.post('/latest/ndvi', latestNdvi);
legacyRouter.post('/best/true-color', bestTrueColor);
legacyRouter.post('/best/ndvi', bestNdvi);
legacyRouter.post('/best/ndvi-statistics', bestNdviStatistics);
legacyRouter.post('/best/ndmi-statistics', bestNdmiStatistics);
legacyRouter.post('/best/bsi-statistics', bestBsiStatistics);
legacyRouter.post('/best/analysis-summary', bestAnalysisSummary);
legacyRouter.post('/time-series', timeSeries);

export default legacyRouter;
