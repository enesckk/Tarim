/**
 * NDVI evalscript for Sentinel-2 L2A.
 * Uses B08 (NIR) and B04 (red) with a color map.
 * NoData areas are transparent via dataMask.
 */
export const NDVI_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [
      {
        bands: ["B08", "B04", "dataMask"]
      }
    ],
    output: {
      bands: 4,
      sampleType: "AUTO"
    }
  };
}

function evaluatePixel(sample) {
  const denom = sample.B08 + sample.B04;
  const ndvi = denom === 0 ? 0 : (sample.B08 - sample.B04) / denom;

  // Color map: brown -> yellow -> green
  let r = 0;
  let g = 0;
  let b = 0;

  if (ndvi < -0.2) {
    r = 0.05;
    g = 0.05;
    b = 0.05;
  } else if (ndvi < 0) {
    r = 0.75;
    g = 0.45;
    b = 0.2;
  } else if (ndvi < 0.2) {
    r = 0.9;
    g = 0.8;
    b = 0.3;
  } else if (ndvi < 0.4) {
    r = 0.5;
    g = 0.8;
    b = 0.2;
  } else if (ndvi < 0.6) {
    r = 0.2;
    g = 0.7;
    b = 0.2;
  } else {
    r = 0.05;
    g = 0.45;
    b = 0.1;
  }

  return [r, g, b, sample.dataMask];
}
`;
