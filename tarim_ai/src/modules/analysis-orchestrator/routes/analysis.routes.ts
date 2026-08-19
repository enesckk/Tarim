import { Router, type Request, type Response } from 'express';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { AnalysisOrchestratorService } from '../services/analysis-orchestrator.service.js';
import {
  getLandAnalysisCache,
  getLandAnalysisCacheByAnalysisId,
} from '../services/land-analysis-cache.service.js';
import { resolveAnalysisAttachmentFile } from '../services/analysis-input-attachment.service.js';
import { createAnalysisError } from '../types/error-codes.js';

const optionalNumber = z.number().finite().optional().nullable();

const pdfAttachmentSchema = z
  .object({
    fileName: z.string().trim().min(1).max(260),
    contentType: z.string().trim().min(1).max(120),
    dataBase64: z.string().min(16),
  })
  .optional()
  .nullable();

const manualSoilSchema = z
  .object({
    mode: z.enum(['enter', 'pdf', 'skip']),
    ph: optionalNumber,
    ecDsM: optionalNumber,
    organicMatterPercent: optionalNumber,
    clayPercent: optionalNumber,
    sandPercent: optionalNumber,
    siltPercent: optionalNumber,
    attachment: pdfAttachmentSchema,
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'pdf' && !value.attachment?.dataBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Toprak PDF dosyası gerekli.',
        path: ['attachment'],
      });
    }
  })
  .optional()
  .nullable();

const manualIrrigationSchema = z
  .object({
    mode: z.enum(['enter', 'pdf', 'skip']),
    availability: z
      .enum([
        'unavailable',
        'available_limited',
        'available_and_sufficient',
        'unknown',
      ])
      .optional()
      .nullable(),
    qualityEntered: z.boolean().optional(),
    ecDsM: optionalNumber,
    sar: optionalNumber,
    ph: optionalNumber,
    attachment: pdfAttachmentSchema,
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'pdf' && !value.attachment?.dataBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sulama suyu PDF dosyası gerekli.',
        path: ['attachment'],
      });
    }
  })
  .optional()
  .nullable();

const analysisRequestSchema = z.object({
  province: z.string().min(1),
  district: z.string().min(1),
  neighborhood: z.string().min(1),
  block: z.string().min(1),
  parcel: z.string().min(1),
  landId: z.string().uuid().optional().nullable(),
  options: z
    .object({
      soil: manualSoilSchema,
      irrigation: manualIrrigationSchema,
    })
    .optional()
    .nullable(),
});

const parcelLookupSchema = z.object({
  province: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  neighborhood: z.string().min(1).optional(),
  block: z.string().min(1).optional(),
  parcel: z.string().min(1).optional(),
});

export function createAnalysisRouter(
  orchestrator: AnalysisOrchestratorService,
): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const correlationId = req.observability?.correlationId ?? null;
    const parsed = analysisRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Geçersiz analiz isteği.',
          correlationId,
          retryable: false,
          details: parsed.error.issues,
        },
      });
      return;
    }

    try {
      const result = await orchestrator.createAnalysis(parsed.data, correlationId);
      res.status(201).json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis creation failed';
      if (msg.includes('not found') || msg.includes('bulunamadı')) {
        const e = createAnalysisError('PARCEL_NOT_FOUND', correlationId ?? '');
        res.status(e.status).json(e.body);
      } else if (
        /PDF|pdf|dosya|Dosya|base64|MB|geçersiz|Geçersiz|gerekli/i.test(msg)
      ) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: msg,
            correlationId,
            retryable: false,
          },
        });
      } else {
        const e = createAnalysisError('INTERNAL_ERROR', correlationId ?? '');
        res.status(e.status).json(e.body);
      }
    }
  });

  /** Latest cached analysis for an AMS land (survives in-memory restarts). */
  router.get('/by-land/:landId', async (req: Request, res: Response) => {
    const landId = String(req.params.landId ?? '');
    const q = parcelLookupSchema.safeParse(req.query);
    const parcel =
      q.success &&
      q.data.province &&
      q.data.district &&
      q.data.neighborhood &&
      q.data.block &&
      q.data.parcel
        ? {
            province: q.data.province,
            district: q.data.district,
            neighborhood: q.data.neighborhood,
            block: q.data.block,
            parcel: q.data.parcel,
          }
        : null;

    const cached = getLandAnalysisCache({ landId, parcel });
    if (!cached) {
      res.status(404).json({
        error: {
          code: 'LAND_ANALYSIS_NOT_FOUND',
          message: 'Bu arazi için kayıtlı analiz yok.',
        },
      });
      return;
    }

    const full = req.query.full === '1' || req.query.full === 'true';
    if (full) {
      res.json(cached);
      return;
    }

    res.json({
      landId: cached.landId,
      analysisId: cached.analysisId,
      status: cached.status,
      completedAt: cached.completedAt,
      updatedAt: cached.updatedAt,
      parcel: cached.parcel,
      summary: cached.summary,
    });
  });

  router.get('/cache', async (_req: Request, res: Response) => {
    const items = (await orchestrator.listLandAnalysisReports(100)).map((entry) => ({
      landId: entry.landId,
      analysisId: entry.analysisId,
      status: entry.status,
      completedAt: entry.completedAt,
      updatedAt: entry.updatedAt,
      parcel: entry.parcel,
      summary: entry.summary,
    }));
    res.json({ items, count: items.length });
  });

  router.get('/cache/:analysisId', async (req: Request, res: Response) => {
    const analysisId = String(req.params.analysisId ?? '');
    const cached = getLandAnalysisCacheByAnalysisId(analysisId);
    if (!cached) {
      res.status(404).json({
        error: {
          code: 'ANALYSIS_CACHE_NOT_FOUND',
          message: 'Bu analiz önbellekte yok.',
        },
      });
      return;
    }
    const full = req.query.full === '1' || req.query.full === 'true';
    if (full) {
      res.json(cached);
      return;
    }
    res.json({
      landId: cached.landId,
      analysisId: cached.analysisId,
      status: cached.status,
      completedAt: cached.completedAt,
      updatedAt: cached.updatedAt,
      parcel: cached.parcel,
      summary: cached.summary,
    });
  });

  router.get('/:analysisId/status', async (req: Request, res: Response) => {
    const correlationId = req.observability?.correlationId ?? null;
    const status = await orchestrator.getStatus(req.params.analysisId as string);
    if (!status) {
      const e = createAnalysisError('ANALYSIS_NOT_FOUND', correlationId ?? '');
      res.status(e.status).json(e.body);
      return;
    }
    res.json(status);
  });

  router.get('/:analysisId/images/:layer', async (req: Request, res: Response) => {
    const analysisId = req.params.analysisId as string;
    const layer = req.params.layer as string;
    const allowed = new Set(['true-color', 'ndvi', 'ndmi', 'bsi']);
    if (!allowed.has(layer)) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Image layer not found' } });
      return;
    }
    const filePath = join(
      process.cwd(),
      'storage',
      'analyses',
      analysisId,
      `${layer}.png`,
    );
    if (!existsSync(filePath)) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Image not found' } });
      return;
    }
    res.setHeader('Content-Type', 'image/png');
    createReadStream(filePath).pipe(res);
  });

  router.get('/:analysisId/report.pdf', async (req: Request, res: Response) => {
    const correlationId = req.observability?.correlationId ?? null;
    const analysisId = req.params.analysisId as string;
    try {
      const pdfPath = await orchestrator.getOrCreateReportPdf(analysisId);
      if (!pdfPath || !existsSync(pdfPath)) {
        const e = createAnalysisError('ANALYSIS_NOT_FOUND', correlationId ?? '');
        res.status(e.status).json(e.body);
        return;
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="tarim-ai-rapor-${analysisId}.pdf"`,
      );
      createReadStream(pdfPath).pipe(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PDF generation failed';
      res.status(500).json({
        error: {
          code: 'REPORT_GENERATION_FAILED',
          message: msg,
          correlationId,
          retryable: true,
        },
      });
    }
  });

  router.get('/:analysisId/attachments/:kind', async (req: Request, res: Response) => {
    const correlationId = req.observability?.correlationId ?? null;
    const analysisId = req.params.analysisId as string;
    const kindRaw = String(req.params.kind ?? '');
    if (kindRaw !== 'soil' && kindRaw !== 'irrigation') {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Ek türü bulunamadı (soil | irrigation).',
          correlationId,
        },
      });
      return;
    }
    const resolved = resolveAnalysisAttachmentFile(analysisId, kindRaw);
    if (!resolved) {
      res.status(404).json({
        error: {
          code: 'ATTACHMENT_NOT_FOUND',
          message: 'Yüklenen PDF bulunamadı.',
          correlationId,
        },
      });
      return;
    }
    res.setHeader('Content-Type', resolved.meta.contentType || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${resolved.meta.fileName.replace(/"/g, '')}"`,
    );
    createReadStream(resolved.absolutePath).pipe(res);
  });

  router.get('/:analysisId', async (req: Request, res: Response) => {
    const correlationId = req.observability?.correlationId ?? null;
    const record = await orchestrator.getRecord(req.params.analysisId as string);
    if (!record) {
      const e = createAnalysisError('ANALYSIS_NOT_FOUND', correlationId ?? '');
      res.status(e.status).json(e.body);
      return;
    }

    if (record.status === 'queued' || record.status === 'processing') {
      res.status(202).json({
        analysisId: record.id,
        status: record.status,
        progress: record.progress,
        message: 'Analiz devam ediyor.',
      });
      return;
    }

    const result = await orchestrator.getResult(req.params.analysisId as string);
    if (!result) {
      if (record.status === 'failed') {
        res.json({
          analysisId: record.id,
          status: 'failed',
          parcel: {
            province: record.province,
            district: record.district,
            neighborhood: record.neighborhood,
            block: record.block,
            parcel: record.parcel,
          },
          limitations: [record.errorSummary || 'Analiz tamamlanamadı.'],
          cropRecommendations: [],
        });
        return;
      }
      const e = createAnalysisError('ANALYSIS_NOT_FOUND', correlationId ?? '');
      res.status(e.status).json(e.body);
      return;
    }

    res.json(result);
  });

  return router;
}
