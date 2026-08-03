import { getEnv } from '../../config/env.js';
import {
  persistenceMetaFor,
  type PersistenceProvider,
} from './database-config.js';
import { isDatabaseEnabled } from './database-client.js';
import {
  InMemoryFieldSurveyRepository,
  type FieldSurveyRepository,
} from '../field-survey/repositories/field-survey.repository.js';
import { PostgresFieldSurveyRepository } from '../field-survey/repositories/postgres-field-survey.repository.js';
import {
  InMemoryCalibrationManagementRepository,
  type CalibrationManagementRepository,
} from '../calibration-management/repositories/calibration-management.repository.js';
import { PostgresCalibrationManagementRepository } from '../calibration-management/repositories/postgres-calibration-management.repository.js';
import type { AnalysisRepository } from '../analysis-orchestrator/repositories/analysis.repository.js';
import { InMemoryAnalysisRepository } from '../analysis-orchestrator/repositories/in-memory-analysis.repository.js';
import { PostgresAnalysisRepository } from '../analysis-orchestrator/repositories/postgres-analysis.repository.js';
import {
  getSharedFaoExternalRepository,
  type FaoExternalRepository,
} from '../fao-external/repositories/fao-external.repository.js';
import type { SeasonalAnalysisRepository } from '../seasonal-crop-analysis/repositories/seasonal-analysis.repository.js';
import { InMemorySeasonalAnalysisRepository } from '../seasonal-crop-analysis/repositories/in-memory-seasonal-analysis.repository.js';
import { PostgresSeasonalAnalysisRepository } from '../seasonal-crop-analysis/repositories/postgres-seasonal-analysis.repository.js';
import { ApiError } from '../../utils/api-error.js';

let sharedAnalysisRepository: AnalysisRepository | null = null;
let sharedSeasonalAnalysisRepository: SeasonalAnalysisRepository | null = null;

export function resolvePersistenceProvider(): PersistenceProvider {
  const env = getEnv();
  if (env.PERSISTENCE_PROVIDER === 'postgresql') {
    if (!env.DATABASE_ENABLED) {
      throw new ApiError(
        500,
        'PERSISTENCE_PROVIDER=postgresql requires DATABASE_ENABLED=true',
        { code: 'DATABASE_CONFIGURATION_INVALID' },
      );
    }
    if (!env.DATABASE_URL?.trim()) {
      throw new ApiError(
        500,
        'DATABASE_URL is required for postgresql persistence',
        { code: 'DATABASE_CONFIGURATION_INVALID' },
      );
    }
    return 'postgresql';
  }
  return 'in-memory';
}

export function createFieldSurveyRepository(): FieldSurveyRepository {
  const provider = resolvePersistenceProvider();
  if (provider === 'postgresql' && isDatabaseEnabled()) {
    return new PostgresFieldSurveyRepository();
  }
  return new InMemoryFieldSurveyRepository();
}

export function createCalibrationManagementRepository(): CalibrationManagementRepository {
  const provider = resolvePersistenceProvider();
  if (provider === 'postgresql' && isDatabaseEnabled()) {
    return new PostgresCalibrationManagementRepository();
  }
  return new InMemoryCalibrationManagementRepository();
}

export function createAnalysisRepository(): AnalysisRepository {
  const provider = resolvePersistenceProvider();
  if (provider === 'postgresql' && isDatabaseEnabled()) {
    return new PostgresAnalysisRepository();
  }
  return new InMemoryAnalysisRepository();
}

export function getSharedAnalysisRepository(): AnalysisRepository {
  if (!sharedAnalysisRepository) {
    sharedAnalysisRepository = createAnalysisRepository();
  }
  return sharedAnalysisRepository;
}

export function resetSharedAnalysisRepository(): void {
  sharedAnalysisRepository?.clear?.();
  sharedAnalysisRepository = null;
}

export function createSeasonalAnalysisRepository(): SeasonalAnalysisRepository {
  const provider = resolvePersistenceProvider();
  if (provider === 'postgresql' && isDatabaseEnabled()) {
    return new PostgresSeasonalAnalysisRepository();
  }
  return new InMemorySeasonalAnalysisRepository();
}

export function getSharedSeasonalAnalysisRepository(): SeasonalAnalysisRepository {
  if (!sharedSeasonalAnalysisRepository) {
    sharedSeasonalAnalysisRepository = createSeasonalAnalysisRepository();
  }
  return sharedSeasonalAnalysisRepository;
}

export function resetSharedSeasonalAnalysisRepository(): void {
  sharedSeasonalAnalysisRepository?.clear?.();
  sharedSeasonalAnalysisRepository = null;
}

/** FAO ECOCROP/GAEZ reference store (in-memory + JSON mirror; PG schema in 014). */
export function createFaoExternalRepository(): FaoExternalRepository {
  return getSharedFaoExternalRepository();
}

export function currentPersistenceMeta() {
  const provider = resolvePersistenceProvider();
  const meta = persistenceMetaFor(provider);
  return {
    ...meta,
    /** Backward-compatible repositoryType label used by older field-survey clients. */
    repositoryType: provider === 'in-memory' ? 'in_memory' : 'postgresql',
  };
}
