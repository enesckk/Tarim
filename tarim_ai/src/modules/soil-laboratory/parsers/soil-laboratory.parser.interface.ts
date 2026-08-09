export interface SoilLabParseResult {
  labName?: string;
  labAccreditation?: string;
  sampleNumber?: string;
  analysisDate?: string;
  samplingDate?: string;
  sampleDepth?: string;
  sampleLocation?: string;
  reportNumber?: string;
  analyst?: string;
  notes?: string;
  results: {
    parameterName: string;
    value: number;
    unit?: string;
  }[];
  quality: {
    completeness: number;
    missingFields: string[];
    suspiciousValues: string[];
  };
}

export interface SoilLaboratoryParser {
  parse(buffer: Buffer, filename: string): Promise<SoilLabParseResult>;
}
