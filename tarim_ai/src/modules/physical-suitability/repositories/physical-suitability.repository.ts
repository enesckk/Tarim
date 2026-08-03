import { randomUUID } from 'node:crypto';
import type {
  AgroClimaticRegion,
  AuditEvent,
  CriterionDefinition,
  CropCriterionRule,
  CropProfile,
  CriticalBarrierRule,
  DataSourcePriority,
  ProductionScenario,
  SourceReference,
  SourceType,
} from '../types/physical-suitability.types.js';

export interface PhysicalSuitabilityRepository {
  listCrops(): Promise<CropProfile[]>;
  getCropById(id: string): Promise<CropProfile | null>;
  getCropByCode(code: string): Promise<CropProfile | null>;
  upsertCrop(crop: CropProfile): Promise<CropProfile>;

  listScenarios(cropId?: string): Promise<ProductionScenario[]>;
  getScenarioById(id: string): Promise<ProductionScenario | null>;
  upsertScenario(scenario: ProductionScenario): Promise<ProductionScenario>;

  listCriteria(): Promise<CriterionDefinition[]>;
  getCriterionByCode(code: string): Promise<CriterionDefinition | null>;
  upsertCriterion(criterion: CriterionDefinition): Promise<CriterionDefinition>;

  listRules(filter?: {
    cropId?: string;
    productionScenarioId?: string;
    activeOnly?: boolean;
  }): Promise<CropCriterionRule[]>;
  getRuleById(id: string): Promise<CropCriterionRule | null>;
  upsertRule(rule: CropCriterionRule): Promise<CropCriterionRule>;
  deactivateRule(id: string): Promise<CropCriterionRule | null>;

  listBarrierRules(filter?: {
    cropId?: string;
    productionScenarioId?: string;
    activeOnly?: boolean;
  }): Promise<CriticalBarrierRule[]>;
  upsertBarrierRule(rule: CriticalBarrierRule): Promise<CriticalBarrierRule>;

  listSourceReferences(): Promise<SourceReference[]>;
  getSourceReference(id: string): Promise<SourceReference | null>;
  upsertSourceReference(ref: SourceReference): Promise<SourceReference>;

  listRegions(): Promise<AgroClimaticRegion[]>;
  upsertRegion(region: AgroClimaticRegion): Promise<AgroClimaticRegion>;

  listDataSourcePriorities(criterionCode?: string): Promise<DataSourcePriority[]>;
  upsertDataSourcePriority(row: DataSourcePriority): Promise<DataSourcePriority>;

  appendAudit(event: AuditEvent): Promise<AuditEvent>;
  listAudit(entityId?: string): Promise<AuditEvent[]>;

  clear?(): void;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

export class InMemoryPhysicalSuitabilityRepository
  implements PhysicalSuitabilityRepository
{
  private crops = new Map<string, CropProfile>();
  private scenarios = new Map<string, ProductionScenario>();
  private criteria = new Map<string, CriterionDefinition>();
  private rules = new Map<string, CropCriterionRule>();
  private barriers = new Map<string, CriticalBarrierRule>();
  private sources = new Map<string, SourceReference>();
  private regions = new Map<string, AgroClimaticRegion>();
  private priorities = new Map<string, DataSourcePriority>();
  private audits: AuditEvent[] = [];

  async listCrops(): Promise<CropProfile[]> {
    return [...this.crops.values()].map(clone).sort((a, b) => a.code.localeCompare(b.code));
  }
  async getCropById(id: string) {
    const c = this.crops.get(id);
    return c ? clone(c) : null;
  }
  async getCropByCode(code: string) {
    const found = [...this.crops.values()].find((c) => c.code === code);
    return found ? clone(found) : null;
  }
  async upsertCrop(crop: CropProfile) {
    this.crops.set(crop.id, clone(crop));
    return clone(crop);
  }

  async listScenarios(cropId?: string) {
    return [...this.scenarios.values()]
      .filter((s) => (cropId ? s.cropId === cropId : true))
      .map(clone);
  }
  async getScenarioById(id: string) {
    const s = this.scenarios.get(id);
    return s ? clone(s) : null;
  }
  async upsertScenario(scenario: ProductionScenario) {
    this.scenarios.set(scenario.id, clone(scenario));
    return clone(scenario);
  }

  async listCriteria() {
    return [...this.criteria.values()].map(clone).sort((a, b) => a.code.localeCompare(b.code));
  }
  async getCriterionByCode(code: string) {
    const found = [...this.criteria.values()].find((c) => c.code === code);
    return found ? clone(found) : null;
  }
  async upsertCriterion(criterion: CriterionDefinition) {
    this.criteria.set(criterion.id, clone(criterion));
    return clone(criterion);
  }

  async listRules(filter?: {
    cropId?: string;
    productionScenarioId?: string;
    activeOnly?: boolean;
  }) {
    return [...this.rules.values()]
      .filter((r) => (filter?.cropId ? r.cropId === filter.cropId : true))
      .filter((r) =>
        filter?.productionScenarioId
          ? r.productionScenarioId === filter.productionScenarioId
          : true,
      )
      .filter((r) => (filter?.activeOnly ? r.isActive : true))
      .map(clone);
  }
  async getRuleById(id: string) {
    const r = this.rules.get(id);
    return r ? clone(r) : null;
  }
  async upsertRule(rule: CropCriterionRule) {
    this.rules.set(rule.id, clone(rule));
    return clone(rule);
  }
  async deactivateRule(id: string) {
    const r = this.rules.get(id);
    if (!r) return null;
    const next = { ...r, isActive: false, updatedHint: true } as CropCriterionRule;
    this.rules.set(id, next);
    return clone(next);
  }

  async listBarrierRules(filter?: {
    cropId?: string;
    productionScenarioId?: string;
    activeOnly?: boolean;
  }) {
    return [...this.barriers.values()]
      .filter((r) => (filter?.cropId ? r.cropId === filter.cropId : true))
      .filter((r) =>
        filter?.productionScenarioId
          ? r.productionScenarioId === filter.productionScenarioId
          : true,
      )
      .filter((r) => (filter?.activeOnly ? r.isActive : true))
      .map(clone);
  }
  async upsertBarrierRule(rule: CriticalBarrierRule) {
    this.barriers.set(rule.id, clone(rule));
    return clone(rule);
  }

  async listSourceReferences() {
    return [...this.sources.values()].map(clone);
  }
  async getSourceReference(id: string) {
    const s = this.sources.get(id);
    return s ? clone(s) : null;
  }
  async upsertSourceReference(ref: SourceReference) {
    this.sources.set(ref.id, clone(ref));
    return clone(ref);
  }

  async listRegions() {
    return [...this.regions.values()].map(clone);
  }
  async upsertRegion(region: AgroClimaticRegion) {
    this.regions.set(region.id, clone(region));
    return clone(region);
  }

  async listDataSourcePriorities(criterionCode?: string) {
    return [...this.priorities.values()]
      .filter((p) => (criterionCode ? p.criterionCode === criterionCode : true))
      .map(clone)
      .sort((a, b) => a.priorityRank - b.priorityRank);
  }
  async upsertDataSourcePriority(row: DataSourcePriority) {
    this.priorities.set(row.id, clone(row));
    return clone(row);
  }

  async appendAudit(event: AuditEvent) {
    this.audits.push(clone(event));
    return clone(event);
  }
  async listAudit(entityId?: string) {
    return this.audits
      .filter((a) => (entityId ? a.entityId === entityId : true))
      .map(clone);
  }

  clear() {
    this.crops.clear();
    this.scenarios.clear();
    this.criteria.clear();
    this.rules.clear();
    this.barriers.clear();
    this.sources.clear();
    this.regions.clear();
    this.priorities.clear();
    this.audits.length = 0;
  }
}

export function newId(): string {
  return randomUUID();
}

export const DEFAULT_SOURCE_PRIORITY_ORDER: SourceType[] = [
  'Laboratory',
  'FieldMeasurement',
  'OfficialLocal',
  'RemoteSensing',
  'GlobalModel',
  'UserDeclared',
];
