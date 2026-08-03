/**
 * Raw NDVI evalscript for Sentinel-2 L2A.
 * Outputs a single FLOAT32 band (image/tiff) suitable for statistics.
 * NoData pixels (dataMask === 0) are encoded as NaN.
 */
export const NDVI_RAW_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [
      {
        bands: ["B04", "B08", "dataMask"]
      }
    ],
    output: {
      id: "default",
      bands: 1,
      sampleType: "FLOAT32"
    }
  };
}

function evaluatePixel(sample) {
  if (sample.dataMask === 0) {
    return [NaN];
  }

  const denom = sample.B08 + sample.B04;
  if (denom === 0) {
    return [NaN];
  }

  const ndvi = (sample.B08 - sample.B04) / denom;
  return [ndvi];
}
`;
