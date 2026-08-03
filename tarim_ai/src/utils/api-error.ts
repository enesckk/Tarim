export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly code?: string;

  constructor(statusCode: number, message: string, details?: unknown, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    if (
      !this.code &&
      details &&
      typeof details === 'object' &&
      details !== null &&
      'code' in details &&
      typeof (details as { code: unknown }).code === 'string'
    ) {
      this.code = (details as { code: string }).code;
    }
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
