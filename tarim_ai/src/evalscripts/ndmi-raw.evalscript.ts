/**
 * Raw NDMI evalscript for Sentinel-2 L2A.
 * NDMI = (B08 - B11) / (B08 + B11)
 * NoData pixels (dataMask === 0) are encoded as NaN.
 */
export const NDMI_RAW_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [
      {
        bands: ["B08", "B11", "dataMask"]
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

  const denom = sample.B08 + sample.B11;
  if (denom === 0) {
    return [NaN];
  }

  const ndmi = (sample.B08 - sample.B11) / denom;
  return [ndmi];
}
`;
