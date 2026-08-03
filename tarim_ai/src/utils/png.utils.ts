import { inflateSync } from 'node:zlib';
import { ApiError } from './api-error.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface PngValidationResult {
  width: number;
  height: number;
  fileSizeBytes: number;
  opaquePixelCount: number;
  totalPixels: number;
}

/**
 * Validates that a buffer is a non-empty, non-corrupt PNG with visible pixels.
 * Rejects fully transparent / empty imagery.
 */
export function assertValidPngImage(buffer: Buffer, label = 'PNG'): PngValidationResult {
  if (!buffer || buffer.length < 57) {
    throw new ApiError(502, `${label} response is empty or too small to be a valid PNG`);
  }

  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new ApiError(502, `${label} response is not a valid PNG (bad signature)`);
  }

  const ihdr = readChunk(buffer, 8);
  if (ihdr.type !== 'IHDR') {
    throw new ApiError(502, `${label} response is corrupt (missing IHDR)`);
  }

  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const bitDepth = ihdr.data[8];
  const colorType = ihdr.data[9];

  if (width < 1 || height < 1) {
    throw new ApiError(502, `${label} has invalid dimensions`);
  }

  const idatParts: Buffer[] = [];
  let offset = 8 + 12 + ihdr.data.length;

  while (offset + 12 <= buffer.length) {
    const chunk = readChunk(buffer, offset);
    offset += 12 + chunk.data.length;
    if (chunk.type === 'IDAT') {
      idatParts.push(chunk.data);
    }
    if (chunk.type === 'IEND') {
      break;
    }
  }

  if (idatParts.length === 0) {
    throw new ApiError(502, `${label} is corrupt (missing IDAT image data)`);
  }

  let inflated: Buffer;
  try {
    inflated = inflateSync(Buffer.concat(idatParts));
  } catch {
    throw new ApiError(502, `${label} is corrupt (unable to decompress image data)`);
  }

  const bytesPerPixel = bytesPerPixelForColorType(colorType, bitDepth);
  const totalPixels = width * height;

  if (bytesPerPixel == null) {
    const minBytes = Math.max(200, Math.floor(totalPixels * 0.02));
    if (buffer.length < minBytes) {
      throw new ApiError(502, `${label} appears empty or degenerate`);
    }
    return {
      width,
      height,
      fileSizeBytes: buffer.length,
      opaquePixelCount: -1,
      totalPixels,
    };
  }

  const pixels = reconstructPngPixels(inflated, width, height, bytesPerPixel);
  const hasAlpha = colorType === 4 || colorType === 6;
  let opaquePixelCount = 0;

  if (!hasAlpha) {
    opaquePixelCount = totalPixels;
  } else {
    for (let i = 0; i < totalPixels; i++) {
      const alpha = pixels[i * bytesPerPixel + bytesPerPixel - 1];
      if (alpha > 0) {
        opaquePixelCount += 1;
      }
    }
  }

  if (opaquePixelCount === 0) {
    throw new ApiError(502, `${label} is fully transparent (no visible pixels)`);
  }

  return {
    width,
    height,
    fileSizeBytes: buffer.length,
    opaquePixelCount,
    totalPixels,
  };
}

function reconstructPngPixels(
  inflated: Buffer,
  width: number,
  height: number,
  bpp: number,
): Buffer {
  const stride = 1 + width * bpp;
  const expected = stride * height;
  if (inflated.length < expected) {
    throw new ApiError(502, 'PNG is corrupt (incomplete pixel data)');
  }

  const out = Buffer.alloc(width * height * bpp);
  let prev = Buffer.alloc(width * bpp, 0);

  for (let y = 0; y < height; y++) {
    const filterType = inflated[y * stride];
    const row = inflated.subarray(y * stride + 1, y * stride + 1 + width * bpp);
    const recon = Buffer.alloc(width * bpp);

    for (let i = 0; i < row.length; i++) {
      const left = i >= bpp ? recon[i - bpp] : 0;
      const up = prev[i];
      const upLeft = i >= bpp ? prev[i - bpp] : 0;
      const raw = row[i];

      switch (filterType) {
        case 0:
          recon[i] = raw;
          break;
        case 1:
          recon[i] = (raw + left) & 0xff;
          break;
        case 2:
          recon[i] = (raw + up) & 0xff;
          break;
        case 3:
          recon[i] = (raw + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          recon[i] = (raw + paeth(left, up, upLeft)) & 0xff;
          break;
        default:
          throw new ApiError(502, `PNG is corrupt (unknown filter type ${filterType})`);
      }
    }

    recon.copy(out, y * width * bpp);
    prev = recon;
  }

  return out;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function bytesPerPixelForColorType(colorType: number, bitDepth: number): number | null {
  if (bitDepth !== 8) {
    return null;
  }
  switch (colorType) {
    case 0:
      return 1;
    case 2:
      return 3;
    case 4:
      return 2;
    case 6:
      return 4;
    default:
      return null;
  }
}

function readChunk(
  buffer: Buffer,
  offset: number,
): { type: string; data: Buffer } {
  if (offset + 8 > buffer.length) {
    throw new ApiError(502, 'PNG is corrupt (truncated chunk header)');
  }

  const length = buffer.readUInt32BE(offset);
  const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
  const dataStart = offset + 8;
  const dataEnd = dataStart + length;

  if (dataEnd + 4 > buffer.length) {
    throw new ApiError(502, 'PNG is corrupt (truncated chunk)');
  }

  return {
    type,
    data: buffer.subarray(dataStart, dataEnd),
  };
}
