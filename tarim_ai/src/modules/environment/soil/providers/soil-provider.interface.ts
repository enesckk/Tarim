import type { SoilProfile, SoilProviderInput } from '../types/soil.types.js';

export interface SoilProvider {
  readonly name: string;
  getProfile(input: SoilProviderInput): Promise<SoilProfile>;
}
