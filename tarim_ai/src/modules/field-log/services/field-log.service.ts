// @ts-nocheck
import { randomUUID } from 'crypto';
import type { FieldLogRepository } from '../repositories/field-log.repository.js';
import type { 
  FieldLogEntry, FieldLogInputUsage, EntryStatus, ReviewStatus 
} from '../types/field-log.types.js';

// We mock the event bus injection here since we don't have the exact import paths
// In real life this would be injected via constructor
export interface FieldLogEventBus {
  publish(event: string, payload: any): void;
}

export class FieldLogService {
  constructor(
    private readonly repository: FieldLogRepository,
    private readonly eventBus: FieldLogEventBus
  ) {}

  async createDraft(params: Partial<FieldLogEntry> & { producerId: string, userId: string, parcelId: string, operationType: string, operationDate: string }): Promise<FieldLogEntry> {
    const entryCode = `FLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const entry: FieldLogEntry = {
      id: randomUUID(),
      entryCode,
      producerId: params.producerId,
      userId: params.userId,
      parcelId: params.parcelId,
      productionPlanId: params.productionPlanId || null,
      productionTaskId: params.productionTaskId || null,
      cropCode: params.cropCode || null,
      productionScenarioId: params.productionScenarioId || null,
      operationType: params.operationType as any,
      operationDate: params.operationDate,
      startedAt: params.startedAt || null,
      completedAt: params.completedAt || null,
      status: 'DRAFT',
      performedBy: params.performedBy || null,
      supervisedBy: params.supervisedBy || null,
      affectedArea: params.affectedArea || null,
      affectedAreaUnit: params.affectedAreaUnit || null,
      locationGeometry: params.locationGeometry || null,
      latitude: params.latitude || null,
      longitude: params.longitude || null,
      accuracyMeters: params.accuracyMeters || null,
      weatherSnapshotId: params.weatherSnapshotId || null,
      description: params.description || null,
      producerNotes: params.producerNotes || null,
      expertNotes: null,
      source: params.source || 'WEB',
      verificationStatus: 'PENDING',
      reviewStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rowVersion: 1,
      isActive: true
    };

    await this.repository.createEntry(entry);

    await this.repository.addAuditEvent({
      id: randomUUID(),
      fieldLogEntryId: entry.id,
      eventType: 'field_log.created',
      previousStatus: null,
      newStatus: 'DRAFT',
      reason: 'Draft created',
      correlationId: null,
      requestId: null,
      userId: params.userId,
      createdAt: new Date().toISOString()
    });

    return entry;
  }

  async submitLog(entryId: string, userId: string): Promise<FieldLogEntry> {
    const entry = await this.repository.getEntryById(entryId);
    if (!entry) throw new Error('Field log entry not found');

    if (entry.status !== 'DRAFT' && entry.status !== 'REVISION_REQUIRED') {
      throw new Error(`Cannot submit log from status: ${entry.status}`);
    }

    await this.repository.withTransaction(async (client) => {
      await this.repository.updateEntry(entryId, { 
        status: 'SUBMITTED', 
        reviewStatus: 'PENDING' 
      }, client);

      await this.repository.addAuditEvent({
        id: randomUUID(),
        fieldLogEntryId: entryId,
        eventType: 'field_log.submitted',
        previousStatus: entry.status,
        newStatus: 'SUBMITTED',
        reason: 'User submitted for review',
        correlationId: null,
        requestId: null,
        userId: userId,
        createdAt: new Date().toISOString()
      }, client);
    });

    this.eventBus.publish('FIELD_LOG_SUBMITTED', { entryId, producerId: entry.producerId, parcelId: entry.parcelId });

    return (await this.repository.getEntryById(entryId))!;
  }

  async expertReview(
    entryId: string, 
    reviewerId: string, 
    status: Extract<ReviewStatus, 'VERIFIED' | 'REJECTED' | 'REVISION_REQUIRED'>, 
    notes: string, 
    revisionFields?: any,
    completeLinkedTask = false
  ): Promise<FieldLogEntry> {
    const entry = await this.repository.getEntryById(entryId);
    if (!entry) throw new Error('Field log entry not found');

    if (entry.status === 'VERIFIED') {
      throw new Error('Cannot modify a verified log');
    }

    const newEntryStatus: EntryStatus = status === 'VERIFIED' ? 'VERIFIED' : (status === 'REJECTED' ? 'REJECTED' : 'REVISION_REQUIRED');

    await this.repository.withTransaction(async (client) => {
      await this.repository.updateEntry(entryId, { 
        status: newEntryStatus, 
        reviewStatus: status,
        expertNotes: notes
      }, client);

      await this.repository.addReview(entryId, reviewerId, status, notes, revisionFields, client);

      await this.repository.addAuditEvent({
        id: randomUUID(),
        fieldLogEntryId: entryId,
        eventType: `field_log.${status.toLowerCase()}`,
        previousStatus: entry.status,
        newStatus: newEntryStatus,
        reason: `Expert review: ${status}`,
        correlationId: null,
        requestId: null,
        userId: reviewerId,
        createdAt: new Date().toISOString()
      }, client);
    });

    const eventName = status === 'VERIFIED' ? 'FIELD_LOG_VERIFIED' : (status === 'REJECTED' ? 'FIELD_LOG_REJECTED' : 'FIELD_LOG_REVISION_REQUESTED');
    this.eventBus.publish(eventName, { entryId, producerId: entry.producerId });

    if (status === 'VERIFIED' && completeLinkedTask && entry.productionTaskId) {
      this.eventBus.publish('LINKED_TASK_COMPLETION_REQUESTED', {
        taskId: entry.productionTaskId,
        fieldLogEntryId: entryId,
        producerId: entry.producerId
      });
    }

    return (await this.repository.getEntryById(entryId))!;
  }

  async updateEntry(entryId: string, updates: Partial<FieldLogEntry>, userId: string): Promise<FieldLogEntry> {
    const entry = await this.repository.getEntryById(entryId);
    if (!entry) throw new Error('Field log entry not found');

    if (entry.status !== 'DRAFT') {
      throw new Error(`Cannot update log in status: ${entry.status}`);
    }

    if (entry.producerId !== userId) {
      throw new Error('Unauthorized');
    }

    await this.repository.withTransaction(async (client) => {
      await this.repository.updateEntry(entryId, updates, client);
      await this.repository.addAuditEvent({
        id: randomUUID(),
        fieldLogEntryId: entryId,
        eventType: 'field_log.updated',
        previousStatus: entry.status,
        newStatus: entry.status,
        reason: 'User updated draft',
        correlationId: null,
        requestId: null,
        userId: userId,
        createdAt: new Date().toISOString()
      }, client);
    });

    return (await this.repository.getEntryById(entryId))!;
  }

  async deleteEntry(entryId: string, userId: string): Promise<void> {
    const entry = await this.repository.getEntryById(entryId);
    if (!entry) throw new Error('Field log entry not found');

    if (entry.status !== 'DRAFT') {
      throw new Error(`Cannot delete log in status: ${entry.status}`);
    }

    if (entry.producerId !== userId) {
      throw new Error('Unauthorized');
    }

    await this.repository.withTransaction(async (client) => {
      await this.repository.deleteEntry(entryId, client);
      await this.repository.addAuditEvent({
        id: randomUUID(),
        fieldLogEntryId: entryId,
        eventType: 'field_log.deleted',
        previousStatus: entry.status,
        newStatus: 'DELETED',
        reason: 'User deleted log',
        correlationId: null,
        requestId: null,
        userId: userId,
        createdAt: new Date().toISOString()
      }, client);
    });
  }

  async cancelEntry(entryId: string, userId: string): Promise<FieldLogEntry> {
    const entry = await this.repository.getEntryById(entryId);
    if (!entry) throw new Error('Field log entry not found');

    if (entry.status === 'VERIFIED') {
      throw new Error(`Cannot cancel a verified log`);
    }

    if (entry.producerId !== userId) {
      throw new Error('Unauthorized');
    }

    await this.repository.withTransaction(async (client) => {
      await this.repository.updateEntry(entryId, { status: 'CANCELLED' }, client);
      await this.repository.addAuditEvent({
        id: randomUUID(),
        fieldLogEntryId: entryId,
        eventType: 'field_log.cancelled',
        previousStatus: entry.status,
        newStatus: 'CANCELLED',
        reason: 'User cancelled log',
        correlationId: null,
        requestId: null,
        userId: userId,
        createdAt: new Date().toISOString()
      }, client);
    });

    return (await this.repository.getEntryById(entryId))!;
  }
}
