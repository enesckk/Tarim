// @ts-nocheck
import { getEnv, resetEnvCache } from '../../../config/env.js';
import { AnalysisOrchestratorService } from '../services/analysis-orchestrator.service.js';
import { createApp } from '../../../app.js';
import type { Server } from 'node:http';

async function run() {
  process.env.ANALYSIS_DATA_MODE = 'live';
  process.env.DATABASE_ENABLED = 'true';
  process.env.PERSISTENCE_PROVIDER = 'postgresql';
  process.env.DATABASE_URL = 'postgresql://tarim:tarim@localhost:5433/tarim_ai';
  resetEnvCache();
  
  const port = 16500 + Math.floor(Math.random() * 4000);
  const app = createApp();
  const server = app.listen(port);
  await new Promise<void>((resolve) => server.on('listening', resolve));
  
  console.log('App listening on port', port);
  
  const req = await fetch(`http://127.0.0.1:${port}/api/analyses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      province: 'Diyarbakır',
      district: 'Bismil',
      neighborhood: 'Sinan',
      block: '0',
      parcel: '1513',
      options: { soil: { mode: 'skip' }, irrigation: { mode: 'skip' } }
    })
  });
  
  console.log("Analysis POST status:", req.status);
  const data = await req.json();
  const id = data.id || data.analysisId;
  console.log("Analysis ID:", id);
  
  if (id) {
    console.log("Triggering analysis manually...");
    const orchestrator = app.locals.analysisOrchestrator as AnalysisOrchestratorService;
    if (orchestrator) {
      await orchestrator.runAnalysis(id);
    }
    
    console.log("Fetching final state...");
    const poll = await fetch(`http://127.0.0.1:${port}/api/analyses/${id}`);
    const state = await poll.json();
    console.log("Final State:", JSON.stringify(state, null, 2));
    
    const steps = state.steps || {};
    if (steps.recommendations?.status === 'failed' && steps.recommendations?.error?.includes('LIVE_MODE_MOCK_DATA_REJECTED')) {
      console.log("SUCCESS: Mock data rejection in Live Mode working correctly!");
    } else {
      console.error("FAIL: Mock data rejection failed. Recommendations step was not rejected properly.");
      process.exitCode = 1;
    }
  }
  
  server.close();
  process.exit();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
