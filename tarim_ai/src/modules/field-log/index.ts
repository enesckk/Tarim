// @ts-nocheck
import { Router } from 'express';
import pg from 'pg';
import { getEnv } from '../../config/env.js';
import { PostgresFieldLogRepository, InMemoryFieldLogRepository } from './repositories/field-log.repository.js';
import { FieldLogService, FieldLogEventBus } from './services/field-log.service.js';
import { FieldLogEvidenceService } from './services/field-log-evidence.service.js';
import { FieldLogController } from './controllers/field-log.controller.js';
import { createFieldLogRouter } from './routes/field-log.routes.js';

import { getPool } from '../database/database-client.js';

export function createFieldLogModule(eventBus?: FieldLogEventBus): { router: Router } {
  const env = getEnv();
  
  let repository;
  if (env.PERSISTENCE_PROVIDER === 'postgresql') {
    if (!env.DATABASE_ENABLED) {
      throw new Error('DATABASE_ENABLED must be true when PERSISTENCE_PROVIDER=postgresql');
    }
    const pool = getPool();
    repository = new PostgresFieldLogRepository(pool);
  } else {
    repository = new InMemoryFieldLogRepository();
  }

  // Use a default mock event bus if none is provided
  const actualEventBus = eventBus || { publish: () => {} };

  const service = new FieldLogService(repository, actualEventBus);
  const evidenceService = new FieldLogEvidenceService(repository);
  const controller = new FieldLogController(service, evidenceService, repository);
  const router = createFieldLogRouter(controller);

  return { router };
}
