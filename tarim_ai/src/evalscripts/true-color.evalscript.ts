/**
 * True Color evalscript for Sentinel-2 L2A.
 * Uses B04 (red), B03 (green), B02 (blue) with a 2.5 brightness factor.
 * Outputs RGBA PNG with dataMask for transparency.
 */
export const TRUE_COLOR_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [
      {
        bands: ["B04", "B03", "B02", "dataMask"]
      }
    ],
    output: {
      bands: 4,
      sampleType: "AUTO"
    }
  };
}

function evaluatePixel(sample) {
  return [
    2.5 * sample.B04,
    2.5 * sample.B03,
    2.5 * sample.B02,
    sample.dataMask
  ];
}
`;
