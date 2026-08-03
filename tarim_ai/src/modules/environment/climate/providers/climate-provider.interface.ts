import type { ClimateProfile, ClimateProviderInput } from '../types/climate.types.js';

export interface ClimateProvider {
  readonly name: string;
  getProfile(input: ClimateProviderInput): Promise<ClimateProfile>;
}
