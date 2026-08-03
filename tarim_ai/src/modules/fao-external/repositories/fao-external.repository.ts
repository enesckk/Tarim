import type {
  EcocropProfileSource,
  GaezCropMapping,
  GaezDataset,
  GaezLayerDefinition,
  GaezRegionalSample,
  ReviewStatus,
} from '../types/models.js';

export interface FaoExternalRepository {
  upsertEcocropProfiles(profiles: EcocropProfileSource[]): Promise<number>;
  listEcocropProfiles(filter?: {
    status?: ReviewStatus;
    ecocropId?: string;
  }): Promise<EcocropProfileSource[]>;
  getEcocropProfile(id: string): Promise<EcocropProfileSource | null>;
  updateEcocropStatus(
    id: string,
    status: ReviewStatus,
    reviewer: string,
  ): Promise<EcocropProfileSource>;

  replaceGaezDatasets(datasets: GaezDataset[]): Promise<number>;
  listGaezDatasets(filter?: {
    version?: string;
    cropCode?: string;
    active?: boolean;
  }): Promise<GaezDataset[]>;
  listGaezLayers(filter?: {
    version?: string;
    cropCode?: string;
    active?: boolean;
  }): Promise<GaezLayerDefinition[]>;

  upsertMappings(mappings: GaezCropMapping[]): Promise<number>;
  listMappings(): Promise<GaezCropMapping[]>;
  getMappingByInternalCrop(code: string): Promise<GaezCropMapping | null>;
  updateMappingStatus(
    id: string,
    status: ReviewStatus,
    reviewer: string,
  ): Promise<GaezCropMapping>;

  getSampleCache(key: string): Promise<GaezRegionalSample | null>;
  setSampleCache(key: string, sample: GaezRegionalSample): Promise<void>;

  clear?(): void;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryFaoExternalRepository implements FaoExternalRepository {
  private readonly ecocrop = new Map<string, EcocropProfileSource>();
  private readonly datasets = new Map<string, GaezDataset>();
  private readonly mappings = new Map<string, GaezCropMapping>();
  private readonly cache = new Map<string, GaezRegionalSample>();

  private ecocropKey(p: EcocropProfileSource): string {
    return `${p.ecocropId}::${p.snapshotVersion}`;
  }

  private datasetKey(d: GaezDataset): string {
    return `${d.version}::${d.datasetId}`;
  }

  async upsertEcocropProfiles(profiles: EcocropProfileSource[]): Promise<number> {
    for (const profile of profiles) {
      this.ecocrop.set(this.ecocropKey(profile), clone(profile));
    }
    return profiles.length;
  }

  async listEcocropProfiles(filter?: {
    status?: ReviewStatus;
    ecocropId?: string;
  }): Promise<EcocropProfileSource[]> {
    return [...this.ecocrop.values()]
      .filter((p) => (filter?.status ? p.status === filter.status : true))
      .filter((p) => (filter?.ecocropId ? p.ecocropId === filter.ecocropId : true))
      .map(clone);
  }

  async getEcocropProfile(id: string): Promise<EcocropProfileSource | null> {
    for (const profile of this.ecocrop.values()) {
      if (this.ecocropKey(profile) === id || profile.ecocropId === id) {
        return clone(profile);
      }
    }
    return null;
  }

  async updateEcocropStatus(
    id: string,
    status: ReviewStatus,
    reviewer: string,
  ): Promise<EcocropProfileSource> {
    const current = await this.getEcocropProfile(id);
    if (!current) throw new Error(`ECOCROP profile not found: ${id}`);
    const next: EcocropProfileSource = {
      ...current,
      status,
      reviewedBy: reviewer,
      reviewedAt: new Date().toISOString(),
    };
    this.ecocrop.set(this.ecocropKey(next), clone(next));
    return clone(next);
  }

  async replaceGaezDatasets(datasets: GaezDataset[]): Promise<number> {
    this.datasets.clear();
    for (const dataset of datasets) {
      this.datasets.set(this.datasetKey(dataset), clone(dataset));
    }
    return datasets.length;
  }

  async listGaezDatasets(filter?: {
    version?: string;
    cropCode?: string;
    active?: boolean;
  }): Promise<GaezDataset[]> {
    return [...this.datasets.values()]
      .filter((d) => (filter?.version ? d.version === filter.version : true))
      .filter((d) =>
        filter?.cropCode ? d.cropCode === filter.cropCode : true,
      )
      .filter((d) =>
        filter?.active == null ? true : d.active === filter.active,
      )
      .map(clone);
  }

  async listGaezLayers(filter?: {
    version?: string;
    cropCode?: string;
    active?: boolean;
  }): Promise<GaezLayerDefinition[]> {
    const datasets = await this.listGaezDatasets(filter);
    return datasets.map((dataset) => ({
      id: `${dataset.version}:${dataset.datasetId}`,
      gaezVersion: dataset.version,
      datasetId: dataset.datasetId,
      layerName: dataset.name,
      variable: dataset.variable,
      cropCode: dataset.cropCode,
      waterSupply: dataset.waterSupply,
      inputLevel: dataset.inputLevel,
      climateScenario: dataset.climateScenario,
      unit: dataset.unit,
      resolution: dataset.resolution ?? '0.083333°',
      serviceUrl: dataset.serviceUrl,
      active: dataset.active,
      syncedAt: dataset.syncedAt,
    }));
  }

  async upsertMappings(mappings: GaezCropMapping[]): Promise<number> {
    for (const mapping of mappings) {
      this.mappings.set(mapping.internalCropCode, clone(mapping));
    }
    return mappings.length;
  }

  async listMappings(): Promise<GaezCropMapping[]> {
    return [...this.mappings.values()].map(clone);
  }

  async getMappingByInternalCrop(code: string): Promise<GaezCropMapping | null> {
    const found = this.mappings.get(code);
    return found ? clone(found) : null;
  }

  async updateMappingStatus(
    id: string,
    status: ReviewStatus,
    reviewer: string,
  ): Promise<GaezCropMapping> {
    const current =
      [...this.mappings.values()].find((m) => m.id === id) ??
      this.mappings.get(id) ??
      null;
    if (!current) throw new Error(`Mapping not found: ${id}`);
    const next: GaezCropMapping = {
      ...current,
      reviewStatus: status,
      reviewedBy: reviewer,
      reviewedAt: new Date().toISOString(),
    };
    this.mappings.set(next.internalCropCode, clone(next));
    return clone(next);
  }

  async getSampleCache(key: string): Promise<GaezRegionalSample | null> {
    const found = this.cache.get(key);
    return found ? clone(found) : null;
  }

  async setSampleCache(key: string, sample: GaezRegionalSample): Promise<void> {
    this.cache.set(key, clone(sample));
  }

  clear(): void {
    this.ecocrop.clear();
    this.datasets.clear();
    this.mappings.clear();
    this.cache.clear();
  }
}

let sharedRepo: InMemoryFaoExternalRepository | null = null;

export function getSharedFaoExternalRepository(): InMemoryFaoExternalRepository {
  if (!sharedRepo) sharedRepo = new InMemoryFaoExternalRepository();
  return sharedRepo;
}

export function resetSharedFaoExternalRepository(): void {
  sharedRepo?.clear();
  sharedRepo = null;
}
