import { fromArrayBuffer } from 'geotiff';
import { ApiError } from './api-error.js';

export interface FloatRasterBand {
  values: Float32Array | number[];
  width: number;
  height: number;
  noData: number | null;
}

/**
 * Reads the first band of a FLOAT32 GeoTIFF into a numeric array with dimensions.
 */
export async function readFloatRasterBandWithMeta(
  tiffBuffer: Buffer,
  label = 'GeoTIFF',
): Promise<FloatRasterBand> {
  try {
    const arrayBuffer = Uint8Array.from(tiffBuffer).buffer;
    const tiff = await fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    const noDataRaw = image.getGDALNoData();
    const noData =
      noDataRaw == null || String(noDataRaw) === ''
        ? null
        : Number.parseFloat(String(noDataRaw));

    const rasters = await image.readRasters();
    const band = rasters[0];

    if (!band) {
      throw new Error(`${label} contains no raster bands`);
    }

    let values: Float32Array | number[];
    if (ArrayBuffer.isView(band)) {
      values = band as Float32Array;
    } else if (Array.isArray(band)) {
      values = band as number[];
    } else {
      throw new Error(`Unsupported ${label} raster format`);
    }

    return {
      values,
      width,
      height,
      noData: Number.isFinite(noData) ? noData! : null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(502, `Failed to read ${label}`, {
      message: error instanceof Error ? error.message : undefined,
    });
  }
}

/**
 * Reads the first band of a FLOAT32 GeoTIFF into a numeric array.
 * @deprecated Prefer readFloatRasterBandWithMeta for width/height awareness.
 */
export async function readFloatRasterBand(
  tiffBuffer: Buffer,
  label = 'GeoTIFF',
): Promise<Float32Array | number[]> {
  const band = await readFloatRasterBandWithMeta(tiffBuffer, label);
  return band.values;
}
