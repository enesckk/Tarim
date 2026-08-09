// @ts-nocheck
import type { Request, Response } from 'express';
import { FieldLogService } from '../services/field-log.service.js';
import { FieldLogEvidenceService } from '../services/field-log-evidence.service.js';
import { FieldLogRepository } from '../repositories/field-log.repository.js';
import { createFieldLogSchema, expertReviewSchema, updateFieldLogSchema, addObservationSchema } from '../schemas/field-log.schemas.js';
import { randomUUID } from 'crypto';

export class FieldLogController {
  constructor(
    private readonly service: FieldLogService,
    private readonly evidenceService: FieldLogEvidenceService,
    private readonly repository: FieldLogRepository
  ) {}

  async createEntry(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createFieldLogSchema.parse(req.body);
      const userId = req.headers['x-user-id']?.toString() || 'default-user';
      const producerId = req.headers['x-producer-id']?.toString() || 'default-producer';

      const entry = await this.service.createDraft({
        ...parsed,
        operationType: parsed.operationType as any,
        userId,
        producerId
      });

      res.status(201).json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async submitEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id']?.toString() || 'default-user';
      const entry = await this.service.submitLog(id!, userId);
      res.status(200).json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = updateFieldLogSchema.parse(req.body);
      const userId = req.headers['x-user-id']?.toString() || 'default-user';

      const entry = await this.service.updateEntry(id!, parsed as any, userId);
      res.status(200).json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id']?.toString() || 'default-user';
      await this.service.deleteEntry(id!, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async cancelEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id']?.toString() || 'default-user';
      const entry = await this.service.cancelEntry(id!, userId);
      res.status(200).json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async expertReview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = expertReviewSchema.parse(req.body);
      const reviewerId = req.headers['x-user-id']?.toString() || 'default-user';

      const entry = await this.service.expertReview(
        id!, 
        reviewerId, 
        parsed.status, 
        parsed.reviewNotes || '', 
        parsed.revisionRequestedFields,
        parsed.completeLinkedTask
      );

      res.status(200).json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getEntries(req: Request, res: Response): Promise<void> {
    try {
      const parcelId = req.query.parcelId?.toString();
      const producerId = req.query.producerId?.toString();
      const planId = req.query.planId?.toString();
      const taskId = req.query.taskId?.toString();
      
      let entries = [];
      if (parcelId) {
        entries = await this.repository.getEntriesByParcelId(parcelId);
      } else if (producerId) {
        entries = await this.repository.getEntriesByProducerId(producerId);
      } else if (planId) {
        entries = await this.repository.getEntriesByProductionPlanId(planId);
      } else if (taskId) {
        entries = await this.repository.getEntriesByProductionTaskId(taskId);
      } else {
        res.status(400).json({ error: 'Must provide parcelId, producerId, planId, or taskId' });
        return;
      }
      
      res.status(200).json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async exportEntries(req: Request, res: Response): Promise<void> {
    try {
      const parcelId = req.query.parcelId?.toString();
      const producerId = req.query.producerId?.toString();
      const format = req.query.format?.toString() || 'json';

      let entries = [];
      if (parcelId) {
        entries = await this.repository.getEntriesByParcelId(parcelId);
      } else if (producerId) {
        entries = await this.repository.getEntriesByProducerId(producerId);
      } else {
        res.status(400).json({ error: 'Must provide parcelId or producerId for export' });
        return;
      }

      if (format === 'csv') {
        const header = 'id,entryCode,operationType,operationDate,status,cropCode,parcelId\n';
        const rows = entries.map(e => `${e.id},${e.entryCode},${e.operationType},${e.operationDate},${e.status},${e.cropCode || ''},${e.parcelId}`).join('\n');
        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.attachment('field-logs.csv');
        res.status(200).send(header + rows);
        return;
      }

      res.status(200).json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getEntryById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const entry = await this.repository.getEntryById(id!);
      if (!entry) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addInputUsage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const input = { ...req.body, id: randomUUID(), fieldLogEntryId: id!, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), rowVersion: 1, isActive: true };
      
      // In a real app we'd validate the schema here
      await this.repository.addInputUsage(input);
      res.status(201).json(input);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async addEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const uploaderId = req.headers['x-user-id']?.toString() || 'default-user';
      
      const evidence = await this.evidenceService.processEvidence({
        fieldLogEntryId: id!,
        evidenceType: req.body.evidenceType,
        fileName: req.body.fileName,
        fileType: req.body.fileType,
        fileSize: req.body.fileSize,
        storagePath: req.body.storagePath,
        fileHash: req.body.fileHash,
        uploadedBy: uploaderId,
        description: req.body.description,
        isPrimary: req.body.isPrimary
      });
      
      res.status(201).json(this.evidenceService.sanitizeEvidenceForClient(evidence));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async addObservation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = addObservationSchema.parse(req.body);
      
      const observation: any = { 
        ...parsed, 
        id: randomUUID(), 
        fieldLogEntryId: id!, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(), 
        rowVersion: 1 
      };
      
      await this.repository.addObservation(observation);
      res.status(201).json(observation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
