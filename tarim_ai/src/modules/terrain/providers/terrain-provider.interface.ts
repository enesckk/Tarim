import type { DemSampleGrid, TerrainProviderInput } from '../types/terrain.types.js';

export interface TerrainProvider {
  readonly name: string;
  getDemGrid(input: TerrainProviderInput): Promise<DemSampleGrid>;
}
