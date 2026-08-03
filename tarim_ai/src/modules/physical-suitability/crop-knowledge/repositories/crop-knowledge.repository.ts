import type {
  ClimateFactor,
  ClimateRequirement,
  CropClimateRequirementsKnowledge,
  CropGeneralInformation,
  CropGrowthStage,
  CropKnowledge,
  CropKnowledgeBundle,
  CropPhenologyKnowledge,
  CropProductionCalendarKnowledge,
  CropReferencesKnowledge,
  CropRiskProfileKnowledge,
  CropScientificIdentity,
  CropSoilRequirementsKnowledge,
  CropTerrainRequirementsKnowledge,
  CropWaterRequirementsKnowledge,
  GrowthStageCode,
  SoilFactor,
  SoilRequirement,
  StageReference,
  StageTransition,
  WaterFactor,
  WaterRequirement,
  TerrainFactor,
  TerrainRequirement,
  RiskType,
  CropRisk,
  ProductionCalendar,
  ScientificReference,
  CropScientificReferenceLink,
} from '../types/crop-knowledge.types.js';

export interface CropKnowledgeRepository {
  listKnowledge(activeOnly?: boolean): Promise<CropKnowledge[]>;
  getKnowledgeById(id: string): Promise<CropKnowledge | null>;
  getKnowledgeByCropCode(cropCode: string): Promise<CropKnowledge | null>;
  upsertKnowledge(row: CropKnowledge): Promise<CropKnowledge>;

  getGeneralInformation(cropKnowledgeId: string): Promise<CropGeneralInformation | null>;
  upsertGeneralInformation(row: CropGeneralInformation): Promise<CropGeneralInformation>;
  listGeneralInformation(activeOnly?: boolean): Promise<CropGeneralInformation[]>;

  getScientificIdentity(cropKnowledgeId: string): Promise<CropScientificIdentity | null>;
  upsertScientificIdentity(row: CropScientificIdentity): Promise<CropScientificIdentity>;

  getPhenology(cropKnowledgeId: string): Promise<CropPhenologyKnowledge | null>;
  upsertPhenology(row: CropPhenologyKnowledge): Promise<CropPhenologyKnowledge>;

  listGrowthStages(cropKnowledgeId: string, activeOnly?: boolean): Promise<CropGrowthStage[]>;
  getGrowthStageById(id: string): Promise<CropGrowthStage | null>;
  getGrowthStageByCode(
    cropKnowledgeId: string,
    stageCode: GrowthStageCode,
  ): Promise<CropGrowthStage | null>;
  upsertGrowthStage(row: CropGrowthStage): Promise<CropGrowthStage>;

  listStageTransitions(
    cropKnowledgeId: string,
    activeOnly?: boolean,
  ): Promise<StageTransition[]>;
  upsertStageTransition(row: StageTransition): Promise<StageTransition>;

  listStageReferences(stageId: string, activeOnly?: boolean): Promise<StageReference[]>;
  upsertStageReference(row: StageReference): Promise<StageReference>;

  /** @deprecated Use listGrowthStages */
  listPhenologyStages(cropKnowledgeId: string, activeOnly?: boolean): Promise<CropGrowthStage[]>;
  /** @deprecated Use getGrowthStageById */
  getPhenologyStageById(id: string): Promise<CropGrowthStage | null>;
  /** @deprecated Use getGrowthStageByCode */
  getPhenologyStageByCode(
    cropKnowledgeId: string,
    code: GrowthStageCode,
  ): Promise<CropGrowthStage | null>;
  /** @deprecated Use upsertGrowthStage */
  upsertPhenologyStage(row: CropGrowthStage): Promise<CropGrowthStage>;

  getClimateRequirements(cropKnowledgeId: string): Promise<CropClimateRequirementsKnowledge | null>;
  upsertClimateRequirements(
    row: CropClimateRequirementsKnowledge,
  ): Promise<CropClimateRequirementsKnowledge>;

  listClimateRequirementItems(
    cropKnowledgeId: string,
    activeOnly?: boolean,
  ): Promise<ClimateRequirement[]>;
  getClimateRequirementById(id: string): Promise<ClimateRequirement | null>;
  getClimateRequirementByFactor(
    cropKnowledgeId: string,
    climateFactor: ClimateFactor,
  ): Promise<ClimateRequirement | null>;
  upsertClimateRequirement(row: ClimateRequirement): Promise<ClimateRequirement>;

  getSoilRequirements(cropKnowledgeId: string): Promise<CropSoilRequirementsKnowledge | null>;
  upsertSoilRequirements(row: CropSoilRequirementsKnowledge): Promise<CropSoilRequirementsKnowledge>;

  listSoilRequirementItems(
    cropKnowledgeId: string,
    activeOnly?: boolean,
  ): Promise<SoilRequirement[]>;
  getSoilRequirementById(id: string): Promise<SoilRequirement | null>;
  getSoilRequirementByFactor(
    cropKnowledgeId: string,
    soilFactor: SoilFactor,
  ): Promise<SoilRequirement | null>;
  upsertSoilRequirement(row: SoilRequirement): Promise<SoilRequirement>;

  getWaterRequirements(cropKnowledgeId: string): Promise<CropWaterRequirementsKnowledge | null>;
  upsertWaterRequirements(
    row: CropWaterRequirementsKnowledge,
  ): Promise<CropWaterRequirementsKnowledge>;

  listWaterRequirementItems(
    cropKnowledgeId: string,
    activeOnly?: boolean,
  ): Promise<WaterRequirement[]>;
  getWaterRequirementById(id: string): Promise<WaterRequirement | null>;
  getWaterRequirementByFactor(
    cropKnowledgeId: string,
    waterFactor: WaterFactor,
  ): Promise<WaterRequirement | null>;
  upsertWaterRequirement(row: WaterRequirement): Promise<WaterRequirement>;

  getTerrainRequirements(cropKnowledgeId: string): Promise<CropTerrainRequirementsKnowledge | null>;
  upsertTerrainRequirements(
    row: CropTerrainRequirementsKnowledge,
  ): Promise<CropTerrainRequirementsKnowledge>;

  listTerrainRequirementItems(
    cropKnowledgeId: string,
    activeOnly?: boolean,
  ): Promise<TerrainRequirement[]>;
  getTerrainRequirementById(id: string): Promise<TerrainRequirement | null>;
  getTerrainRequirementByFactor(
    cropKnowledgeId: string,
    terrainFactor: TerrainFactor,
  ): Promise<TerrainRequirement | null>;
  upsertTerrainRequirement(row: TerrainRequirement): Promise<TerrainRequirement>;

  getProductionCalendar(
    cropKnowledgeId: string,
  ): Promise<CropProductionCalendarKnowledge | null>;
  upsertProductionCalendar(
    row: CropProductionCalendarKnowledge,
  ): Promise<CropProductionCalendarKnowledge>;

  listProductionCalendarItems(
    cropKnowledgeId: string,
    activeOnly?: boolean,
  ): Promise<ProductionCalendar[]>;
  getProductionCalendarItemById(id: string): Promise<ProductionCalendar | null>;
  getProductionCalendarItemByRegionId(
    cropKnowledgeId: string,
    regionId: string,
  ): Promise<ProductionCalendar | null>;
  upsertProductionCalendarItem(row: ProductionCalendar): Promise<ProductionCalendar>;

  getRiskProfile(cropKnowledgeId: string): Promise<CropRiskProfileKnowledge | null>;
  upsertRiskProfile(row: CropRiskProfileKnowledge): Promise<CropRiskProfileKnowledge>;

  listCropRiskItems(cropKnowledgeId: string, activeOnly?: boolean): Promise<CropRisk[]>;
  getCropRiskById(id: string): Promise<CropRisk | null>;
  getCropRiskByType(cropKnowledgeId: string, riskType: RiskType): Promise<CropRisk | null>;
  upsertCropRisk(row: CropRisk): Promise<CropRisk>;

  getReferences(cropKnowledgeId: string): Promise<CropReferencesKnowledge | null>;
  upsertReferences(row: CropReferencesKnowledge): Promise<CropReferencesKnowledge>;

  listScientificReferences(activeOnly?: boolean): Promise<ScientificReference[]>;
  getScientificReferenceById(id: string): Promise<ScientificReference | null>;
  upsertScientificReference(row: ScientificReference): Promise<ScientificReference>;

  listCropScientificReferenceLinks(
    cropKnowledgeId: string,
    activeOnly?: boolean,
  ): Promise<CropScientificReferenceLink[]>;
  listAllCropScientificReferenceLinks(
    activeOnly?: boolean,
  ): Promise<CropScientificReferenceLink[]>;
  getCropScientificReferenceLink(
    cropKnowledgeId: string,
    scientificReferenceId: string,
  ): Promise<CropScientificReferenceLink | null>;
  upsertCropScientificReferenceLink(
    row: CropScientificReferenceLink,
  ): Promise<CropScientificReferenceLink>;

  getBundle(cropKnowledgeId: string): Promise<CropKnowledgeBundle | null>;

  clear?(): void;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

export class InMemoryCropKnowledgeRepository implements CropKnowledgeRepository {
  private knowledge = new Map<string, CropKnowledge>();
  private general = new Map<string, CropGeneralInformation>();
  private scientific = new Map<string, CropScientificIdentity>();
  private phenology = new Map<string, CropPhenologyKnowledge>();
  private growthStages = new Map<string, CropGrowthStage>();
  private transitions = new Map<string, StageTransition>();
  private stageReferences = new Map<string, StageReference>();
  private climate = new Map<string, CropClimateRequirementsKnowledge>();
  private climateItems = new Map<string, ClimateRequirement>();
  private soil = new Map<string, CropSoilRequirementsKnowledge>();
  private soilItems = new Map<string, SoilRequirement>();
  private water = new Map<string, CropWaterRequirementsKnowledge>();
  private waterItems = new Map<string, WaterRequirement>();
  private terrain = new Map<string, CropTerrainRequirementsKnowledge>();
  private terrainItems = new Map<string, TerrainRequirement>();
  private calendar = new Map<string, CropProductionCalendarKnowledge>();
  private calendarItems = new Map<string, ProductionCalendar>();
  private risk = new Map<string, CropRiskProfileKnowledge>();
  private riskItems = new Map<string, CropRisk>();
  private references = new Map<string, CropReferencesKnowledge>();
  private scientificReferences = new Map<string, ScientificReference>();
  private cropScientificReferenceLinks = new Map<string, CropScientificReferenceLink>();

  async listKnowledge(activeOnly = false) {
    return [...this.knowledge.values()]
      .filter((k) => (activeOnly ? k.isActive : true))
      .map(clone)
      .sort((a, b) => a.cropCode.localeCompare(b.cropCode));
  }

  async getKnowledgeById(id: string) {
    const row = this.knowledge.get(id);
    return row ? clone(row) : null;
  }

  async getKnowledgeByCropCode(cropCode: string) {
    const active = [...this.knowledge.values()]
      .filter((k) => k.cropCode === cropCode && k.isActive)
      .sort((a, b) => b.version - a.version);
    return active[0] ? clone(active[0]) : null;
  }

  async upsertKnowledge(row: CropKnowledge) {
    this.knowledge.set(row.id, clone(row));
    return clone(row);
  }

  private byKnowledgeId<T extends { cropKnowledgeId: string; isActive: boolean; version: number }>(
    map: Map<string, T>,
    cropKnowledgeId: string,
  ): T | null {
    const rows = [...map.values()]
      .filter((r) => r.cropKnowledgeId === cropKnowledgeId && r.isActive)
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async getGeneralInformation(cropKnowledgeId: string) {
    return this.byKnowledgeId(this.general, cropKnowledgeId);
  }

  async upsertGeneralInformation(row: CropGeneralInformation) {
    this.general.set(row.id, clone(row));
    return clone(row);
  }

  async listGeneralInformation(activeOnly = true) {
    return [...this.general.values()]
      .filter((g) => (activeOnly ? g.isActive : true))
      .map(clone)
      .sort((a, b) => a.nameTr.localeCompare(b.nameTr, 'tr'));
  }

  async getScientificIdentity(cropKnowledgeId: string) {
    return this.byKnowledgeId(this.scientific, cropKnowledgeId);
  }
  async upsertScientificIdentity(row: CropScientificIdentity) {
    this.scientific.set(row.id, clone(row));
    return clone(row);
  }

  async getPhenology(cropKnowledgeId: string) {
    return this.byKnowledgeId(this.phenology, cropKnowledgeId);
  }
  async upsertPhenology(row: CropPhenologyKnowledge) {
    this.phenology.set(row.id, clone(row));
    return clone(row);
  }

  async listGrowthStages(cropKnowledgeId: string, activeOnly = true) {
    return [...this.growthStages.values()]
      .filter((s) => s.cropKnowledgeId === cropKnowledgeId && (activeOnly ? s.isActive : true))
      .map(clone)
      .sort((a, b) => a.stageOrder - b.stageOrder || b.version - a.version);
  }

  async getGrowthStageById(id: string) {
    const row = this.growthStages.get(id);
    return row ? clone(row) : null;
  }

  async getGrowthStageByCode(cropKnowledgeId: string, stageCode: GrowthStageCode) {
    const rows = [...this.growthStages.values()]
      .filter(
        (s) => s.cropKnowledgeId === cropKnowledgeId && s.stageCode === stageCode && s.isActive,
      )
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertGrowthStage(row: CropGrowthStage) {
    this.growthStages.set(row.id, clone(row));
    return clone(row);
  }

  async listStageTransitions(cropKnowledgeId: string, activeOnly = true) {
    return [...this.transitions.values()]
      .filter((t) => t.cropKnowledgeId === cropKnowledgeId && (activeOnly ? t.isActive : true))
      .map(clone)
      .sort((a, b) => a.order - b.order);
  }

  async upsertStageTransition(row: StageTransition) {
    this.transitions.set(row.id, clone(row));
    return clone(row);
  }

  async listStageReferences(stageId: string, activeOnly = true) {
    return [...this.stageReferences.values()]
      .filter((r) => r.stageId === stageId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.scientificSource.localeCompare(b.scientificSource));
  }

  async upsertStageReference(row: StageReference) {
    this.stageReferences.set(row.id, clone(row));
    return clone(row);
  }

  listPhenologyStages(cropKnowledgeId: string, activeOnly = true) {
    return this.listGrowthStages(cropKnowledgeId, activeOnly);
  }
  getPhenologyStageById(id: string) {
    return this.getGrowthStageById(id);
  }
  getPhenologyStageByCode(cropKnowledgeId: string, code: GrowthStageCode) {
    return this.getGrowthStageByCode(cropKnowledgeId, code);
  }
  upsertPhenologyStage(row: CropGrowthStage) {
    return this.upsertGrowthStage(row);
  }

  async getClimateRequirements(cropKnowledgeId: string) {
    return this.byKnowledgeId(this.climate, cropKnowledgeId);
  }
  async upsertClimateRequirements(row: CropClimateRequirementsKnowledge) {
    this.climate.set(row.id, clone(row));
    return clone(row);
  }

  async listClimateRequirementItems(cropKnowledgeId: string, activeOnly = true) {
    return [...this.climateItems.values()]
      .filter((r) => r.cropKnowledgeId === cropKnowledgeId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.climateFactor.localeCompare(b.climateFactor));
  }

  async getClimateRequirementById(id: string) {
    const row = this.climateItems.get(id);
    return row ? clone(row) : null;
  }

  async getClimateRequirementByFactor(cropKnowledgeId: string, climateFactor: ClimateFactor) {
    const rows = [...this.climateItems.values()]
      .filter(
        (r) =>
          r.cropKnowledgeId === cropKnowledgeId &&
          r.climateFactor === climateFactor &&
          r.isActive,
      )
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertClimateRequirement(row: ClimateRequirement) {
    this.climateItems.set(row.id, clone(row));
    return clone(row);
  }

  async getSoilRequirements(cropKnowledgeId: string) {
    return this.byKnowledgeId(this.soil, cropKnowledgeId);
  }
  async upsertSoilRequirements(row: CropSoilRequirementsKnowledge) {
    this.soil.set(row.id, clone(row));
    return clone(row);
  }

  async listSoilRequirementItems(cropKnowledgeId: string, activeOnly = true) {
    return [...this.soilItems.values()]
      .filter((r) => r.cropKnowledgeId === cropKnowledgeId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.soilFactor.localeCompare(b.soilFactor));
  }

  async getSoilRequirementById(id: string) {
    const row = this.soilItems.get(id);
    return row ? clone(row) : null;
  }

  async getSoilRequirementByFactor(cropKnowledgeId: string, soilFactor: SoilFactor) {
    const rows = [...this.soilItems.values()]
      .filter(
        (r) =>
          r.cropKnowledgeId === cropKnowledgeId && r.soilFactor === soilFactor && r.isActive,
      )
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertSoilRequirement(row: SoilRequirement) {
    this.soilItems.set(row.id, clone(row));
    return clone(row);
  }

  async getWaterRequirements(cropKnowledgeId: string) {
    return this.byKnowledgeId(this.water, cropKnowledgeId);
  }
  async upsertWaterRequirements(row: CropWaterRequirementsKnowledge) {
    this.water.set(row.id, clone(row));
    return clone(row);
  }

  async listWaterRequirementItems(cropKnowledgeId: string, activeOnly = true) {
    return [...this.waterItems.values()]
      .filter((r) => r.cropKnowledgeId === cropKnowledgeId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.waterFactor.localeCompare(b.waterFactor));
  }

  async getWaterRequirementById(id: string) {
    const row = this.waterItems.get(id);
    return row ? clone(row) : null;
  }

  async getWaterRequirementByFactor(cropKnowledgeId: string, waterFactor: WaterFactor) {
    const rows = [...this.waterItems.values()]
      .filter(
        (r) =>
          r.cropKnowledgeId === cropKnowledgeId &&
          r.waterFactor === waterFactor &&
          r.isActive,
      )
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertWaterRequirement(row: WaterRequirement) {
    this.waterItems.set(row.id, clone(row));
    return clone(row);
  }

  async getTerrainRequirements(cropKnowledgeId: string) {
    return this.byKnowledgeId(this.terrain, cropKnowledgeId);
  }
  async upsertTerrainRequirements(row: CropTerrainRequirementsKnowledge) {
    this.terrain.set(row.id, clone(row));
    return clone(row);
  }

  async listTerrainRequirementItems(cropKnowledgeId: string, activeOnly = true) {
    return [...this.terrainItems.values()]
      .filter((r) => r.cropKnowledgeId === cropKnowledgeId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.terrainFactor.localeCompare(b.terrainFactor));
  }

  async getTerrainRequirementById(id: string) {
    const row = this.terrainItems.get(id);
    return row ? clone(row) : null;
  }

  async getTerrainRequirementByFactor(cropKnowledgeId: string, terrainFactor: TerrainFactor) {
    const rows = [...this.terrainItems.values()]
      .filter(
        (r) =>
          r.cropKnowledgeId === cropKnowledgeId &&
          r.terrainFactor === terrainFactor &&
          r.isActive,
      )
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertTerrainRequirement(row: TerrainRequirement) {
    this.terrainItems.set(row.id, clone(row));
    return clone(row);
  }

  async getProductionCalendar(cropKnowledgeId: string) {
    return this.byKnowledgeId(this.calendar, cropKnowledgeId);
  }
  async upsertProductionCalendar(row: CropProductionCalendarKnowledge) {
    this.calendar.set(row.id, clone(row));
    return clone(row);
  }

  async listProductionCalendarItems(cropKnowledgeId: string, activeOnly = true) {
    return [...this.calendarItems.values()]
      .filter((r) => r.cropKnowledgeId === cropKnowledgeId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.regionId.localeCompare(b.regionId));
  }

  async getProductionCalendarItemById(id: string) {
    const row = this.calendarItems.get(id);
    return row ? clone(row) : null;
  }

  async getProductionCalendarItemByRegionId(cropKnowledgeId: string, regionId: string) {
    const rows = [...this.calendarItems.values()]
      .filter(
        (r) => r.cropKnowledgeId === cropKnowledgeId && r.regionId === regionId && r.isActive,
      )
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertProductionCalendarItem(row: ProductionCalendar) {
    this.calendarItems.set(row.id, clone(row));
    return clone(row);
  }

  async getRiskProfile(cropKnowledgeId: string) {
    return this.byKnowledgeId(this.risk, cropKnowledgeId);
  }
  async upsertRiskProfile(row: CropRiskProfileKnowledge) {
    this.risk.set(row.id, clone(row));
    return clone(row);
  }

  async listCropRiskItems(cropKnowledgeId: string, activeOnly = true) {
    return [...this.riskItems.values()]
      .filter((r) => r.cropKnowledgeId === cropKnowledgeId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.riskType.localeCompare(b.riskType));
  }

  async getCropRiskById(id: string) {
    const row = this.riskItems.get(id);
    return row ? clone(row) : null;
  }

  async getCropRiskByType(cropKnowledgeId: string, riskType: RiskType) {
    const rows = [...this.riskItems.values()]
      .filter(
        (r) => r.cropKnowledgeId === cropKnowledgeId && r.riskType === riskType && r.isActive,
      )
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertCropRisk(row: CropRisk) {
    this.riskItems.set(row.id, clone(row));
    return clone(row);
  }

  async getReferences(cropKnowledgeId: string) {
    return this.byKnowledgeId(this.references, cropKnowledgeId);
  }
  async upsertReferences(row: CropReferencesKnowledge) {
    this.references.set(row.id, clone(row));
    return clone(row);
  }

  async listScientificReferences(activeOnly = true) {
    return [...this.scientificReferences.values()]
      .filter((r) => (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async getScientificReferenceById(id: string) {
    const row = this.scientificReferences.get(id);
    return row ? clone(row) : null;
  }

  async upsertScientificReference(row: ScientificReference) {
    this.scientificReferences.set(row.id, clone(row));
    return clone(row);
  }

  async listCropScientificReferenceLinks(cropKnowledgeId: string, activeOnly = true) {
    return [...this.cropScientificReferenceLinks.values()]
      .filter((r) => r.cropKnowledgeId === cropKnowledgeId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.scientificReferenceId.localeCompare(b.scientificReferenceId));
  }

  async listAllCropScientificReferenceLinks(activeOnly = true) {
    return [...this.cropScientificReferenceLinks.values()]
      .filter((r) => (activeOnly ? r.isActive : true))
      .map(clone);
  }

  async getCropScientificReferenceLink(cropKnowledgeId: string, scientificReferenceId: string) {
    const rows = [...this.cropScientificReferenceLinks.values()].filter(
      (r) =>
        r.cropKnowledgeId === cropKnowledgeId &&
        r.scientificReferenceId === scientificReferenceId &&
        r.isActive,
    );
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertCropScientificReferenceLink(row: CropScientificReferenceLink) {
    this.cropScientificReferenceLinks.set(row.id, clone(row));
    return clone(row);
  }

  async getBundle(cropKnowledgeId: string): Promise<CropKnowledgeBundle | null> {
    const knowledge = await this.getKnowledgeById(cropKnowledgeId);
    if (!knowledge) return null;
    const growthStages = await this.listGrowthStages(cropKnowledgeId, true);
    return {
      knowledge,
      generalInformation: await this.getGeneralInformation(cropKnowledgeId),
      scientificIdentity: await this.getScientificIdentity(cropKnowledgeId),
      phenology: await this.getPhenology(cropKnowledgeId),
      growthStages,
      stageTransitions: await this.listStageTransitions(cropKnowledgeId, true),
      phenologyStages: growthStages,
      climateRequirements: await this.getClimateRequirements(cropKnowledgeId),
      climateRequirementItems: await this.listClimateRequirementItems(cropKnowledgeId, true),
      soilRequirements: await this.getSoilRequirements(cropKnowledgeId),
      soilRequirementItems: await this.listSoilRequirementItems(cropKnowledgeId, true),
      waterRequirements: await this.getWaterRequirements(cropKnowledgeId),
      waterRequirementItems: await this.listWaterRequirementItems(cropKnowledgeId, true),
      terrainRequirements: await this.getTerrainRequirements(cropKnowledgeId),
      terrainRequirementItems: await this.listTerrainRequirementItems(cropKnowledgeId, true),
      productionCalendar: await this.getProductionCalendar(cropKnowledgeId),
      productionCalendarItems: await this.listProductionCalendarItems(cropKnowledgeId, true),
      riskProfile: await this.getRiskProfile(cropKnowledgeId),
      cropRiskItems: await this.listCropRiskItems(cropKnowledgeId, true),
      references: await this.getReferences(cropKnowledgeId),
      scientificReferences: await this.resolveScientificReferences(cropKnowledgeId),
    };
  }

  private async resolveScientificReferences(cropKnowledgeId: string) {
    const links = await this.listCropScientificReferenceLinks(cropKnowledgeId, true);
    const out: ScientificReference[] = [];
    for (const link of links) {
      const ref = await this.getScientificReferenceById(link.scientificReferenceId);
      if (ref && ref.isActive) out.push(ref);
    }
    return out.sort((a, b) => a.title.localeCompare(b.title));
  }

  clear() {
    this.knowledge.clear();
    this.general.clear();
    this.scientific.clear();
    this.phenology.clear();
    this.growthStages.clear();
    this.transitions.clear();
    this.stageReferences.clear();
    this.climate.clear();
    this.climateItems.clear();
    this.soil.clear();
    this.soilItems.clear();
    this.water.clear();
    this.waterItems.clear();
    this.terrain.clear();
    this.terrainItems.clear();
    this.calendar.clear();
    this.calendarItems.clear();
    this.risk.clear();
    this.riskItems.clear();
    this.references.clear();
    this.scientificReferences.clear();
    this.cropScientificReferenceLinks.clear();
  }
}
