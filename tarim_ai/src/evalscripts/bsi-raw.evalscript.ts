/**
 * Raw BSI evalscript for Sentinel-2 L2A.
 * BSI = ((B11 + B04) - (B08 + B02)) / ((B11 + B04) + (B08 + B02))
 * NoData pixels (dataMask === 0) are encoded as NaN.
 */
export const BSI_RAW_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [
      {
        bands: ["B11", "B04", "B08", "B02", "dataMask"]
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

  const numerator = sample.B11 + sample.B04 - (sample.B08 + sample.B02);
  const denominator = sample.B11 + sample.B04 + sample.B08 + sample.B02;
  if (denominator === 0) {
    return [NaN];
  }

  const bsi = numerator / denominator;
  return [bsi];
}
`;
