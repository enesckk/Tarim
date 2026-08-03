/**
 * Colorized BSI visualization for Sentinel-2 L2A.
 * BSI = ((B11 + B04) - (B08 + B02)) / ((B11 + B04) + (B08 + B02))
 */
export const BSI_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B04", "B08", "B11", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0, 0, 0, 0];
  const num = (sample.B11 + sample.B04) - (sample.B08 + sample.B02);
  const denom = (sample.B11 + sample.B04) + (sample.B08 + sample.B02);
  const bsi = denom === 0 ? 0 : num / denom;
  let r = 0.3, g = 0.3, b = 0.2;
  if (bsi < 0) { r = 0.15; g = 0.45; b = 0.2; }
  else if (bsi < 0.1) { r = 0.55; g = 0.55; b = 0.25; }
  else if (bsi < 0.2) { r = 0.75; g = 0.55; b = 0.25; }
  else if (bsi < 0.3) { r = 0.85; g = 0.45; b = 0.2; }
  else { r = 0.7; g = 0.35; b = 0.15; }
  return [r, g, b, 1];
}
`;
