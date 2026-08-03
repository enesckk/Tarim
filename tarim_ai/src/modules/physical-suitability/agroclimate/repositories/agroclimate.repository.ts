import type {
  AgroClimateAnalysis,
  AgroClimateAnalysisRun,
  AgroClimateCalculationConfig,
  AgroClimateIndicator,
  AgroClimateIndicatorResult,
  ClimateDataSource,
  ClimateObservation,
  ClimateSourceComparison,
  IndicatorCode,
  ParameterCode,
} from '../types/agroclimate.types.js';

export {
  AGROCLIMATE_INDICATOR_SEED,
  agroClimateIndicatorIdForCode,
  buildAgroClimateIndicator,
  buildAgroClimateIndicatorCatalog,
} from '../catalogs/agroclimate-indicator.catalog.js';
export type { AgroClimateIndicatorSeedDef } from '../catalogs/agroclimate-indicator.catalog.js';

export type ObservationListFilter = {
  parcelId?: string;
  zoneId?: string;
  dataSourceId?: string;
  parameterCode?: ParameterCode;
  startDate?: string;
  endDate?: string;
  activeOnly?: boolean;
};

export interface AgroClimateRepository {
  // Climate data sources
  listDataSources(activeOnly?: boolean): Promise<ClimateDataSource[]>;
  getDataSourceById(id: string): Promise<ClimateDataSource | null>;
  getDataSourceByCode(code: string): Promise<ClimateDataSource | null>;
  upsertDataSource(row: ClimateDataSource): Promise<ClimateDataSource>;

  // Climate observations
  listObservations(filter?: ObservationListFilter): Promise<ClimateObservation[]>;
  getObservationById(id: string): Promise<ClimateObservation | null>;
  /** Duplicate key: parcelId + dataSourceId + observationDate + parameterCode. */
  findDuplicateObservation(opts: {
    parcelId: string;
    dataSourceId: string;
    observationDate: string;
    parameterCode: ParameterCode;
    excludeId?: string;
  }): Promise<ClimateObservation | null>;
  upsertObservation(row: ClimateObservation): Promise<ClimateObservation>;

  // Indicator catalog
  listIndicators(activeOnly?: boolean): Promise<AgroClimateIndicator[]>;
  getIndicatorById(id: string): Promise<AgroClimateIndicator | null>;
  getIndicatorByCode(code: IndicatorCode): Promise<AgroClimateIndicator | null>;
  upsertIndicator(row: AgroClimateIndicator): Promise<AgroClimateIndicator>;

  // Calculation configuration — listed by indicatorId (optional filter)
  listCalculationConfigs(indicatorId?: string, activeOnly?: boolean): Promise<AgroClimateCalculationConfig[]>;
  getCalculationConfigById(id: string): Promise<AgroClimateCalculationConfig | null>;
  getActiveCalculationConfig(opts: {
    indicatorId: string;
    regionId: string;
    cropId?: string | null;
  }): Promise<AgroClimateCalculationConfig | null>;
  upsertCalculationConfig(row: AgroClimateCalculationConfig): Promise<AgroClimateCalculationConfig>;

  // Analysis runs — listed by parcelId (optional filter)
  listAnalysisRuns(parcelId?: string, activeOnly?: boolean): Promise<AgroClimateAnalysisRun[]>;
  getAnalysisRunById(id: string): Promise<AgroClimateAnalysisRun | null>;
  getAnalysisRunByCode(code: string): Promise<AgroClimateAnalysisRun | null>;
  upsertAnalysisRun(row: AgroClimateAnalysisRun): Promise<AgroClimateAnalysisRun>;

  // Indicator results — versioned per (analysisRunId, indicatorId).
  // Recalculating an already-run indicator MUST create a new version row;
  // it must never delete or overwrite a previous version.
  listIndicatorResultsByRun(analysisRunId: string, activeOnly?: boolean): Promise<AgroClimateIndicatorResult[]>;
  listIndicatorResultVersions(
    analysisRunId: string,
    indicatorId: string,
  ): Promise<AgroClimateIndicatorResult[]>;
  getLatestIndicatorResult(
    analysisRunId: string,
    indicatorId: string,
  ): Promise<AgroClimateIndicatorResult | null>;
  /** Always inserts a new row/version — never updates an existing result in place. */
  createIndicatorResultVersion(row: AgroClimateIndicatorResult): Promise<AgroClimateIndicatorResult>;

  // Source comparisons
  listSourceComparisons(parcelId?: string): Promise<ClimateSourceComparison[]>;
  getSourceComparisonById(id: string): Promise<ClimateSourceComparison | null>;
  upsertSourceComparison(row: ClimateSourceComparison): Promise<ClimateSourceComparison>;

  getAgroClimateAnalysisAggregate(analysisRunId: string): Promise<AgroClimateAnalysis | null>;

  clear?(): void;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryAgroClimateRepository implements AgroClimateRepository {
  private dataSources = new Map<string, ClimateDataSource>();
  private observations = new Map<string, ClimateObservation>();
  private indicators = new Map<string, AgroClimateIndicator>();
  private calculationConfigs = new Map<string, AgroClimateCalculationConfig>();
  private analysisRuns = new Map<string, AgroClimateAnalysisRun>();
  /** Keyed by result row id; multiple rows may share (analysisRunId, indicatorId) as versions. */
  private indicatorResults = new Map<string, AgroClimateIndicatorResult>();
  private sourceComparisons = new Map<string, ClimateSourceComparison>();

  // ---------------------------------------------------------------- sources --
  async listDataSources(activeOnly = true) {
    return [...this.dataSources.values()]
      .filter((s) => (activeOnly ? s.isActive : true))
      .map(clone)
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async getDataSourceById(id: string) {
    const row = this.dataSources.get(id);
    return row ? clone(row) : null;
  }

  async getDataSourceByCode(code: string) {
    const row = [...this.dataSources.values()].find((s) => s.code === code);
    return row ? clone(row) : null;
  }

  async upsertDataSource(row: ClimateDataSource) {
    this.dataSources.set(row.id, clone(row));
    return clone(row);
  }

  // ------------------------------------------------------------ observations --
  async listObservations(filter: ObservationListFilter = {}) {
    const activeOnly = filter.activeOnly ?? true;
    return [...this.observations.values()]
      .filter((o) => (filter.parcelId ? o.parcelId === filter.parcelId : true))
      .filter((o) => (filter.zoneId ? o.zoneId === filter.zoneId : true))
      .filter((o) => (filter.dataSourceId ? o.dataSourceId === filter.dataSourceId : true))
      .filter((o) => (filter.parameterCode ? o.parameterCode === filter.parameterCode : true))
      .filter((o) => (filter.startDate ? o.observationDate >= filter.startDate : true))
      .filter((o) => (filter.endDate ? o.observationDate <= filter.endDate : true))
      .filter((o) => (activeOnly ? o.isActive : true))
      .map(clone)
      .sort((a, b) => a.observationDate.localeCompare(b.observationDate) || a.parameterCode.localeCompare(b.parameterCode));
  }

  async getObservationById(id: string) {
    const row = this.observations.get(id);
    return row ? clone(row) : null;
  }

  async findDuplicateObservation(opts: {
    parcelId: string;
    dataSourceId: string;
    observationDate: string;
    parameterCode: ParameterCode;
    excludeId?: string;
  }) {
    const row = [...this.observations.values()].find(
      (o) =>
        o.isActive &&
        o.parcelId === opts.parcelId &&
        o.dataSourceId === opts.dataSourceId &&
        o.observationDate === opts.observationDate &&
        o.parameterCode === opts.parameterCode &&
        o.id !== opts.excludeId,
    );
    return row ? clone(row) : null;
  }

  async upsertObservation(row: ClimateObservation) {
    this.observations.set(row.id, clone(row));
    return clone(row);
  }

  // -------------------------------------------------------------- indicators --
  async listIndicators(activeOnly = true) {
    return [...this.indicators.values()]
      .filter((i) => (activeOnly ? i.isActive : true))
      .map(clone)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.code.localeCompare(b.code));
  }

  async getIndicatorById(id: string) {
    const row = this.indicators.get(id);
    return row ? clone(row) : null;
  }

  async getIndicatorByCode(code: IndicatorCode) {
    const row = [...this.indicators.values()].find((i) => i.code === code);
    return row ? clone(row) : null;
  }

  async upsertIndicator(row: AgroClimateIndicator) {
    this.indicators.set(row.id, clone(row));
    return clone(row);
  }

  // ---------------------------------------------------------- calc configs --
  async listCalculationConfigs(indicatorId?: string, activeOnly = true) {
    return [...this.calculationConfigs.values()]
      .filter((c) => (indicatorId ? c.indicatorId === indicatorId : true))
      .filter((c) => (activeOnly ? c.isActive : true))
      .map(clone)
      .sort((a, b) => a.indicatorId.localeCompare(b.indicatorId) || a.regionId.localeCompare(b.regionId));
  }

  async getCalculationConfigById(id: string) {
    const row = this.calculationConfigs.get(id);
    return row ? clone(row) : null;
  }

  async getActiveCalculationConfig(opts: { indicatorId: string; regionId: string; cropId?: string | null }) {
    const cropId = opts.cropId ?? null;
    const rows = [...this.calculationConfigs.values()]
      .filter(
        (c) =>
          c.isActive &&
          c.indicatorId === opts.indicatorId &&
          c.regionId === opts.regionId &&
          (cropId == null ? true : c.cropId === cropId || c.cropId == null),
      )
      .sort((a, b) => {
        // Prefer an exact crop match over a crop-agnostic (null) config.
        const aExact = cropId != null && a.cropId === cropId ? 1 : 0;
        const bExact = cropId != null && b.cropId === cropId ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    return rows.length ? clone(rows[0]!) : null;
  }

  async upsertCalculationConfig(row: AgroClimateCalculationConfig) {
    this.calculationConfigs.set(row.id, clone(row));
    return clone(row);
  }

  // ------------------------------------------------------------ analysis runs --
  async listAnalysisRuns(parcelId?: string, activeOnly = true) {
    return [...this.analysisRuns.values()]
      .filter((r) => (parcelId ? r.parcelId === parcelId : true))
      .filter((r) => (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAnalysisRunById(id: string) {
    const row = this.analysisRuns.get(id);
    return row ? clone(row) : null;
  }

  async getAnalysisRunByCode(code: string) {
    const row = [...this.analysisRuns.values()].find((r) => r.analysisCode === code);
    return row ? clone(row) : null;
  }

  async upsertAnalysisRun(row: AgroClimateAnalysisRun) {
    this.analysisRuns.set(row.id, clone(row));
    return clone(row);
  }

  // ------------------------------------------------------- indicator results --
  async listIndicatorResultsByRun(analysisRunId: string, activeOnly = true) {
    const rows = [...this.indicatorResults.values()].filter(
      (r) => r.analysisRunId === analysisRunId && (activeOnly ? r.isActive : true),
    );
    const latestByIndicator = new Map<string, AgroClimateIndicatorResult>();
    for (const row of rows) {
      const existing = latestByIndicator.get(row.indicatorId);
      if (!existing || row.version > existing.version) {
        latestByIndicator.set(row.indicatorId, row);
      }
    }
    return [...latestByIndicator.values()].map(clone).sort((a, b) => a.indicatorId.localeCompare(b.indicatorId));
  }

  async listIndicatorResultVersions(analysisRunId: string, indicatorId: string) {
    return [...this.indicatorResults.values()]
      .filter((r) => r.analysisRunId === analysisRunId && r.indicatorId === indicatorId)
      .map(clone)
      .sort((a, b) => a.version - b.version);
  }

  async getLatestIndicatorResult(analysisRunId: string, indicatorId: string) {
    const versions = await this.listIndicatorResultVersions(analysisRunId, indicatorId);
    const active = versions.filter((v) => v.isActive);
    const pool = active.length ? active : versions;
    return pool.length ? pool[pool.length - 1]! : null;
  }

  /**
   * Always creates a new version row. Recalculating an indicator for an
   * analysis run never deletes or mutates a previous version — the version
   * number is derived from the highest existing version for that
   * (analysisRunId, indicatorId) pair, defaulting to 1 for the first result.
   */
  async createIndicatorResultVersion(row: AgroClimateIndicatorResult) {
    const existingVersions = await this.listIndicatorResultVersions(row.analysisRunId, row.indicatorId);
    const nextVersion = existingVersions.length
      ? Math.max(...existingVersions.map((v) => v.version)) + 1
      : row.version || 1;
    const versioned: AgroClimateIndicatorResult = { ...row, version: nextVersion };
    this.indicatorResults.set(versioned.id, clone(versioned));
    return clone(versioned);
  }

  // ------------------------------------------------------- source comparisons --
  async listSourceComparisons(parcelId?: string) {
    return [...this.sourceComparisons.values()]
      .filter((c) => (parcelId ? c.parcelId === parcelId : true))
      .map(clone)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getSourceComparisonById(id: string) {
    const row = this.sourceComparisons.get(id);
    return row ? clone(row) : null;
  }

  async upsertSourceComparison(row: ClimateSourceComparison) {
    this.sourceComparisons.set(row.id, clone(row));
    return clone(row);
  }

  // ------------------------------------------------------------------- agg --
  async getAgroClimateAnalysisAggregate(analysisRunId: string) {
    const run = await this.getAnalysisRunById(analysisRunId);
    if (!run) return null;
    const results = await this.listIndicatorResultsByRun(analysisRunId, false);
    const comparisons = (await this.listSourceComparisons(run.parcelId)).filter(
      (c) => c.periodStart >= run.analysisPeriodStart && c.periodEnd <= run.analysisPeriodEnd,
    );
    return { run, results, comparisons };
  }

  clear() {
    this.dataSources.clear();
    this.observations.clear();
    this.indicators.clear();
    this.calculationConfigs.clear();
    this.analysisRuns.clear();
    this.indicatorResults.clear();
    this.sourceComparisons.clear();
  }
}
