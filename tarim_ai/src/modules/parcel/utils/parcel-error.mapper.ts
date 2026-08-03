import { ApiError } from '../../../utils/api-error.js';

/**
 * Maps provider failures to safe user-facing ApiError instances.
 * Technical details stay in server logs only.
 */
export function mapParcelProviderError(error: unknown, context: string): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  const technicalMessage = error instanceof Error ? error.message : String(error);
  console.error(`[ParcelProvider] ${context}`, { message: technicalMessage });

  if (isTimeoutError(error)) {
    return new ApiError(502, 'Parsel bilgisi şu anda alınamıyor.', {
      code: 'PARCEL_PROVIDER_TIMEOUT',
    });
  }

  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: number }).status
      : undefined;
  if (status === 403 || /403|forbidden/i.test(technicalMessage)) {
    return new ApiError(502, 'Resmi parsel servisine erişim şu anda engelleniyor.', {
      code: 'PARCEL_PROVIDER_FORBIDDEN',
    });
  }

  return new ApiError(502, 'Parsel bilgisi şu anda alınamıyor.', {
    code: 'PARCEL_PROVIDER_UNAVAILABLE',
  });
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { code?: string; message?: string };
  return (
    err.code === 'ECONNABORTED' ||
    err.code === 'ETIMEDOUT' ||
    (typeof err.message === 'string' && /timeout/i.test(err.message))
  );
}
