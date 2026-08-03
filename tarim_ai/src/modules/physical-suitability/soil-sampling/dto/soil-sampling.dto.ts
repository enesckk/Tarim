/**
 * Phase 2.2F DTOs — re-exported Zod-inferred input types + aggregate read models.
 */
export type {
  SamplingCampaign,
  SamplingPoint,
  SamplingSoilSample,
  SoilSample,
  SamplingObservation,
  ChainOfCustody,
  SoilSampling,
  SamplingCampaignStatus,
  SoilSampleType,
  SamplingSampleStatus,
  SamplingObservationType,
  ChainOfCustodyAction,
} from '../types/soil-sampling.types.js';

export type {
  CreateSamplingCampaignInput,
  UpdateSamplingCampaignInput,
  CreateSamplingPointInput,
  UpdateSamplingPointInput,
  CreateSamplingSoilSampleInput,
  UpdateSamplingSoilSampleInput,
  CreateSamplingObservationInput,
  UpdateSamplingObservationInput,
  CreateChainOfCustodyInput,
  UpdateChainOfCustodyInput,
} from '../services/soil-sampling-validation.service.js';

/** Alias matching spec entity SoilSample create/update DTOs. */
export type {
  CreateSamplingSoilSampleInput as CreateSoilSampleInput,
  UpdateSamplingSoilSampleInput as UpdateSoilSampleInput,
} from '../services/soil-sampling-validation.service.js';
