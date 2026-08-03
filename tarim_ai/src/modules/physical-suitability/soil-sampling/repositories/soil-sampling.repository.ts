import type {
  ChainOfCustody,
  SamplingCampaign,
  SamplingObservation,
  SamplingPoint,
  SamplingSoilSample,
  SoilSampling,
} from '../types/soil-sampling.types.js';

export interface SoilSamplingRepository {
  listCampaigns(): Promise<SamplingCampaign[]>;
  getCampaignById(id: string): Promise<SamplingCampaign | null>;
  getCampaignByCode(code: string): Promise<SamplingCampaign | null>;
  upsertCampaign(row: SamplingCampaign): Promise<SamplingCampaign>;
  deleteCampaign(id: string): Promise<void>;

  listPoints(campaignId?: string): Promise<SamplingPoint[]>;
  getPointById(id: string): Promise<SamplingPoint | null>;
  getPointByCampaignAndCode(
    campaignId: string,
    pointCode: string,
  ): Promise<SamplingPoint | null>;
  upsertPoint(row: SamplingPoint): Promise<SamplingPoint>;
  deletePoint(id: string): Promise<void>;

  listSamples(samplingPointId?: string): Promise<SamplingSoilSample[]>;
  listSamplesByCampaignId(campaignId: string): Promise<SamplingSoilSample[]>;
  getSampleById(id: string): Promise<SamplingSoilSample | null>;
  getSampleByCode(sampleCode: string): Promise<SamplingSoilSample | null>;
  upsertSample(row: SamplingSoilSample): Promise<SamplingSoilSample>;
  deleteSample(id: string): Promise<void>;

  listObservations(samplingPointId?: string): Promise<SamplingObservation[]>;
  getObservationById(id: string): Promise<SamplingObservation | null>;
  upsertObservation(row: SamplingObservation): Promise<SamplingObservation>;
  deleteObservation(id: string): Promise<void>;

  listChainOfCustodyBySampleId(sampleId: string): Promise<ChainOfCustody[]>;
  getChainOfCustodyById(id: string): Promise<ChainOfCustody | null>;
  upsertChainOfCustody(row: ChainOfCustody): Promise<ChainOfCustody>;
  deleteChainOfCustody(id: string): Promise<void>;

  getSoilSamplingAggregate(campaignId: string): Promise<SoilSampling | null>;

  clear?(): void;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

export class InMemorySoilSamplingRepository implements SoilSamplingRepository {
  private campaigns = new Map<string, SamplingCampaign>();
  private points = new Map<string, SamplingPoint>();
  private samples = new Map<string, SamplingSoilSample>();
  private observations = new Map<string, SamplingObservation>();
  private custody = new Map<string, ChainOfCustody>();

  async listCampaigns() {
    return [...this.campaigns.values()]
      .map(clone)
      .sort((a, b) => a.campaignCode.localeCompare(b.campaignCode));
  }

  async getCampaignById(id: string) {
    const row = this.campaigns.get(id);
    return row ? clone(row) : null;
  }

  async getCampaignByCode(code: string) {
    const rows = [...this.campaigns.values()].filter((c) => c.campaignCode === code);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertCampaign(row: SamplingCampaign) {
    this.campaigns.set(row.id, clone(row));
    return clone(row);
  }

  async deleteCampaign(id: string) {
    this.campaigns.delete(id);
  }

  async listPoints(campaignId?: string) {
    return [...this.points.values()]
      .filter((p) => (campaignId ? p.campaignId === campaignId : true))
      .map(clone)
      .sort((a, b) => a.pointCode.localeCompare(b.pointCode));
  }

  async getPointById(id: string) {
    const row = this.points.get(id);
    return row ? clone(row) : null;
  }

  async getPointByCampaignAndCode(campaignId: string, pointCode: string) {
    const row = [...this.points.values()].find(
      (p) => p.campaignId === campaignId && p.pointCode === pointCode,
    );
    return row ? clone(row) : null;
  }

  async upsertPoint(row: SamplingPoint) {
    this.points.set(row.id, clone(row));
    return clone(row);
  }

  async deletePoint(id: string) {
    this.points.delete(id);
  }

  async listSamples(samplingPointId?: string) {
    return [...this.samples.values()]
      .filter((s) => (samplingPointId ? s.samplingPointId === samplingPointId : true))
      .map(clone)
      .sort((a, b) => a.sampleCode.localeCompare(b.sampleCode));
  }

  async listSamplesByCampaignId(campaignId: string) {
    const pointIds = new Set(
      [...this.points.values()].filter((p) => p.campaignId === campaignId).map((p) => p.id),
    );
    return [...this.samples.values()]
      .filter((s) => pointIds.has(s.samplingPointId))
      .map(clone)
      .sort((a, b) => a.sampleCode.localeCompare(b.sampleCode));
  }

  async getSampleById(id: string) {
    const row = this.samples.get(id);
    return row ? clone(row) : null;
  }

  async getSampleByCode(sampleCode: string) {
    const row = [...this.samples.values()].find((s) => s.sampleCode === sampleCode);
    return row ? clone(row) : null;
  }

  async upsertSample(row: SamplingSoilSample) {
    this.samples.set(row.id, clone(row));
    return clone(row);
  }

  async deleteSample(id: string) {
    this.samples.delete(id);
  }

  async listObservations(samplingPointId?: string) {
    return [...this.observations.values()]
      .filter((o) => (samplingPointId ? o.samplingPointId === samplingPointId : true))
      .map(clone)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getObservationById(id: string) {
    const row = this.observations.get(id);
    return row ? clone(row) : null;
  }

  async upsertObservation(row: SamplingObservation) {
    this.observations.set(row.id, clone(row));
    return clone(row);
  }

  async deleteObservation(id: string) {
    this.observations.delete(id);
  }

  async listChainOfCustodyBySampleId(sampleId: string) {
    return [...this.custody.values()]
      .filter((c) => c.sampleId === sampleId)
      .map(clone)
      .sort((a, b) => a.performedDate.localeCompare(b.performedDate));
  }

  async getChainOfCustodyById(id: string) {
    const row = this.custody.get(id);
    return row ? clone(row) : null;
  }

  async upsertChainOfCustody(row: ChainOfCustody) {
    this.custody.set(row.id, clone(row));
    return clone(row);
  }

  async deleteChainOfCustody(id: string) {
    this.custody.delete(id);
  }

  async getSoilSamplingAggregate(campaignId: string) {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) return null;
    const points = await this.listPoints(campaignId);
    const samples = await this.listSamplesByCampaignId(campaignId);
    const pointIds = new Set(points.map((p) => p.id));
    const observations = (await this.listObservations()).filter((o) =>
      pointIds.has(o.samplingPointId),
    );
    const sampleIds = new Set(samples.map((s) => s.id));
    const chainOfCustody = [...this.custody.values()]
      .filter((c) => sampleIds.has(c.sampleId))
      .map(clone)
      .sort((a, b) => a.performedDate.localeCompare(b.performedDate));
    return {
      campaignId,
      campaign,
      points,
      samples,
      observations,
      chainOfCustody,
    };
  }

  clear() {
    this.campaigns.clear();
    this.points.clear();
    this.samples.clear();
    this.observations.clear();
    this.custody.clear();
  }
}
