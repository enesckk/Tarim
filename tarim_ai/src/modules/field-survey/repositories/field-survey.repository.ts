import type { FieldSurvey, SurveyStatus } from '../types/field-survey.types.js';

export interface FieldSurveyRepository {
  create(survey: FieldSurvey): Promise<FieldSurvey>;
  update(
    survey: FieldSurvey,
    options?: { expectedVersion?: number },
  ): Promise<FieldSurvey>;
  findById(id: string): Promise<FieldSurvey | null>;
  listByParcelId(parcelId: string): Promise<FieldSurvey[]>;
  findLatestApprovedByParcelId(parcelId: string): Promise<FieldSurvey | null>;
  clear?(): void;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryFieldSurveyRepository implements FieldSurveyRepository {
  private readonly byId = new Map<string, FieldSurvey>();

  async create(survey: FieldSurvey): Promise<FieldSurvey> {
    const stored = clone(survey);
    this.byId.set(stored.id, stored);
    return clone(stored);
  }

  async update(
    survey: FieldSurvey,
    _options?: { expectedVersion?: number },
  ): Promise<FieldSurvey> {
    if (!this.byId.has(survey.id)) {
      throw new Error(`Survey not found: ${survey.id}`);
    }
    const stored = clone(survey);
    this.byId.set(stored.id, stored);
    return clone(stored);
  }

  async findById(id: string): Promise<FieldSurvey | null> {
    const found = this.byId.get(id);
    return found ? clone(found) : null;
  }

  async listByParcelId(parcelId: string): Promise<FieldSurvey[]> {
    return [...this.byId.values()]
      .filter((s) => s.parcelId === parcelId)
      .map(clone)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async findLatestApprovedByParcelId(
    parcelId: string,
  ): Promise<FieldSurvey | null> {
    const approved = [...this.byId.values()].filter(
      (s) => s.parcelId === parcelId && s.status === ('approved' as SurveyStatus),
    );
    if (approved.length === 0) {
      return null;
    }
    approved.sort((a, b) => {
      const dateA = a.approvedAt ?? a.surveyDate;
      const dateB = b.approvedAt ?? b.surveyDate;
      const cmpApproved = dateB.localeCompare(dateA);
      if (cmpApproved !== 0) return cmpApproved;
      const cmpSurveyDate = b.surveyDate.localeCompare(a.surveyDate);
      if (cmpSurveyDate !== 0) return cmpSurveyDate;
      // Deterministic tie-break: lexicographic id descending
      return b.id.localeCompare(a.id);
    });
    return clone(approved[0]!);
  }

  clear(): void {
    this.byId.clear();
  }
}

/** Deterministic mock for tests — same as in-memory, explicit naming. */
export class MockFieldSurveyRepository extends InMemoryFieldSurveyRepository {}
