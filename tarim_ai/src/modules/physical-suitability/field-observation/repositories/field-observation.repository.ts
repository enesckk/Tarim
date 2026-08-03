import type {
  FieldDeviceMeasurement,
  FieldEvidence,
  FieldEvidenceResultLink,
  FieldMeasurementDevice,
  FieldObservationPoint,
  FieldObservationResult,
  FieldParameter,
  FieldParameterOption,
  FieldSurvey,
  FieldSurveyAggregate,
  FieldSurveyReview,
} from '../types/field-observation.types.js';

export interface FieldObservationRepository {
  listSurveys(parcelId?: string, activeOnly?: boolean): Promise<FieldSurvey[]>;
  getSurveyById(id: string): Promise<FieldSurvey | null>;
  getSurveyByCode(code: string): Promise<FieldSurvey | null>;
  upsertSurvey(row: FieldSurvey): Promise<FieldSurvey>;

  listPoints(surveyId: string, activeOnly?: boolean): Promise<FieldObservationPoint[]>;
  getPointById(id: string): Promise<FieldObservationPoint | null>;
  upsertPoint(row: FieldObservationPoint): Promise<FieldObservationPoint>;

  listParameters(activeOnly?: boolean): Promise<FieldParameter[]>;
  getParameterById(id: string): Promise<FieldParameter | null>;
  getParameterByCode(code: string): Promise<FieldParameter | null>;
  upsertParameter(row: FieldParameter): Promise<FieldParameter>;

  listOptions(parameterId?: string, activeOnly?: boolean): Promise<FieldParameterOption[]>;
  getOptionById(id: string): Promise<FieldParameterOption | null>;
  upsertOption(row: FieldParameterOption): Promise<FieldParameterOption>;

  listResults(surveyId: string, activeOnly?: boolean): Promise<FieldObservationResult[]>;
  getResultById(id: string): Promise<FieldObservationResult | null>;
  upsertResult(row: FieldObservationResult): Promise<FieldObservationResult>;

  listEvidence(surveyId: string, activeOnly?: boolean): Promise<FieldEvidence[]>;
  getEvidenceById(id: string): Promise<FieldEvidence | null>;
  upsertEvidence(row: FieldEvidence): Promise<FieldEvidence>;

  listEvidenceLinks(evidenceId?: string, resultId?: string): Promise<FieldEvidenceResultLink[]>;
  upsertEvidenceLink(row: FieldEvidenceResultLink): Promise<FieldEvidenceResultLink>;

  listDevices(activeOnly?: boolean): Promise<FieldMeasurementDevice[]>;
  getDeviceById(id: string): Promise<FieldMeasurementDevice | null>;
  getDeviceByCode(code: string): Promise<FieldMeasurementDevice | null>;
  upsertDevice(row: FieldMeasurementDevice): Promise<FieldMeasurementDevice>;

  listDeviceMeasurements(resultId?: string, activeOnly?: boolean): Promise<FieldDeviceMeasurement[]>;
  upsertDeviceMeasurement(row: FieldDeviceMeasurement): Promise<FieldDeviceMeasurement>;

  listReviews(surveyId: string): Promise<FieldSurveyReview[]>;
  getLatestReview(surveyId: string): Promise<FieldSurveyReview | null>;
  upsertReview(row: FieldSurveyReview): Promise<FieldSurveyReview>;

  getParcelGeometry(parcelId: string): Promise<string | null>;
  upsertParcelGeometry(parcelId: string, geometryJson: string): Promise<void>;

  getAggregate(surveyId: string): Promise<FieldSurveyAggregate | null>;

  clear?(): void;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

export class InMemoryFieldObservationRepository implements FieldObservationRepository {
  private surveys = new Map<string, FieldSurvey>();
  private points = new Map<string, FieldObservationPoint>();
  private parameters = new Map<string, FieldParameter>();
  private options = new Map<string, FieldParameterOption>();
  private results = new Map<string, FieldObservationResult>();
  private evidence = new Map<string, FieldEvidence>();
  private evidenceLinks = new Map<string, FieldEvidenceResultLink>();
  private devices = new Map<string, FieldMeasurementDevice>();
  private deviceMeasurements = new Map<string, FieldDeviceMeasurement>();
  private reviews = new Map<string, FieldSurveyReview>();
  private parcelGeometries = new Map<string, string>();

  async listSurveys(parcelId?: string, activeOnly = true) {
    return [...this.surveys.values()]
      .filter((s) => (parcelId ? s.parcelId === parcelId : true))
      .filter((s) => (activeOnly ? s.isActive : true))
      .map(clone)
      .sort((a, b) => a.surveyCode.localeCompare(b.surveyCode));
  }

  async getSurveyById(id: string) {
    const row = this.surveys.get(id);
    return row ? clone(row) : null;
  }

  async getSurveyByCode(code: string) {
    const row = [...this.surveys.values()].find((s) => s.surveyCode === code);
    return row ? clone(row) : null;
  }

  async upsertSurvey(row: FieldSurvey) {
    this.surveys.set(row.id, clone(row));
    return clone(row);
  }

  async listPoints(surveyId: string, activeOnly = true) {
    return [...this.points.values()]
      .filter((p) => p.surveyId === surveyId)
      .filter((p) => (activeOnly ? p.isActive : true))
      .map(clone)
      .sort((a, b) => a.pointCode.localeCompare(b.pointCode));
  }

  async getPointById(id: string) {
    const row = this.points.get(id);
    return row ? clone(row) : null;
  }

  async upsertPoint(row: FieldObservationPoint) {
    this.points.set(row.id, clone(row));
    return clone(row);
  }

  async listParameters(activeOnly = true) {
    return [...this.parameters.values()]
      .filter((p) => (activeOnly ? p.isActive : true))
      .map(clone)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async getParameterById(id: string) {
    const row = this.parameters.get(id);
    return row ? clone(row) : null;
  }

  async getParameterByCode(code: string) {
    const row = [...this.parameters.values()].find((p) => p.code === code);
    return row ? clone(row) : null;
  }

  async upsertParameter(row: FieldParameter) {
    this.parameters.set(row.id, clone(row));
    return clone(row);
  }

  async listOptions(parameterId?: string, activeOnly = true) {
    return [...this.options.values()]
      .filter((o) => (parameterId ? o.parameterId === parameterId : true))
      .filter((o) => (activeOnly ? o.isActive : true))
      .map(clone)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async getOptionById(id: string) {
    const row = this.options.get(id);
    return row ? clone(row) : null;
  }

  async upsertOption(row: FieldParameterOption) {
    this.options.set(row.id, clone(row));
    return clone(row);
  }

  async listResults(surveyId: string, activeOnly = true) {
    return [...this.results.values()]
      .filter((r) => r.surveyId === surveyId)
      .filter((r) => (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getResultById(id: string) {
    const row = this.results.get(id);
    return row ? clone(row) : null;
  }

  async upsertResult(row: FieldObservationResult) {
    this.results.set(row.id, clone(row));
    return clone(row);
  }

  async listEvidence(surveyId: string, activeOnly = true) {
    return [...this.evidence.values()]
      .filter((e) => e.surveyId === surveyId)
      .filter((e) => (activeOnly ? e.isActive : true))
      .map(clone)
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
  }

  async getEvidenceById(id: string) {
    const row = this.evidence.get(id);
    return row ? clone(row) : null;
  }

  async upsertEvidence(row: FieldEvidence) {
    this.evidence.set(row.id, clone(row));
    return clone(row);
  }

  async listEvidenceLinks(evidenceId?: string, resultId?: string) {
    return [...this.evidenceLinks.values()]
      .filter((l) => (evidenceId ? l.evidenceId === evidenceId : true))
      .filter((l) => (resultId ? l.observationResultId === resultId : true))
      .map(clone);
  }

  async upsertEvidenceLink(row: FieldEvidenceResultLink) {
    this.evidenceLinks.set(row.id, clone(row));
    return clone(row);
  }

  async listDevices(activeOnly = true) {
    return [...this.devices.values()]
      .filter((d) => (activeOnly ? d.isActive : true))
      .map(clone)
      .sort((a, b) => a.deviceCode.localeCompare(b.deviceCode));
  }

  async getDeviceById(id: string) {
    const row = this.devices.get(id);
    return row ? clone(row) : null;
  }

  async getDeviceByCode(code: string) {
    const row = [...this.devices.values()].find((d) => d.deviceCode === code);
    return row ? clone(row) : null;
  }

  async upsertDevice(row: FieldMeasurementDevice) {
    this.devices.set(row.id, clone(row));
    return clone(row);
  }

  async listDeviceMeasurements(resultId?: string, activeOnly = true) {
    return [...this.deviceMeasurements.values()]
      .filter((m) => (resultId ? m.observationResultId === resultId : true))
      .filter((m) => (activeOnly ? m.isActive : true))
      .map(clone);
  }

  async upsertDeviceMeasurement(row: FieldDeviceMeasurement) {
    this.deviceMeasurements.set(row.id, clone(row));
    return clone(row);
  }

  async listReviews(surveyId: string) {
    return [...this.reviews.values()]
      .filter((r) => r.surveyId === surveyId)
      .map(clone)
      .sort((a, b) => a.reviewDate.localeCompare(b.reviewDate));
  }

  async getLatestReview(surveyId: string) {
    const rows = await this.listReviews(surveyId);
    return rows.length ? rows[rows.length - 1]! : null;
  }

  async upsertReview(row: FieldSurveyReview) {
    this.reviews.set(row.id, clone(row));
    return clone(row);
  }

  async getParcelGeometry(parcelId: string) {
    return this.parcelGeometries.get(parcelId) ?? null;
  }

  async upsertParcelGeometry(parcelId: string, geometryJson: string) {
    this.parcelGeometries.set(parcelId, geometryJson);
  }

  async getAggregate(surveyId: string) {
    const survey = await this.getSurveyById(surveyId);
    if (!survey) return null;
    return {
      survey,
      points: await this.listPoints(surveyId, false),
      results: await this.listResults(surveyId, false),
      evidence: await this.listEvidence(surveyId, false),
      reviews: await this.listReviews(surveyId),
    };
  }

  clear() {
    this.surveys.clear();
    this.points.clear();
    this.parameters.clear();
    this.options.clear();
    this.results.clear();
    this.evidence.clear();
    this.evidenceLinks.clear();
    this.devices.clear();
    this.deviceMeasurements.clear();
    this.reviews.clear();
    this.parcelGeometries.clear();
  }
}
