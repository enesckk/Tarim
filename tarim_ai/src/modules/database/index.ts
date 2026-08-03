import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { DatabaseHealthService } from './database-health.service.js';
import { getDatabaseConfig, isDatabaseEnabled } from './database-client.js';

export function createDatabaseHealthRouter(): Router {
  const router = createRouter();
  const service = new DatabaseHealthService();

  router.get('/database', async (_req, res, next) => {
    try {
      const config = getDatabaseConfig();
      if (!isDatabaseEnabled() || config.provider === 'in-memory') {
        res.json({
          status: 'disabled',
          provider: 'in-memory',
        });
        return;
      }
      res.json(await service.getStatus());
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export { DatabaseHealthService } from './database-health.service.js';
export {
  closePool,
  getPool,
  isDatabaseEnabled,
  query,
  resetDatabaseClient,
  withTransaction,
  checkConnectivity,
} from './database-client.js';
export {
  migrateUp,
  getMigrationStatus,
  runMigrationsCli,
  listMigrationFiles,
} from './migrations/runner.js';
export {
  createFieldSurveyRepository,
  createCalibrationManagementRepository,
  currentPersistenceMeta,
  resolvePersistenceProvider,
} from './persistence-factory.js';
export {
  persistenceMetaFor,
  resolveDatabaseConfig,
} from './database-config.js';
