import { ApiError } from '../../../utils/api-error.js';

export class DatabaseError extends ApiError {
  constructor(
    statusCode: number,
    message: string,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(statusCode, message, { code, ...details });
    this.name = 'DatabaseError';
  }
}

export function mapPgError(error: unknown): never {
  const err = error as {
    code?: string;
    message?: string;
    constraint?: string;
  };

  if (
    err?.code === '57P01' ||
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ETIMEDOUT' ||
    err?.code === '28000' ||
    err?.code === '3D000'
  ) {
    throw new DatabaseError(503, 'Database unavailable', 'DATABASE_UNAVAILABLE');
  }
  if (err?.code === '57014') {
    throw new DatabaseError(
      503,
      'Database statement timeout',
      'DATABASE_CONNECTION_TIMEOUT',
    );
  }
  if (err?.code === '23505') {
    throw new DatabaseError(
      409,
      'Database unique constraint violation',
      'DATABASE_CONSTRAINT_VIOLATION',
      { constraint: err.constraint },
    );
  }
  if (err?.code === '23514' || err?.code === '23503' || err?.code === '23502') {
    throw new DatabaseError(
      422,
      'Database constraint violation',
      'DATABASE_CONSTRAINT_VIOLATION',
      { constraint: err.constraint },
    );
  }

  throw new DatabaseError(
    503,
    'Database transaction failed',
    'DATABASE_TRANSACTION_FAILED',
    {
      // Never include credentials; include pg code only.
      pgCode: err?.code ?? null,
      pgMessage: err?.message ? String(err.message).slice(0, 200) : null,
    },
  );
}
