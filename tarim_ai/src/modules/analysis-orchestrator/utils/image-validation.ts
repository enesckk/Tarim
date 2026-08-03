import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export interface ImageValidationResult {
  valid: boolean;
  accessible: boolean;
  mimeType: string | null;
  byteLength: number;
  warnings: string[];
  errors: string[];
  scientificValidation: 'not_performed';
}

/**
 * Basic corrupt/empty/wrong-mime checks for Sentinel imagery.
 * Full scientific image validation is not performed.
 */
export async function validateImageFile(
  filePath: string,
  expectedMime?: string,
): Promise<ImageValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let accessible = false;
  let byteLength = 0;
  let mimeType: string | null = null;

  try {
    await access(filePath);
    accessible = true;
  } catch {
    errors.push('Image file not accessible');
    return {
      valid: false,
      accessible: false,
      mimeType: null,
      byteLength: 0,
      warnings,
      errors,
      scientificValidation: 'not_performed',
    };
  }

  try {
    const buffer = await readFile(filePath);
    byteLength = buffer.length;

    if (byteLength === 0) {
      errors.push('Image is empty (0 bytes)');
    }

    if (byteLength < 100) {
      warnings.push('Image is suspiciously small');
    }

    // PNG magic bytes
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      mimeType = 'image/png';
    } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      mimeType = 'image/jpeg';
    } else if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46
    ) {
      mimeType = 'image/gif';
    } else {
      warnings.push('Unknown image format (magic bytes not recognized)');
    }

    if (expectedMime && mimeType && mimeType !== expectedMime) {
      errors.push(`MIME mismatch: expected ${expectedMime}, got ${mimeType}`);
    }

    // Uniform color heuristic: sample first 1KB of pixel data after header
    if (mimeType === 'image/png' && byteLength > 100) {
      const sample = buffer.subarray(50, Math.min(1050, byteLength));
      const unique = new Set(sample);
      if (unique.size <= 2) {
        warnings.push('Image may be empty or single-color (heuristic)');
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Failed to read image');
  }

  return {
    valid: errors.length === 0 && byteLength > 0,
    accessible,
    mimeType,
    byteLength,
    warnings,
    errors,
    scientificValidation: 'not_performed',
  };
}

export async function validateImageUrl(
  imageUrl: string,
): Promise<ImageValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const res = await fetch(imageUrl, { method: 'HEAD' });
    if (!res.ok) {
      // Fallback to GET
      const getRes = await fetch(imageUrl);
      if (!getRes.ok) {
        errors.push(`HTTP ${getRes.status}`);
        return {
          valid: false,
          accessible: false,
          mimeType: null,
          byteLength: 0,
          warnings,
          errors,
          scientificValidation: 'not_performed',
        };
      }
      const buf = Buffer.from(await getRes.arrayBuffer());
      const mime = getRes.headers.get('content-type');
      if (buf.length === 0) errors.push('Empty response body');
      if (mime && !mime.startsWith('image/')) {
        errors.push(`Unexpected content-type: ${mime}`);
      }
      return {
        valid: errors.length === 0 && buf.length > 0,
        accessible: true,
        mimeType: mime,
        byteLength: buf.length,
        warnings,
        errors,
        scientificValidation: 'not_performed',
      };
    }

    const mime = res.headers.get('content-type');
    const length = Number(res.headers.get('content-length') ?? 0);
    if (mime && !mime.startsWith('image/')) {
      errors.push(`Unexpected content-type: ${mime}`);
    }
    if (length === 0) warnings.push('Content-Length is 0 or missing');

    return {
      valid: errors.length === 0,
      accessible: true,
      mimeType: mime,
      byteLength: length,
      warnings,
      errors,
      scientificValidation: 'not_performed',
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Fetch failed');
    return {
      valid: false,
      accessible: false,
      mimeType: null,
      byteLength: 0,
      warnings,
      errors,
      scientificValidation: 'not_performed',
    };
  }
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
