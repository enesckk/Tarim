/**
 * Colorized NDMI visualization for Sentinel-2 L2A.
 * NDMI = (B08 - B11) / (B08 + B11)
 */
export const NDMI_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B08", "B11", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}
function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0, 0, 0, 0];
  const denom = sample.B08 + sample.B11;
  const ndmi = denom === 0 ? 0 : (sample.B08 - sample.B11) / denom;
  let r = 0.2, g = 0.2, b = 0.2;
  if (ndmi < -0.2) { r = 0.6; g = 0.3; b = 0.1; }
  else if (ndmi < 0) { r = 0.85; g = 0.65; b = 0.25; }
  else if (ndmi < 0.2) { r = 0.4; g = 0.7; b = 0.9; }
  else if (ndmi < 0.4) { r = 0.15; g = 0.45; b = 0.85; }
  else { r = 0.05; g = 0.2; b = 0.7; }
  return [r, g, b, 1];
}
`;
