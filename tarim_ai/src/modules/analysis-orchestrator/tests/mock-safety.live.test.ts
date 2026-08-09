// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AnalysisOrchestratorService } from '../services/analysis-orchestrator.service.js';
import { getSharedAnalysisRepository } from '../../../modules/database/persistence-factory.js';
import { ParcelQueryService } from '../../parcel/services/parcel-query.service.js';
import { SatelliteAnalysisService } from '../../satellite/surface-analysis/services/satellite-analysis.service.js';
import { TerrainProfileService } from '../../terrain/services/terrain-profile.service.js';
import { ClimateProfileService } from '../../environment/climate/services/climate-profile.service.js';
import { SoilProfileService } from '../../environment/soil/services/soil-profile.service.js';
import { CropRecommendationService } from '../../crop-recommendation/services/crop-recommendation.service.js';
import { resetEnvCache } from '../../../config/env.js';

const PARCEL_SINAN = {
  province: 'Diyarbakır',
  district: 'Bismil',
  neighborhood: 'Sinan',
  block: '0',
  parcel: '1513',
};

describe('mock safety in live mode', () => {
  let orchestrator: AnalysisOrchestratorService;

  beforeAll(async () => {
    process.env.ANALYSIS_DATA_MODE = 'live';
    process.env.DATABASE_ENABLED = 'true';
    process.env.PERSISTENCE_PROVIDER = 'postgresql';
    process.env.DATABASE_URL = 'postgresql://tarim:tarim@localhost:5433/tarim_ai';
    resetEnvCache();
    
    // We instantiate the orchestrator with nulls for optional services but we need CropRecommendationService
    // Actually, just let it use the real services by requiring the app container or creating them.
    // It's easier to use the singleton or full module graph. Let's see how `analysis-orchestrator.test.ts` does it.
    let state = req.body;
    let attempts = 0;
    while (['queued', 'processing'].includes(state.status) && attempts < 40) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
    }
  });

  // To fix the HTTP test, we can just fetch the status after running the analysis manually if possible, or wait longer.
  // Actually, wait! The background worker runs every 10 seconds.
});
