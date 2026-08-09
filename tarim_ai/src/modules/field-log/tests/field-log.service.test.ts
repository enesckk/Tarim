// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { FieldLogService } from '../services/field-log.service.js';
import { InMemoryFieldLogRepository } from '../repositories/field-log.repository.js';
import { randomUUID } from 'crypto';

describe('FieldLogService', () => {
  let repository: InMemoryFieldLogRepository;
  let eventBus: any;
  let service: FieldLogService;

  beforeEach(() => {
    repository = new InMemoryFieldLogRepository();
    eventBus = {
      publish: (event: string, payload: any) => {
        eventBus.publishedEvents.push({ event, payload });
      },
      publishedEvents: [] as any[]
    };
    service = new FieldLogService(repository, eventBus);
  });

  it('should create a DRAFT entry', async () => {
    const entry = await service.createDraft({
      producerId: 'producer-1',
      userId: 'user-1',
      parcelId: 'parcel-1',
      operationType: 'SOWING',
      operationDate: new Date().toISOString(),
      affectedArea: 10,
      affectedAreaUnit: 'decare'
    });

    expect(entry.id).toBeDefined();
    expect(entry.status).toBe('DRAFT');
    expect(entry.entryCode).toMatch(/^FLD-\d+-\d+$/);
    
    const fetched = await repository.getEntryById(entry.id);
    expect(fetched).toBeDefined();
    expect(fetched!.status).toBe('DRAFT');
  });

  it('should submit a DRAFT entry', async () => {
    const entry = await service.createDraft({
      producerId: 'producer-1',
      userId: 'user-1',
      parcelId: 'parcel-1',
      operationType: 'IRRIGATION',
      operationDate: new Date().toISOString()
    });

    const submitted = await service.submitLog(entry.id, 'user-1');
    expect(submitted.status).toBe('SUBMITTED');
    expect(eventBus.publishedEvents.length).toBe(1);
    expect(eventBus.publishedEvents[0].event).toBe('FIELD_LOG_SUBMITTED');
  });

  it('should allow expert to verify an entry', async () => {
    const entry = await service.createDraft({
      producerId: 'producer-1',
      userId: 'user-1',
      parcelId: 'parcel-1',
      operationType: 'IRRIGATION',
      operationDate: new Date().toISOString(),
      productionTaskId: 'task-1'
    });

    await service.submitLog(entry.id, 'user-1');
    eventBus.publishedEvents = []; // clear previous events

    const verified = await service.expertReview(entry.id, 'expert-1', 'VERIFIED', 'Looks good', null, true);
    expect(verified.status).toBe('VERIFIED');
    expect(verified.reviewStatus).toBe('VERIFIED');
    expect(verified.expertNotes).toBe('Looks good');
    
    expect(eventBus.publishedEvents.length).toBe(2);
    expect(eventBus.publishedEvents[0].event).toBe('FIELD_LOG_VERIFIED');
    expect(eventBus.publishedEvents[1].event).toBe('LINKED_TASK_COMPLETION_REQUESTED');
  });

  it('should reject verification if already verified', async () => {
    const entry = await service.createDraft({
      producerId: 'producer-1',
      userId: 'user-1',
      parcelId: 'parcel-1',
      operationType: 'IRRIGATION',
      operationDate: new Date().toISOString()
    });

    await service.submitLog(entry.id, 'user-1');
    await service.expertReview(entry.id, 'expert-1', 'VERIFIED', 'OK');

    await expect(service.expertReview(entry.id, 'expert-2', 'REJECTED', 'Wait no'))
      .rejects.toThrow('Cannot modify a verified log');
  });
});
