import type { Request, Response, NextFunction } from 'express';
import { FieldSurveyService } from '../services/field-survey.service.js';
import { currentPersistenceMeta } from '../../database/persistence-factory.js';
import {
  addSampleSchema,
  approveSurveySchema,
  createFieldSurveySchema,
  listParcelSurveysSchema,
  patchFieldSurveySchema,
  rejectSurveySchema,
} from '../schemas/field-survey.schemas.js';

function paramId(req: Request): string {
  return String(req.params.id ?? '');
}

export class FieldSurveyController {
  constructor(private readonly service: FieldSurveyService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createFieldSurveySchema.parse(req.body);
      const survey = await this.service.create(body);
      res.status(201).json(survey);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await this.service.getSummary(paramId(req));
      res.json(summary);
    } catch (err) {
      next(err);
    }
  };

  patch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = patchFieldSurveySchema.parse(req.body);
      const survey = await this.service.patch(paramId(req), body);
      res.json(survey);
    } catch (err) {
      next(err);
    }
  };

  addSample = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = addSampleSchema.parse(req.body);
      const survey = await this.service.addSample(paramId(req), body);
      res.status(201).json(survey);
    } catch (err) {
      next(err);
    }
  };

  submit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const survey = await this.service.submit(
        paramId(req),
        typeof req.body?.actorId === 'string' ? req.body.actorId : undefined,
      );
      res.json(survey);
    } catch (err) {
      next(err);
    }
  };

  startReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const survey = await this.service.startReview(
        paramId(req),
        typeof req.body?.actorId === 'string' ? req.body.actorId : undefined,
      );
      res.json(survey);
    } catch (err) {
      next(err);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = approveSurveySchema.parse(req.body);
      const survey = await this.service.approve(
        paramId(req),
        body.reviewer,
        body.comments,
      );
      res.json(survey);
    } catch (err) {
      next(err);
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = rejectSurveySchema.parse(req.body);
      const survey = await this.service.reject(
        paramId(req),
        body.reviewer,
        body.reason,
      );
      res.json(survey);
    } catch (err) {
      next(err);
    }
  };

  returnToDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const survey = await this.service.returnToDraft(
        paramId(req),
        typeof req.body?.actorId === 'string' ? req.body.actorId : undefined,
      );
      res.json(survey);
    } catch (err) {
      next(err);
    }
  };

  listByParcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listParcelSurveysSchema.parse(req.body);
      const surveys = await this.service.listByParcelQuery(query);
      res.json({
        parcelId: [
          query.province,
          query.district,
          query.neighborhood,
          query.block,
          query.parcel,
        ]
          .map((s) => s.toLocaleLowerCase('tr-TR').trim())
          .join('|'),
        surveys,
        repositoryType: currentPersistenceMeta().repositoryType,
        persistence: currentPersistenceMeta().type,
        persistenceMeta: currentPersistenceMeta(),
      });
    } catch (err) {
      next(err);
    }
  };
}
