import { createFieldSurveyRepository } from '../database/persistence-factory.js';
import { currentPersistenceMeta } from '../database/persistence-factory.js';
import type { ParcelQueryService } from '../parcel/services/parcel-query.service.js';
import type { FieldSurveyRepository } from './repositories/field-survey.repository.js';
import { FieldSurveyService } from './services/field-survey.service.js';
import { FieldSurveyController } from './controllers/field-survey.controller.js';
import { createFieldSurveyRouter } from './routes/field-survey.routes.js';

export function createFieldSurveyModule(deps: {
  parcelQueryService: ParcelQueryService;
  repository?: FieldSurveyRepository;
}) {
  const repository = deps.repository ?? createFieldSurveyRepository();
  const fieldSurveyService = new FieldSurveyService(
    repository,
    deps.parcelQueryService,
  );
  const controller = new FieldSurveyController(fieldSurveyService);
  const router = createFieldSurveyRouter(controller);

  return {
    router,
    fieldSurveyService,
    repository,
    controller,
    persistence: currentPersistenceMeta(),
  };
}

export { FieldSurveyService } from './services/field-survey.service.js';
export { InMemoryFieldSurveyRepository } from './repositories/field-survey.repository.js';
export { FieldEvidenceAdapterService } from './services/field-evidence-adapter.service.js';
export { PostgresFieldSurveyRepository } from './repositories/postgres-field-survey.repository.js';
