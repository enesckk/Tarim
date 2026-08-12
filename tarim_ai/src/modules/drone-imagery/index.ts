import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink, access } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../../utils/api-error.js';

export type DroneImageRecord = {
  id: string;
  capturedAt: string;
  uploadedAt: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  storagePath: string;
  analysisId: string | null;
  note: string | null;
  landId: string;
  landName: string;
  parcel: {
    province: string;
    district: string;
    neighborhood: string;
    block: string;
    parcel: string;
  } | null;
};

const STORAGE_ROOT = join(process.cwd(), 'storage', 'drone-images');
const META_FILE = join(STORAGE_ROOT, 'index.json');

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'capturedAt must be YYYY-MM-DD')
  .refine((value) => {
    const d = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }, 'capturedAt must be a valid calendar date')
  .refine((value) => {
    const today = new Date();
    const iso = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    )
      .toISOString()
      .slice(0, 10);
    return value <= iso;
  }, 'capturedAt cannot be in the future');

const parcelSchema = z.object({
  province: z.string().min(1),
  district: z.string().min(1),
  neighborhood: z.string().min(1),
  block: z.string().min(1),
  parcel: z.string().min(1),
});

const uploadSchema = z.object({
  capturedAt: dateOnly,
  fileName: z.string().min(1).max(200),
  contentType: z
    .string()
    .min(1)
    .refine(
      (v) =>
        ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'].includes(
          v.toLowerCase(),
        ),
      'Only jpeg/png/webp/heic images are allowed',
    ),
  dataBase64: z.string().min(32),
  analysisId: z.string().uuid().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  landId: z.string().min(1, 'landId is required'),
  landName: z.string().min(1, 'landName is required'),
  parcelQuery: parcelSchema.optional().nullable(),
});

async function ensureStorage(): Promise<void> {
  await mkdir(STORAGE_ROOT, { recursive: true });
  try {
    await access(META_FILE);
  } catch {
    await writeFile(META_FILE, '[]', 'utf8');
  }
}

async function readIndex(): Promise<DroneImageRecord[]> {
  await ensureStorage();
  const raw = await readFile(META_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw) as Array<Partial<DroneImageRecord>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      id: String(item.id ?? ''),
      capturedAt: String(item.capturedAt ?? ''),
      uploadedAt: String(item.uploadedAt ?? ''),
      fileName: String(item.fileName ?? ''),
      contentType: String(item.contentType ?? 'image/jpeg'),
      byteSize: Number(item.byteSize ?? 0),
      storagePath: String(item.storagePath ?? ''),
      analysisId: item.analysisId ?? null,
      note: item.note ?? null,
      landId: String(item.landId ?? '').trim() || 'unknown',
      landName: String(item.landName ?? '').trim() || 'Bilinmeyen arazi',
      parcel: item.parcel ?? null,
    }));
  } catch {
    return [];
  }
}

async function writeIndex(items: DroneImageRecord[]): Promise<void> {
  await ensureStorage();
  await writeFile(META_FILE, JSON.stringify(items, null, 2), 'utf8');
}

function extensionFor(contentType: string, fileName: string): string {
  const fromName = extname(fileName).toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('heic')) return '.heic';
  return '.jpg';
}

function publicMeta(record: DroneImageRecord) {
  return {
    id: record.id,
    capturedAt: record.capturedAt,
    uploadedAt: record.uploadedAt,
    fileName: record.fileName,
    contentType: record.contentType,
    byteSize: record.byteSize,
    analysisId: record.analysisId,
    note: record.note,
    landId: record.landId,
    landName: record.landName,
    parcel: record.parcel,
    imageUrl: `/api/drone-images/${record.id}/file`,
  };
}

export class DroneImageryService {
  async list(filters: {
    analysisId?: string;
    landId?: string;
    province?: string;
    district?: string;
    neighborhood?: string;
    block?: string;
    parcel?: string;
  }): Promise<ReturnType<typeof publicMeta>[]> {
    const items = await readIndex();
    return items
      .filter((item) => {
        if (filters.analysisId && item.analysisId !== filters.analysisId) return false;
        if (filters.landId && item.landId !== filters.landId) return false;
        if (filters.province && item.parcel?.province !== filters.province) return false;
        if (filters.district && item.parcel?.district !== filters.district) return false;
        if (filters.neighborhood && item.parcel?.neighborhood !== filters.neighborhood)
          return false;
        if (filters.block && item.parcel?.block !== filters.block) return false;
        if (filters.parcel && item.parcel?.parcel !== filters.parcel) return false;
        return true;
      })
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt) || b.uploadedAt.localeCompare(a.uploadedAt))
      .map(publicMeta);
  }

  async upload(input: z.infer<typeof uploadSchema>) {
    const cleanedBase64 = input.dataBase64.replace(/^data:[^;]+;base64,/, '');
    let buffer: Buffer;
    try {
      buffer = Buffer.from(cleanedBase64, 'base64');
    } catch {
      throw new ApiError(400, 'Invalid base64 image payload', {
        code: 'INVALID_IMAGE_PAYLOAD',
      });
    }
    if (buffer.byteLength < 64) {
      throw new ApiError(400, 'Image payload is too small', {
        code: 'INVALID_IMAGE_PAYLOAD',
      });
    }
    if (buffer.byteLength > 40 * 1024 * 1024) {
      throw new ApiError(400, 'Image must be 40 MB or smaller', {
        code: 'IMAGE_TOO_LARGE',
      });
    }

    await ensureStorage();
    const id = randomUUID();
    const ext = extensionFor(input.contentType, input.fileName);
    const storagePath = join(STORAGE_ROOT, `${id}${ext}`);
    await writeFile(storagePath, buffer);

    const record: DroneImageRecord = {
      id,
      capturedAt: input.capturedAt,
      uploadedAt: new Date().toISOString(),
      fileName: input.fileName,
      contentType: input.contentType,
      byteSize: buffer.byteLength,
      storagePath,
      analysisId: input.analysisId ?? null,
      note: input.note ?? null,
      landId: input.landId,
      landName: input.landName,
      parcel: input.parcelQuery ?? null,
    };

    const items = await readIndex();
    items.push(record);
    await writeIndex(items);
    return publicMeta(record);
  }

  async getFile(id: string): Promise<{ record: DroneImageRecord; buffer: Buffer }> {
    const items = await readIndex();
    const record = items.find((item) => item.id === id);
    if (!record) {
      throw new ApiError(404, 'Drone image not found', { code: 'DRONE_IMAGE_NOT_FOUND' });
    }
    const buffer = await readFile(record.storagePath);
    return { record, buffer };
  }

  async remove(id: string): Promise<void> {
    const items = await readIndex();
    const record = items.find((item) => item.id === id);
    if (!record) {
      throw new ApiError(404, 'Drone image not found', { code: 'DRONE_IMAGE_NOT_FOUND' });
    }
    try {
      await unlink(record.storagePath);
    } catch {
      // file may already be missing
    }
    await writeIndex(items.filter((item) => item.id !== id));
  }
}

export function createDroneImageryModule() {
  const service = new DroneImageryService();
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await service.list({
        analysisId: typeof req.query.analysisId === 'string' ? req.query.analysisId : undefined,
        landId: typeof req.query.landId === 'string' ? req.query.landId : undefined,
        province: typeof req.query.province === 'string' ? req.query.province : undefined,
        district: typeof req.query.district === 'string' ? req.query.district : undefined,
        neighborhood:
          typeof req.query.neighborhood === 'string' ? req.query.neighborhood : undefined,
        block: typeof req.query.block === 'string' ? req.query.block : undefined,
        parcel: typeof req.query.parcel === 'string' ? req.query.parcel : undefined,
      });
      res.json({ items, count: items.length });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = uploadSchema.parse(req.body);
      const created = await service.upload(body);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/file', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { record, buffer } = await service.getFile(String(req.params.id));
      res.setHeader('Content-Type', record.contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.remove(String(req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return { router, service };
}
