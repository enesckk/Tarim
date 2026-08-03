export const ANALYSIS_ERROR_CODES = {
  PARCEL_NOT_FOUND: {
    code: 'PARCEL_NOT_FOUND',
    message: 'Belirtilen ada/parsel bulunamadı.',
    httpStatus: 404,
    retryable: false,
  },
  PARCEL_PROVIDER_UNAVAILABLE: {
    code: 'PARCEL_PROVIDER_UNAVAILABLE',
    message: 'Parsel sorgulama servisi şu an kullanılamıyor.',
    httpStatus: 503,
    retryable: true,
  },
  PARCEL_GEOMETRY_INVALID: {
    code: 'PARCEL_GEOMETRY_INVALID',
    message: 'Parsel geometrisi geçersiz veya eksik.',
    httpStatus: 422,
    retryable: false,
  },
  ANALYSIS_NOT_FOUND: {
    code: 'ANALYSIS_NOT_FOUND',
    message: 'Belirtilen analiz bulunamadı.',
    httpStatus: 404,
    retryable: false,
  },
  ANALYSIS_ALREADY_PROCESSING: {
    code: 'ANALYSIS_ALREADY_PROCESSING',
    message: 'Bu parsel için analiz zaten devam ediyor.',
    httpStatus: 409,
    retryable: false,
  },
  ANALYSIS_INSUFFICIENT_DATA: {
    code: 'ANALYSIS_INSUFFICIENT_DATA',
    message: 'Analiz için yeterli veri bulunamadı.',
    httpStatus: 422,
    retryable: false,
  },
  PROVIDER_TIMEOUT: {
    code: 'PROVIDER_TIMEOUT',
    message: 'Veri sağlayıcı zaman aşımına uğradı.',
    httpStatus: 504,
    retryable: true,
  },
  PROVIDER_UNAVAILABLE: {
    code: 'PROVIDER_UNAVAILABLE',
    message: 'Veri sağlayıcı şu an kullanılamıyor.',
    httpStatus: 503,
    retryable: true,
  },
  PROVIDER_RESPONSE_INVALID: {
    code: 'PROVIDER_RESPONSE_INVALID',
    message: 'Veri sağlayıcıdan geçersiz yanıt alındı.',
    httpStatus: 502,
    retryable: true,
  },
  SENTINEL_AUTH_FAILED: {
    code: 'SENTINEL_AUTH_FAILED',
    message: 'Uydu veri erişim kimlik doğrulaması başarısız.',
    httpStatus: 503,
    retryable: true,
  },
  SENTINEL_NO_USABLE_OBSERVATION: {
    code: 'SENTINEL_NO_USABLE_OBSERVATION',
    message: 'Kullanılabilir uydu gözlemi bulunamadı.',
    httpStatus: 422,
    retryable: false,
  },
  SENTINEL_IMAGE_INVALID: {
    code: 'SENTINEL_IMAGE_INVALID',
    message: 'Uydu görüntüsü geçersiz veya bozuk.',
    httpStatus: 502,
    retryable: true,
  },
  DEM_COVERAGE_INSUFFICIENT: {
    code: 'DEM_COVERAGE_INSUFFICIENT',
    message: 'Yükseklik modeli kapsama alanı yetersiz.',
    httpStatus: 422,
    retryable: false,
  },
  SOIL_DATA_UNAVAILABLE: {
    code: 'SOIL_DATA_UNAVAILABLE',
    message: 'Toprak verileri şu an kullanılamıyor.',
    httpStatus: 503,
    retryable: true,
  },
  CLIMATE_DATA_UNAVAILABLE: {
    code: 'CLIMATE_DATA_UNAVAILABLE',
    message: 'İklim verileri şu an kullanılamıyor.',
    httpStatus: 503,
    retryable: true,
  },
  FIELD_SURVEY_NOT_APPROVED: {
    code: 'FIELD_SURVEY_NOT_APPROVED',
    message: 'Onaylanmış saha ölçümü bulunamadı.',
    httpStatus: 422,
    retryable: false,
  },
  GOLDEN_DATASET_NOT_READY: {
    code: 'GOLDEN_DATASET_NOT_READY',
    message: 'Demo veri seti hazır değil.',
    httpStatus: 503,
    retryable: false,
  },
  DATABASE_UNAVAILABLE: {
    code: 'DATABASE_UNAVAILABLE',
    message: 'Veritabanı bağlantısı kurulamadı.',
    httpStatus: 503,
    retryable: true,
  },
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Beklenmeyen bir hata oluştu.',
    httpStatus: 500,
    retryable: false,
  },
} as const;

export type AnalysisErrorCode = keyof typeof ANALYSIS_ERROR_CODES;

export interface AnalysisErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId: string;
    retryable: boolean;
  };
}

export function createAnalysisError(
  code: AnalysisErrorCode,
  correlationId: string,
  overrideMessage?: string,
): { status: number; body: AnalysisErrorResponse } {
  const def = ANALYSIS_ERROR_CODES[code];
  return {
    status: def.httpStatus,
    body: {
      error: {
        code: def.code,
        message: overrideMessage ?? def.message,
        correlationId,
        retryable: def.retryable,
      },
    },
  };
}
