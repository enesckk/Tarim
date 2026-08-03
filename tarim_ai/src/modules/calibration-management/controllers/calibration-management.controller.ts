import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type { CalibrationManagementService } from '../services/calibration-management.service.js';
import {
  actorReasonSchema,
  addReviewSchema,
  bootstrapSchema,
  createCropRequirementProfileSchema,
  impactAnalysisSchema,
  updateCropRequirementProfileSchema,
} from '../schemas/calibration-management.schemas.js';
import type { RequirementSource } from '../types/calibration-management.types.js';

function paramId(req: Request): string {
  return String(req.params.id ?? '');
}

function withSourceIds(
  sources: Array<zInferSource> | undefined,
): RequirementSource[] | undefined {
  if (!sources) return undefined;
  return sources.map((s) => ({
    ...s,
    id: s.id ?? randomUUID(),
  }));
}

type zInferSource = {
  id?: string;
  type: RequirementSource['type'];
  title: string;
  organization?: string;
  authors?: string[];
  publicationYear?: number | null;
  reference?: string;
  url?: string | null;
  notes?: string;
  supports: string[];
  verificationStatus: RequirementSource['verificationStatus'];
};

export class CalibrationManagementController {
  constructor(private readonly service: CalibrationManagementService) {}

  bootstrap = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = bootstrapSchema.parse(req.body ?? {});
      const result = await this.service.bootstrapFromStatic(body.actor);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createCropRequirementProfileSchema.parse(req.body);
      const result = await this.service.createProfile({
        cropId: body.cropId,
        requirements: body.requirements,
        createdBy: body.createdBy,
        notes: body.notes,
        sources: withSourceIds(body.sources),
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.getProfile(paramId(req)));
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateCropRequirementProfileSchema.parse(req.body);
      const result = await this.service.updateProfile(paramId(req), {
        actor: body.actor,
        reason: body.reason,
        requirements: body.requirements,
        notes: body.notes,
        sources: withSourceIds(body.sources),
        fieldValidationStatus: body.fieldValidationStatus,
        changes: body.changes?.map((c) => ({
          path: c.path,
          oldValue: c.oldValue,
          newValue: c.newValue,
          reason: c.reason,
          sourceIds: c.sourceIds,
          changedBy: c.changedBy,
          changedAt: c.changedAt ?? new Date().toISOString(),
        })),
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  submit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = actorReasonSchema.parse(req.body ?? {});
      res.json(await this.service.submit(paramId(req), body.actor, body.reason));
    } catch (err) {
      next(err);
    }
  };

  startReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = actorReasonSchema.parse(req.body ?? {});
      res.json(
        await this.service.startReview(paramId(req), body.actor, body.reason),
      );
    } catch (err) {
      next(err);
    }
  };

  addReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = addReviewSchema.parse(req.body);
      res.status(201).json(
        await this.service.addReview({
          profileId: paramId(req),
          reviewer: body.reviewer,
          decision: body.decision,
          reviewedFields: body.reviewedFields,
          comments: body.comments,
          suggestedChanges: body.suggestedChanges,
          fieldStatusUpdates: body.fieldStatusUpdates,
        }),
      );
    } catch (err) {
      next(err);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = actorReasonSchema.parse(req.body ?? {});
      res.json(await this.service.approve(paramId(req), body.actor, body.reason));
    } catch (err) {
      next(err);
    }
  };

  publish = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = actorReasonSchema.parse(req.body ?? {});
      res.json(await this.service.publish(paramId(req), body.actor, body.reason));
    } catch (err) {
      next(err);
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = actorReasonSchema.parse(req.body ?? {});
      res.json(await this.service.reject(paramId(req), body.actor, body.reason));
    } catch (err) {
      next(err);
    }
  };

  impactAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = impactAnalysisSchema.parse(req.body ?? {});
      res.json(
        await this.service.impactAnalysis({
          profileId: paramId(req),
          actor: body.actor,
          includeDetails: body.includeDetails,
          existingScores: body.existingScores,
        }),
      );
    } catch (err) {
      next(err);
    }
  };

  compare = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const otherId = String(req.params.otherId ?? '');
      res.json(await this.service.compare(paramId(req), otherId));
    } catch (err) {
      next(err);
    }
  };

  getActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cropId = String(req.params.cropId ?? '');
      res.json(await this.service.getActive(cropId));
    } catch (err) {
      next(err);
    }
  };

  createRevision = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = actorReasonSchema.parse(req.body ?? {});
      res.status(201).json(
        await this.service.createRevision(paramId(req), body.actor, body.reason),
      );
    } catch (err) {
      next(err);
    }
  };

  rollback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = actorReasonSchema.parse(req.body ?? {});
      res.status(201).json(
        await this.service.rollback(paramId(req), body.actor, body.reason),
      );
    } catch (err) {
      next(err);
    }
  };
}
