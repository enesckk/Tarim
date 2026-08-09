// @ts-nocheck
import { getEnv, resetEnvCache } from '../../../config/env.js';
import { createApp } from '../../../app.js';
import { TKGMClient } from '../../parcel/providers/tkgm/tkgm.client.js';
import { NasaPowerProvider } from '../../environment/climate/providers/nasa-power.provider.js';
import { SoilGridsProvider } from '../../environment/soil/providers/soilgrids.provider.js';
import { SentinelHubProvider } from '../../satellite/surface-analysis/providers/sentinel-hub.provider.js';
import { CopernicusDemProvider } from '../../terrain/providers/copernicus-dem.provider.js';
import { CropRecommendationService } from '../../crop-recommendation/services/crop-recommendation.service.js';

async function generateReport() {
  process.env.ANALYSIS_DATA_MODE = 'live';
  process.env.DATABASE_ENABLED = 'true';
  process.env.PERSISTENCE_PROVIDER = 'postgresql';
  resetEnvCache();
  
  const app = createApp(); // Initialize everything
  console.log("=========================================");
  console.log("   TARIM AI - PRODUCTION READINESS TEST  ");
  console.log("=========================================");
  console.log("Mode:", process.env.ANALYSIS_DATA_MODE);
  
  const results: Record<string, { status: 'PASS' | 'FAIL', reason?: string }> = {};

  // 1. Parcel
  try {
    console.log("Testing TKGM...");
    const tkgm = new TKGMClient();
    const geom = await tkgm.getParcelGeometry({
      province: 'Diyarbakır',
      district: 'Bismil',
      neighborhood: 'Sinan',
      block: '0',
      parcel: '1513'
    });
    results['Parcel_TKGM'] = { status: 'PASS' };
  } catch (err: any) {
    results['Parcel_TKGM'] = { status: 'FAIL', reason: err.message };
  }
  
  // 2. NASA
  try {
    console.log("Testing NASA POWER...");
    const nasa = new NasaPowerProvider();
    await nasa.getProfile({ lat: 37.8, lon: 40.5, geometry: null as any });
    results['NASA'] = { status: 'PASS' };
  } catch (err: any) {
    results['NASA'] = { status: 'FAIL', reason: err.message };
  }
  
  // 3. SoilGrids
  try {
    console.log("Testing SoilGrids...");
    const sg = new SoilGridsProvider();
    await sg.getProfile({ lat: 37.8, lon: 40.5, geometry: null as any });
    results['SoilGrids'] = { status: 'PASS' };
  } catch (err: any) {
    results['SoilGrids'] = { status: 'FAIL', reason: err.message };
  }
  
  // 4. DEM
  try {
    console.log("Testing Copernicus DEM...");
    const dem = new CopernicusDemProvider();
    await dem.getDemGrid({ lat: 37.8, lon: 40.5, geometry: null as any });
    results['DEM'] = { status: 'PASS' };
  } catch (err: any) {
    results['DEM'] = { status: 'FAIL', reason: err.message };
  }
  
  // 5. Sentinel
  try {
    console.log("Testing Sentinel...");
    const sen = new SentinelHubProvider();
    await sen.getSurfaceAnalysis({ lat: 37.8, lon: 40.5, geometry: null as any });
    results['Sentinel'] = { status: 'PASS' };
  } catch (err: any) {
    results['Sentinel'] = { status: 'FAIL', reason: err.message };
  }
  
  // 6. Decision Engine
  try {
    console.log("Testing Decision Engine (Live Mode Rejection)...");
    const rec = app.locals.analysisOrchestrator?.cropRecommendationService as CropRecommendationService;
    if (rec) {
      await rec.evaluate({ parcelQuery: {} as any, options: {} } as any);
      results['DecisionEngine'] = { status: 'FAIL', reason: 'Should have thrown LIVE_MODE_MOCK_DATA_REJECTED' };
    } else {
      results['DecisionEngine'] = { status: 'FAIL', reason: 'Service not found' };
    }
  } catch (err: any) {
    if (err.message?.includes('LIVE_MODE_MOCK_DATA_REJECTED')) {
      results['DecisionEngine'] = { status: 'PASS' };
    } else {
      results['DecisionEngine'] = { status: 'FAIL', reason: err.message };
    }
  }
  
  console.log("\n--- TEST RESULTS ---");
  for (const [key, res] of Object.entries(results)) {
    console.log(`[${res.status}] ${key}${res.reason ? ` - ${res.reason}` : ''}`);
  }
  
  process.exit(0);
}

generateReport().catch(console.error);
