// @ts-nocheck
import { randomUUID } from 'crypto';
import type { Pool, PoolClient } from 'pg';
import type { 
  FieldLogEntry, FieldLogInputUsage, FieldLogEvidence, 
  FieldLogObservation, FieldLogAuditEvent 
} from '../types/field-log.types.js';

export interface FieldLogRepository {
  // Transaction Management
  withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;

  // Entry CRUD
  createEntry(entry: FieldLogEntry, client?: PoolClient): Promise<void>;
  updateEntry(id: string, entry: Partial<FieldLogEntry>, client?: PoolClient): Promise<void>;
  getEntryById(id: string): Promise<FieldLogEntry | null>;
  getEntriesByParcelId(parcelId: string): Promise<FieldLogEntry[]>;
  getEntriesByProducerId(producerId: string): Promise<FieldLogEntry[]>;
  getEntriesByProductionPlanId(planId: string): Promise<FieldLogEntry[]>;
  getEntriesByProductionTaskId(taskId: string): Promise<FieldLogEntry[]>;
  deleteEntry(id: string, client?: PoolClient): Promise<void>;

  // Inputs
  addInputUsage(input: FieldLogInputUsage, client?: PoolClient): Promise<void>;
  getInputUsages(entryId: string): Promise<FieldLogInputUsage[]>;

  // Evidence
  addEvidence(evidence: FieldLogEvidence, client?: PoolClient): Promise<void>;
  getEvidenceByHash(hash: string): Promise<FieldLogEvidence[]>;

  // Observations
  addObservation(observation: FieldLogObservation, client?: PoolClient): Promise<void>;
  getObservations(entryId: string): Promise<FieldLogObservation[]>;

  addReview(entryId: string, reviewerId: string, status: string, notes: string, revisionFields?: any, client?: PoolClient): Promise<void>;

  // Audit & Revisions
  addAuditEvent(event: FieldLogAuditEvent, client?: PoolClient): Promise<void>;
  createRevision(entryId: string, changedBy: string, reason: string | null, summaryJson: any, client?: PoolClient): Promise<void>;
}

export class PostgresFieldLogRepository implements FieldLogRepository {
  constructor(private readonly pool: Pool) {}

  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private getClient(client?: PoolClient) {
    return client || this.pool;
  }

  async addReview(entryId: string, reviewerId: string, status: string, notes: string, revisionFields?: any, client?: PoolClient): Promise<void> {
    const now = new Date().toISOString();
    await this.getClient(client).query(`
      INSERT INTO fld_log_reviews (
        id, field_log_entry_id, reviewer_id, reviewer_role, status,
        review_notes, reviewed_at, revision_requested_fields, created_at, updated_at, row_version
      ) VALUES ($1, $2, $3, 'EXPERT', $4, $5, $6, $7, $6, $6, 1)
    `, [randomUUID(), entryId, reviewerId, status, notes, now, revisionFields || null]);
  }

  async createEntry(entry: FieldLogEntry, client?: PoolClient): Promise<void> {
    const q = `
      INSERT INTO fld_log_entries (
        id, entry_code, producer_id, user_id, parcel_id, 
        production_plan_id, production_task_id, crop_code, production_scenario_id, 
        operation_type, operation_date, started_at, completed_at, status, 
        performed_by, supervised_by, affected_area, affected_area_unit, 
        location_geometry, latitude, longitude, accuracy_meters, 
        weather_snapshot_id, description, producer_notes, expert_notes, 
        source, verification_status, review_status, created_at, updated_at, 
        row_version, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, 
        $29, $30, $31, $32, $33
      )
    `;
    await this.getClient(client).query(q, [
      entry.id, entry.entryCode, entry.producerId, entry.userId, entry.parcelId,
      entry.productionPlanId, entry.productionTaskId, entry.cropCode, entry.productionScenarioId,
      entry.operationType, entry.operationDate, entry.startedAt, entry.completedAt, entry.status,
      entry.performedBy, entry.supervisedBy, entry.affectedArea, entry.affectedAreaUnit,
      entry.locationGeometry, entry.latitude, entry.longitude, entry.accuracyMeters,
      entry.weatherSnapshotId, entry.description, entry.producerNotes, entry.expertNotes,
      entry.source, entry.verificationStatus, entry.reviewStatus, entry.createdAt, entry.updatedAt,
      entry.rowVersion, entry.isActive
    ]);
  }

  async updateEntry(id: string, updates: Partial<FieldLogEntry>, client?: PoolClient): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id' || value === undefined) continue;
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      setClauses.push(`${snakeKey} = $${idx}`);
      values.push(value);
      idx++;
    }

    if (setClauses.length === 0) return;

    setClauses.push(`updated_at = $${idx}`);
    values.push(new Date().toISOString());
    idx++;

    setClauses.push(`row_version = row_version + 1`);

    const q = `UPDATE fld_log_entries SET ${setClauses.join(', ')} WHERE id = $${idx}`;
    values.push(id);

    await this.getClient(client).query(q, values);
  }

  async getEntryById(id: string): Promise<FieldLogEntry | null> {
    const res = await this.pool.query('SELECT * FROM fld_log_entries WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapToCamelCase(res.rows[0]) as FieldLogEntry;
  }

  async getEntriesByParcelId(parcelId: string): Promise<FieldLogEntry[]> {
    const res = await this.pool.query('SELECT * FROM fld_log_entries WHERE parcel_id = $1 ORDER BY operation_date DESC', [parcelId]);
    return res.rows.map(r => this.mapToCamelCase(r)) as FieldLogEntry[];
  }

  async getEntriesByProducerId(producerId: string): Promise<FieldLogEntry[]> {
    const res = await this.pool.query('SELECT * FROM fld_log_entries WHERE producer_id = $1 AND is_active = true ORDER BY operation_date DESC', [producerId]);
    return res.rows.map(r => this.mapToCamelCase(r)) as FieldLogEntry[];
  }

  async getEntriesByProductionPlanId(planId: string): Promise<FieldLogEntry[]> {
    const res = await this.pool.query('SELECT * FROM fld_log_entries WHERE production_plan_id = $1 AND is_active = true ORDER BY operation_date DESC', [planId]);
    return res.rows.map(r => this.mapToCamelCase(r)) as FieldLogEntry[];
  }

  async getEntriesByProductionTaskId(taskId: string): Promise<FieldLogEntry[]> {
    const res = await this.pool.query('SELECT * FROM fld_log_entries WHERE production_task_id = $1 AND is_active = true ORDER BY operation_date DESC', [taskId]);
    return res.rows.map(r => this.mapToCamelCase(r)) as FieldLogEntry[];
  }

  async deleteEntry(id: string, client?: PoolClient): Promise<void> {
    await this.getClient(client).query('UPDATE fld_log_entries SET is_active = false, updated_at = $1 WHERE id = $2', [new Date().toISOString(), id]);
  }

  async addInputUsage(input: FieldLogInputUsage, client?: PoolClient): Promise<void> {
    const q = `
      INSERT INTO fld_log_input_usages (
        id, field_log_entry_id, input_type, product_name, commercial_name, 
        active_ingredient, registration_number, batch_number, quantity, unit_id, 
        normalized_quantity, normalized_unit_id, application_method, application_rate, 
        application_rate_unit_id, target_purpose, supplier, purchase_document_id, 
        notes, created_at, updated_at, row_version, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, $21, $22, $23
      )
    `;
    await this.getClient(client).query(q, [
      input.id, input.fieldLogEntryId, input.inputType, input.productName, input.commercialName,
      input.activeIngredient, input.registrationNumber, input.batchNumber, input.quantity, input.unitId,
      input.normalizedQuantity, input.normalizedUnitId, input.applicationMethod, input.applicationRate,
      input.applicationRateUnitId, input.targetPurpose, input.supplier, input.purchaseDocumentId,
      input.notes, input.createdAt, input.updatedAt, input.rowVersion, input.isActive
    ]);
  }

  async getInputUsages(entryId: string): Promise<FieldLogInputUsage[]> {
    const res = await this.pool.query('SELECT * FROM fld_log_input_usages WHERE field_log_entry_id = $1 AND is_active = true', [entryId]);
    return res.rows.map(r => this.mapToCamelCase(r)) as FieldLogInputUsage[];
  }

  async addEvidence(evidence: FieldLogEvidence, client?: PoolClient): Promise<void> {
    const q = `
      INSERT INTO fld_log_evidence (
        id, field_log_entry_id, evidence_type, file_name, file_type, 
        file_size, storage_path, file_hash, captured_at, uploaded_at, 
        uploaded_by, latitude, longitude, accuracy_meters, device_id, 
        description, is_primary, verification_status, created_at, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20
      )
    `;
    await this.getClient(client).query(q, [
      evidence.id, evidence.fieldLogEntryId, evidence.evidenceType, evidence.fileName, evidence.fileType,
      evidence.fileSize, evidence.storagePath, evidence.fileHash, evidence.capturedAt, evidence.uploadedAt,
      evidence.uploadedBy, evidence.latitude, evidence.longitude, evidence.accuracyMeters, evidence.deviceId,
      evidence.description, evidence.isPrimary, evidence.verificationStatus, evidence.createdAt, evidence.isActive
    ]);
  }

  async getEvidenceByHash(hash: string): Promise<FieldLogEvidence[]> {
    const res = await this.pool.query('SELECT * FROM fld_log_evidence WHERE file_hash = $1', [hash]);
    return res.rows.map(r => this.mapToCamelCase(r)) as FieldLogEvidence[];
  }

  async addObservation(observation: FieldLogObservation, client?: PoolClient): Promise<void> {
    const q = `
      INSERT INTO fld_log_observations (
        id, field_log_entry_id, observation_type, severity, description, 
        affected_area, area_unit_id, observed_at, requires_expert_review, 
        created_at, updated_at, row_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;
    await this.getClient(client).query(q, [
      observation.id, observation.fieldLogEntryId, observation.observationType, observation.severity,
      observation.description, observation.affectedArea, observation.areaUnitId, observation.observedAt,
      observation.requiresExpertReview, observation.createdAt, observation.updatedAt, observation.rowVersion
    ]);
  }

  async getObservations(entryId: string): Promise<FieldLogObservation[]> {
    const res = await this.pool.query('SELECT * FROM fld_log_observations WHERE field_log_entry_id = $1', [entryId]);
    return res.rows.map(r => this.mapToCamelCase(r)) as FieldLogObservation[];
  }

  async addAuditEvent(event: FieldLogAuditEvent, client?: PoolClient): Promise<void> {
    const q = `
      INSERT INTO fld_log_audit_events (
        id, field_log_entry_id, event_type, previous_status, new_status, 
        reason, correlation_id, request_id, user_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    await this.getClient(client).query(q, [
      event.id, event.fieldLogEntryId, event.eventType, event.previousStatus, event.newStatus,
      event.reason, event.correlationId, event.requestId, event.userId, event.createdAt
    ]);
  }

  async createRevision(entryId: string, changedBy: string, reason: string | null, summaryJson: any, client?: PoolClient): Promise<void> {
    // Determine max revision number
    const revRes = await this.getClient(client).query('SELECT COALESCE(MAX(revision_number), 0) + 1 as next_rev FROM fld_log_revisions WHERE field_log_entry_id = $1', [entryId]);
    const revisionNumber = revRes.rows[0].next_rev;

    const q = `
      INSERT INTO fld_log_revisions (
        id, field_log_entry_id, revision_number, change_reason, 
        changed_by, changed_at, change_summary_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await this.getClient(client).query(q, [
      randomUUID(), entryId, revisionNumber, reason, changedBy, new Date().toISOString(), summaryJson
    ]);
  }

  private mapToCamelCase(row: any): any {
    const result: any = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }
}

export class InMemoryFieldLogRepository implements FieldLogRepository {
  private entries: FieldLogEntry[] = [];
  private inputs: FieldLogInputUsage[] = [];
  private evidence: FieldLogEvidence[] = [];
  private audits: FieldLogAuditEvent[] = [];
  private revisions: any[] = [];
  private reviews: any[] = [];

  async addReview(entryId: string, reviewerId: string, status: string, notes: string, revisionFields?: any): Promise<void> {
    this.reviews.push({ id: randomUUID(), entryId, reviewerId, status, notes, revisionFields: revisionFields || null });
  }

  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    // Mock transaction by just calling it
    return await callback({} as PoolClient);
  }

  async createEntry(entry: FieldLogEntry): Promise<void> {
    if (this.entries.find(e => e.entryCode === entry.entryCode)) {
      throw new Error(`Duplicate entry code: ${entry.entryCode}`);
    }
    this.entries.push({ ...entry });
  }

  async updateEntry(id: string, updates: Partial<FieldLogEntry>): Promise<void> {
    const idx = this.entries.findIndex(e => e.id === id);
    if (idx !== -1) {
      this.entries[idx] = { ...this.entries[idx], ...updates, updatedAt: new Date().toISOString(), rowVersion: this.entries[idx].rowVersion + 1 };
    }
  }

  async getEntryById(id: string): Promise<FieldLogEntry | null> {
    return this.entries.find(e => e.id === id) || null;
  }

  async getEntriesByParcelId(parcelId: string): Promise<FieldLogEntry[]> {
    return this.entries.filter(e => e.parcelId === parcelId && e.isActive).sort((a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime());
  }

  async getEntriesByProducerId(producerId: string): Promise<FieldLogEntry[]> {
    return this.entries.filter(e => e.producerId === producerId && e.isActive).sort((a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime());
  }

  async getEntriesByProductionPlanId(planId: string): Promise<FieldLogEntry[]> {
    return this.entries.filter(e => e.productionPlanId === planId && e.isActive).sort((a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime());
  }

  async getEntriesByProductionTaskId(taskId: string): Promise<FieldLogEntry[]> {
    return this.entries.filter(e => e.productionTaskId === taskId && e.isActive).sort((a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime());
  }

  async deleteEntry(id: string): Promise<void> {
    const entry = await this.getEntryById(id);
    if (entry) entry.isActive = false;
  }

  async addInputUsage(input: FieldLogInputUsage): Promise<void> {
    this.inputs.push({ ...input });
  }

  async getInputUsages(entryId: string): Promise<FieldLogInputUsage[]> {
    return this.inputs.filter(i => i.fieldLogEntryId === entryId && i.isActive);
  }

  async addEvidence(evidence: FieldLogEvidence): Promise<void> {
    this.evidence.push({ ...evidence });
  }

  async getEvidenceByHash(hash: string): Promise<FieldLogEvidence[]> {
    return this.evidence.filter(e => e.fileHash === hash);
  }

  async addObservation(observation: FieldLogObservation): Promise<void> {
    // mock implementation
  }

  async getObservations(entryId: string): Promise<FieldLogObservation[]> {
    return [];
  }

  async addAuditEvent(event: FieldLogAuditEvent): Promise<void> {
    this.audits.push({ ...event });
  }

  async createRevision(entryId: string, changedBy: string, reason: string | null, summaryJson: any): Promise<void> {
    const existing = this.revisions.filter(r => r.fieldLogEntryId === entryId);
    const revisionNumber = existing.length + 1;
    this.revisions.push({
      id: randomUUID(),
      fieldLogEntryId: entryId,
      revisionNumber,
      changeReason: reason,
      changedBy,
      changedAt: new Date().toISOString(),
      changeSummaryJson: summaryJson
    });
  }
}
