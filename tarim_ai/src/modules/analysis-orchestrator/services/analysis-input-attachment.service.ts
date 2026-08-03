import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type AnalysisAttachmentKind = 'soil' | 'irrigation';

export type AnalysisAttachmentMeta = {
  kind: AnalysisAttachmentKind;
  fileName: string;
  contentType: string;
  byteSize: number;
  fileHash: string;
  storedFileName: string;
  uploadedAt: string;
};

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
]);

function rootDir(analysisId: string): string {
  return join(process.cwd(), 'storage', 'analysis-attachments', analysisId);
}

export function analysisAttachmentPath(
  analysisId: string,
  kind: AnalysisAttachmentKind,
  storedFileName: string,
): string {
  return join(rootDir(analysisId), `${kind}__${storedFileName}`);
}

export function saveAnalysisPdfAttachment(input: {
  analysisId: string;
  kind: AnalysisAttachmentKind;
  fileName: string;
  contentType: string;
  dataBase64: string;
}): AnalysisAttachmentMeta {
  const cleanName = input.fileName.trim().replace(/[^\w.\-()+\sğüşıöçĞÜŞİÖÇ]/gi, '_');
  if (!cleanName.toLowerCase().endsWith('.pdf')) {
    throw new Error('Yalnızca PDF dosyası yüklenebilir.');
  }
  const contentType = (input.contentType || 'application/pdf').toLowerCase();
  if (!ALLOWED_TYPES.has(contentType) && contentType !== 'application/octet-stream') {
    throw new Error('Dosya türü PDF olmalıdır.');
  }

  const raw = input.dataBase64.includes(',')
    ? input.dataBase64.slice(input.dataBase64.indexOf(',') + 1)
    : input.dataBase64;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(raw, 'base64');
  } catch {
    throw new Error('PDF içeriği okunamadı.');
  }
  if (!buffer.length) throw new Error('PDF dosyası boş.');
  if (buffer.length > MAX_BYTES) {
    throw new Error('PDF en fazla 12 MB olabilir.');
  }
  // PDF magic header %PDF
  if (buffer.subarray(0, 4).toString('utf8') !== '%PDF') {
    throw new Error('Geçersiz PDF dosyası.');
  }

  const dir = rootDir(input.analysisId);
  mkdirSync(dir, { recursive: true });
  const storedFileName = `${randomUUID()}.pdf`;
  const fullPath = analysisAttachmentPath(input.analysisId, input.kind, storedFileName);
  writeFileSync(fullPath, buffer);

  const meta: AnalysisAttachmentMeta = {
    kind: input.kind,
    fileName: cleanName,
    contentType: 'application/pdf',
    byteSize: buffer.length,
    fileHash: createHash('sha256').update(buffer).digest('hex'),
    storedFileName,
    uploadedAt: new Date().toISOString(),
  };
  writeFileSync(
    join(dir, `${input.kind}.meta.json`),
    `${JSON.stringify(meta, null, 2)}\n`,
    'utf8',
  );
  return meta;
}

export function readAnalysisAttachmentMeta(
  analysisId: string,
  kind: AnalysisAttachmentKind,
): AnalysisAttachmentMeta | null {
  const metaPath = join(rootDir(analysisId), `${kind}.meta.json`);
  if (!existsSync(metaPath)) return null;
  try {
    return JSON.parse(readFileSync(metaPath, 'utf8')) as AnalysisAttachmentMeta;
  } catch {
    return null;
  }
}

export function resolveAnalysisAttachmentFile(
  analysisId: string,
  kind: AnalysisAttachmentKind,
): { meta: AnalysisAttachmentMeta; absolutePath: string } | null {
  const meta = readAnalysisAttachmentMeta(analysisId, kind);
  if (!meta) return null;
  const absolutePath = analysisAttachmentPath(
    analysisId,
    kind,
    meta.storedFileName,
  );
  if (!existsSync(absolutePath)) return null;
  return { meta, absolutePath };
}
