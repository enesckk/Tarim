export type {
  EcocropProfileSource,
  GaezDataset,
  GaezCropMapping,
  GaezLayerDefinition,
  GaezRegionalSample,
  GaezComparisonResult,
} from './types/models.js';
export {
  parseEcocropCrop,
  importEcocropSnapshot,
  assertApprovedForKnowledgeUse,
} from './ecocrop/parse.js';
export {
  reviewEcocropProfile,
  selectApprovedEcocropForKnowledge,
} from './ecocrop/review.js';
export { syncGaezV4Catalog, sampleGaezPoint } from './gaez/catalog-client.js';
export {
  getGaezRegionalSample,
  InMemoryGaezSampleCache,
  repositorySampleCache,
} from './gaez/regional-sample.js';
export {
  compareLocalWithGaez,
  buildCacheKey,
  geometryHash,
  publicGaezError,
  createDraftMapping,
  REGIONAL_RESOLUTION_LIMITATION,
} from './gaez/core.js';
export {
  resolveLayersForCrop,
  classifyGaezVariable,
  suitabilityIndexToClass,
} from './gaez/layer-resolver.js';
export {
  buildPilotDraftMappings,
  buildPilotReport,
  resolveInternalCropCode,
} from './mapping/pilot-crops.js';
export {
  validateCropMapping,
  reviewCropMapping,
  assertMappingApprovedForSampling,
} from './mapping/validation.js';
export {
  getSharedFaoExternalRepository,
  resetSharedFaoExternalRepository,
  InMemoryFaoExternalRepository,
} from './repositories/fao-external.repository.js';
export { buildCompletenessReport } from './audit/completeness.js';
