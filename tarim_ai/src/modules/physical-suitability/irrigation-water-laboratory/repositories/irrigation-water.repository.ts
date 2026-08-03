import type { MeasurementUnit } from '../../soil-laboratory/types/soil-parameter.types.js';
import type {
  IrrigationWaterAnalysis,
  WaterAnalysisResult,
  WaterDerivedIndicator,
  WaterParameter,
  WaterSample,
  WaterSampleChainOfCustody,
  WaterSource,
} from '../types/irrigation-water.types.js';

export interface IrrigationWaterRepository {
  listWaterSources(parcelId?: string, activeOnly?: boolean): Promise<WaterSource[]>;
  getWaterSourceById(id: string): Promise<WaterSource | null>;
  getWaterSourceByCode(code: string): Promise<WaterSource | null>;
  upsertWaterSource(row: WaterSource): Promise<WaterSource>;

  listWaterSamples(waterSourceId?: string, activeOnly?: boolean): Promise<WaterSample[]>;
  getWaterSampleById(id: string): Promise<WaterSample | null>;
  getWaterSampleByCode(sampleCode: string): Promise<WaterSample | null>;
  upsertWaterSample(row: WaterSample): Promise<WaterSample>;

  listWaterParameters(activeOnly?: boolean): Promise<WaterParameter[]>;
  getWaterParameterById(id: string): Promise<WaterParameter | null>;
  getWaterParameterByCode(code: string): Promise<WaterParameter | null>;
  upsertWaterParameter(row: WaterParameter): Promise<WaterParameter>;

  listMeasurementUnits(activeOnly?: boolean): Promise<MeasurementUnit[]>;
  getMeasurementUnitById(id: string): Promise<MeasurementUnit | null>;
  getMeasurementUnitByCode(code: string): Promise<MeasurementUnit | null>;
  upsertMeasurementUnit(row: MeasurementUnit): Promise<MeasurementUnit>;

  listWaterAnalysisResults(sampleId?: string, activeOnly?: boolean): Promise<WaterAnalysisResult[]>;
  getWaterAnalysisResultById(id: string): Promise<WaterAnalysisResult | null>;
  findDuplicateWaterAnalysisResult(opts: {
    sampleId: string;
    parameterId: string;
    analysisMethodId: string | null;
    excludeId?: string;
  }): Promise<WaterAnalysisResult | null>;
  upsertWaterAnalysisResult(row: WaterAnalysisResult): Promise<WaterAnalysisResult>;

  listDerivedIndicators(sampleId: string, activeOnly?: boolean): Promise<WaterDerivedIndicator[]>;
  getDerivedIndicatorBySampleAndCode(
    sampleId: string,
    indicatorCode: string,
  ): Promise<WaterDerivedIndicator | null>;
  upsertDerivedIndicator(row: WaterDerivedIndicator): Promise<WaterDerivedIndicator>;

  listChainOfCustody(sampleId: string): Promise<WaterSampleChainOfCustody[]>;
  getChainOfCustodyById(id: string): Promise<WaterSampleChainOfCustody | null>;
  upsertChainOfCustody(row: WaterSampleChainOfCustody): Promise<WaterSampleChainOfCustody>;

  getIrrigationWaterAnalysisAggregate(sourceId: string): Promise<IrrigationWaterAnalysis | null>;

  clear?(): void;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

export class InMemoryIrrigationWaterRepository implements IrrigationWaterRepository {
  private sources = new Map<string, WaterSource>();
  private samples = new Map<string, WaterSample>();
  private parameters = new Map<string, WaterParameter>();
  private units = new Map<string, MeasurementUnit>();
  private results = new Map<string, WaterAnalysisResult>();
  private derived = new Map<string, WaterDerivedIndicator>();
  private custody = new Map<string, WaterSampleChainOfCustody>();

  async listWaterSources(parcelId?: string, activeOnly = true) {
    return [...this.sources.values()]
      .filter((s) => (parcelId ? s.parcelId === parcelId : true))
      .filter((s) => (activeOnly ? s.isActive : true))
      .map(clone)
      .sort((a, b) => a.sourceCode.localeCompare(b.sourceCode));
  }

  async getWaterSourceById(id: string) {
    const row = this.sources.get(id);
    return row ? clone(row) : null;
  }

  async getWaterSourceByCode(code: string) {
    const row = [...this.sources.values()].find((s) => s.sourceCode === code && s.isActive);
    return row ? clone(row) : null;
  }

  async upsertWaterSource(row: WaterSource) {
    this.sources.set(row.id, clone(row));
    return clone(row);
  }

  async listWaterSamples(waterSourceId?: string, activeOnly = true) {
    return [...this.samples.values()]
      .filter((s) => (waterSourceId ? s.waterSourceId === waterSourceId : true))
      .filter((s) => (activeOnly ? s.isActive : true))
      .map(clone)
      .sort((a, b) => a.sampleCode.localeCompare(b.sampleCode));
  }

  async getWaterSampleById(id: string) {
    const row = this.samples.get(id);
    return row ? clone(row) : null;
  }

  async getWaterSampleByCode(sampleCode: string) {
    const row = [...this.samples.values()].find((s) => s.sampleCode === sampleCode);
    return row ? clone(row) : null;
  }

  async upsertWaterSample(row: WaterSample) {
    this.samples.set(row.id, clone(row));
    return clone(row);
  }

  async listWaterParameters(activeOnly = true) {
    return [...this.parameters.values()]
      .filter((p) => (activeOnly ? p.isActive : true))
      .map(clone)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.code.localeCompare(b.code));
  }

  async getWaterParameterById(id: string) {
    const row = this.parameters.get(id);
    return row ? clone(row) : null;
  }

  async getWaterParameterByCode(code: string) {
    const row = [...this.parameters.values()].find((p) => p.code === code);
    return row ? clone(row) : null;
  }

  async upsertWaterParameter(row: WaterParameter) {
    this.parameters.set(row.id, clone(row));
    return clone(row);
  }

  async listMeasurementUnits(activeOnly = true) {
    return [...this.units.values()]
      .filter((u) => (activeOnly ? u.isActive : true))
      .map(clone)
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async getMeasurementUnitById(id: string) {
    const row = this.units.get(id);
    return row ? clone(row) : null;
  }

  async getMeasurementUnitByCode(code: string) {
    const row = [...this.units.values()].find((u) => u.code === code);
    return row ? clone(row) : null;
  }

  async upsertMeasurementUnit(row: MeasurementUnit) {
    this.units.set(row.id, clone(row));
    return clone(row);
  }

  async listWaterAnalysisResults(sampleId?: string, activeOnly = true) {
    return [...this.results.values()]
      .filter((r) => (sampleId ? r.sampleId === sampleId : true))
      .filter((r) => (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getWaterAnalysisResultById(id: string) {
    const row = this.results.get(id);
    return row ? clone(row) : null;
  }

  async findDuplicateWaterAnalysisResult(opts: {
    sampleId: string;
    parameterId: string;
    analysisMethodId: string | null;
    excludeId?: string;
  }) {
    const row = [...this.results.values()].find(
      (r) =>
        r.isActive &&
        r.sampleId === opts.sampleId &&
        r.parameterId === opts.parameterId &&
        (r.analysisMethodId ?? null) === (opts.analysisMethodId ?? null) &&
        r.id !== opts.excludeId,
    );
    return row ? clone(row) : null;
  }

  async upsertWaterAnalysisResult(row: WaterAnalysisResult) {
    this.results.set(row.id, clone(row));
    return clone(row);
  }

  async listDerivedIndicators(sampleId: string, activeOnly = true) {
    return [...this.derived.values()]
      .filter((d) => d.sampleId === sampleId)
      .filter((d) => (activeOnly ? d.isActive : true))
      .map(clone)
      .sort((a, b) => a.indicatorCode.localeCompare(b.indicatorCode));
  }

  async getDerivedIndicatorBySampleAndCode(sampleId: string, indicatorCode: string) {
    const row = [...this.derived.values()].find(
      (d) => d.sampleId === sampleId && d.indicatorCode === indicatorCode && d.isActive,
    );
    return row ? clone(row) : null;
  }

  async upsertDerivedIndicator(row: WaterDerivedIndicator) {
    this.derived.set(row.id, clone(row));
    return clone(row);
  }

  async listChainOfCustody(sampleId: string) {
    return [...this.custody.values()]
      .filter((c) => c.sampleId === sampleId)
      .map(clone)
      .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  }

  async getChainOfCustodyById(id: string) {
    const row = this.custody.get(id);
    return row ? clone(row) : null;
  }

  async upsertChainOfCustody(row: WaterSampleChainOfCustody) {
    this.custody.set(row.id, clone(row));
    return clone(row);
  }

  async getIrrigationWaterAnalysisAggregate(sourceId: string) {
    const waterSource = await this.getWaterSourceById(sourceId);
    if (!waterSource) return null;
    const samples = await this.listWaterSamples(sourceId, false);
    const sampleIds = new Set(samples.map((s) => s.id));
    const results = (await this.listWaterAnalysisResults(undefined, false)).filter((r) =>
      sampleIds.has(r.sampleId),
    );
    const derivedIndicators = [...this.derived.values()]
      .filter((d) => sampleIds.has(d.sampleId))
      .map(clone);
    const chainOfCustody = [...this.custody.values()]
      .filter((c) => sampleIds.has(c.sampleId))
      .map(clone)
      .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
    return {
      waterSource,
      samples,
      results,
      derivedIndicators,
      chainOfCustody,
    };
  }

  clear() {
    this.sources.clear();
    this.samples.clear();
    this.parameters.clear();
    this.units.clear();
    this.results.clear();
    this.derived.clear();
    this.custody.clear();
  }
}
