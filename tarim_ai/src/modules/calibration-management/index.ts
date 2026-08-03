import type { CropKnowledgeService } from '../crop-recommendation/services/crop-knowledge.service.js';
import {
  createCalibrationManagementRepository,
  currentPersistenceMeta,
} from '../database/persistence-factory.js';
import type { CalibrationManagementRepository } from './repositories/calibration-management.repository.js';
import { CalibrationManagementService } from './services/calibration-management.service.js';
import { CalibrationManagementController } from './controllers/calibration-management.controller.js';
import { createCalibrationManagementRouter } from './routes/calibration-management.routes.js';

export function createCalibrationManagementModule(deps: {
  cropKnowledgeService: CropKnowledgeService;
  repository?: CalibrationManagementRepository;
}) {
  const repository =
    deps.repository ?? createCalibrationManagementRepository();
  const service = new CalibrationManagementService(
    repository,
    deps.cropKnowledgeService,
  );
  const controller = new CalibrationManagementController(service);
  const router = createCalibrationManagementRouter(controller);

  return {
    router,
    service,
    controller,
    repository,
    persistence: currentPersistenceMeta(),
  };
}

export { CalibrationManagementService } from './services/calibration-management.service.js';
export {
  InMemoryCalibrationManagementRepository,
  getSharedCalibrationManagementRepository,
  resetSharedCalibrationManagementRepository,
} from './repositories/calibration-management.repository.js';
export { PostgresCalibrationManagementRepository } from './repositories/postgres-calibration-management.repository.js';
export { currentPersistenceMeta };
