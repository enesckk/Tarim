import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getEnv } from '../../../config/env.js';
import type { AnalysisOrchestratorService } from '../services/analysis-orchestrator.service.js';
import {
  getLandAnalysisCache,
  listLandAnalysisCaches,
} from '../services/land-analysis-cache.service.js';

type AmsLand = {
  id: string;
  name: string;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  cadastralBlock?: string | null;
  parcelNumber?: string | null;
};

type SchedulerState = {
  lastRunAt: string | null;
  lastResults: Array<{
    landId: string;
    analysisId?: string;
    status: 'started' | 'skipped' | 'failed' | 'completed';
    reason?: string;
    at: string;
  }>;
};

function statePath(): string {
  return join(process.cwd(), 'storage', 'scheduler', 'weekly-analysis.json');
}

function readState(): SchedulerState {
  const path = statePath();
  if (!existsSync(path)) return { lastRunAt: null, lastResults: [] };
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as SchedulerState;
  } catch {
    return { lastRunAt: null, lastResults: [] };
  }
}

function writeState(state: SchedulerState): void {
  const dir = join(process.cwd(), 'storage', 'scheduler');
  mkdirSync(dir, { recursive: true });
  writeFileSync(statePath(), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const ms = Date.now() - new Date(iso).getTime();
  return ms / (24 * 60 * 60 * 1000);
}

async function fetchAmsLands(): Promise<AmsLand[]> {
  const env = getEnv();
  if (!env.AMS_INTEGRATION_API_KEY?.trim()) return [];
  const base = env.AMS_BASE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/api/integrations/tarim-ai/lands`, {
    headers: { 'X-TarimAi-Key': env.AMS_INTEGRATION_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`AMS lands fetch failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as { items?: AmsLand[] };
  return body.items ?? [];
}

async function notifyAms(input: {
  landId: string;
  analysisId: string;
  landName: string;
  completedAt: string | null;
  landUsabilityScore: number | null;
  landUsabilityClassification: string | null;
}): Promise<void> {
  const env = getEnv();
  if (!env.AMS_INTEGRATION_API_KEY?.trim()) return;
  const base = env.AMS_BASE_URL.replace(/\/$/, '');
  await fetch(`${base}/api/integrations/tarim-ai/analysis-completed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-TarimAi-Key': env.AMS_INTEGRATION_API_KEY,
    },
    body: JSON.stringify({
      landId: input.landId,
      analysisId: input.analysisId,
      landName: input.landName,
      completedAt: input.completedAt,
      landUsabilityScore: input.landUsabilityScore,
      landUsabilityClassification: input.landUsabilityClassification,
    }),
  });
}

async function waitForAnalysis(
  orchestrator: AnalysisOrchestratorService,
  analysisId: string,
  timeoutMs = 10 * 60 * 1000,
): Promise<'completed' | 'partial_completed' | 'failed' | 'timeout'> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await orchestrator.getStatus(analysisId);
    if (!status) return 'failed';
    if (status.status === 'completed' || status.status === 'partial_completed') {
      return status.status;
    }
    if (status.status === 'failed') return 'failed';
    await new Promise((r) => setTimeout(r, 4000));
  }
  return 'timeout';
}

export async function runWeeklyLandAnalyses(
  orchestrator: AnalysisOrchestratorService,
  opts?: { force?: boolean },
): Promise<SchedulerState> {
  const env = getEnv();
  const intervalDays = env.WEEKLY_ANALYSIS_INTERVAL_DAYS;
  const state = readState();
  const nowIso = new Date().toISOString();

  if (!opts?.force && daysSince(state.lastRunAt) < intervalDays) {
    return state;
  }

  const results: SchedulerState['lastResults'] = [];
  let lands: AmsLand[] = [];
  try {
    lands = await fetchAmsLands();
  } catch (err) {
    results.push({
      landId: '-',
      status: 'failed',
      reason: err instanceof Error ? err.message : 'AMS fetch failed',
      at: nowIso,
    });
    const failed: SchedulerState = { lastRunAt: nowIso, lastResults: results };
    writeState(failed);
    return failed;
  }

  for (const land of lands) {
    const at = new Date().toISOString();
    const neighborhood = land.neighborhood?.trim();
    const block = land.cadastralBlock?.trim();
    const parcel = land.parcelNumber?.trim();
    if (!neighborhood || !block || !parcel) {
      results.push({
        landId: land.id,
        status: 'skipped',
        reason: 'missing parcel fields',
        at,
      });
      continue;
    }

    const cached = getLandAnalysisCache({ landId: land.id });
    if (!opts?.force && daysSince(cached?.completedAt ?? cached?.updatedAt) < intervalDays) {
      results.push({
        landId: land.id,
        analysisId: cached?.analysisId,
        status: 'skipped',
        reason: `analyzed ${Math.floor(daysSince(cached?.completedAt ?? cached?.updatedAt))}d ago`,
        at,
      });
      continue;
    }

    try {
      const created = await orchestrator.createAnalysis(
        {
          province: land.city?.trim() || 'Gaziantep',
          district: land.district?.trim() || 'Şehitkamil',
          neighborhood,
          block,
          parcel,
          landId: land.id,
        },
        null,
      );
      results.push({
        landId: land.id,
        analysisId: created.analysisId,
        status: 'started',
        at,
      });

      const finalStatus = await waitForAnalysis(orchestrator, created.analysisId);
      if (finalStatus === 'failed' || finalStatus === 'timeout') {
        results.push({
          landId: land.id,
          analysisId: created.analysisId,
          status: 'failed',
          reason: finalStatus,
          at: new Date().toISOString(),
        });
        continue;
      }

      const entry =
        getLandAnalysisCache({ landId: land.id }) ??
        listLandAnalysisCaches(20).find((x) => x.analysisId === created.analysisId) ??
        null;

      try {
        await notifyAms({
          landId: land.id,
          analysisId: created.analysisId,
          landName: land.name,
          completedAt: entry?.completedAt ?? new Date().toISOString(),
          landUsabilityScore: entry?.summary.landUsabilityScore ?? null,
          landUsabilityClassification: entry?.summary.landUsabilityClassification ?? null,
        });
      } catch {
        /* best-effort notify */
      }

      results.push({
        landId: land.id,
        analysisId: created.analysisId,
        status: 'completed',
        at: new Date().toISOString(),
      });
    } catch (err) {
      results.push({
        landId: land.id,
        status: 'failed',
        reason: err instanceof Error ? err.message : 'create failed',
        at: new Date().toISOString(),
      });
    }
  }

  const next: SchedulerState = { lastRunAt: nowIso, lastResults: results };
  writeState(next);
  return next;
}

export function startWeeklyAnalysisScheduler(
  orchestrator: AnalysisOrchestratorService,
): () => void {
  const env = getEnv();
  if (!env.WEEKLY_ANALYSIS_ENABLED) {
    return () => undefined;
  }

  const everyMs = env.WEEKLY_ANALYSIS_CHECK_MINUTES * 60 * 1000;
  const timer = setInterval(() => {
    void runWeeklyLandAnalyses(orchestrator).catch((err) => {
      console.error('[weekly-analysis] failed', err);
    });
  }, everyMs);

  // First check shortly after boot (don't block startup).
  setTimeout(() => {
    void runWeeklyLandAnalyses(orchestrator).catch((err) => {
      console.error('[weekly-analysis] startup check failed', err);
    });
  }, 15_000);

  return () => clearInterval(timer);
}
