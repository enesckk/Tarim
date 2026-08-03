import { ApiError } from '../../../utils/api-error.js';
import type { ParcelProvider } from './parcel-provider.interface.js';
import type { ParcelQuery, ResolvedParcel } from '../types/parcel.types.js';
import { mapParcelProviderError } from '../utils/parcel-error.mapper.js';

export class FallbackParcelProvider implements ParcelProvider {
  readonly name = 'fallback';

  constructor(
    private readonly providers: ParcelProvider[],
    private readonly orderLabel: string[],
  ) {}

  async resolve(query: ParcelQuery): Promise<ResolvedParcel> {
    let lastError: unknown;
    let firstFailureCode: string | null = null;

    for (const provider of this.providers) {
      try {
        const resolved = await provider.resolve(query);
        if (provider.name !== this.providers[0]?.name) {
          resolved.fallbackUsed = true;
          resolved.fallbackReason = firstFailureCode;
        }
        return resolved;
      } catch (error) {
        lastError = error;
        const code =
          error instanceof ApiError
            ? error.code ?? null
            : typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                typeof (error as { code: unknown }).code === 'string'
              ? (error as { code: string }).code
              : null;
        firstFailureCode ??= code;
      }
    }

    throw mapParcelProviderError(
      lastError,
      `Parcel fallback chain failed: ${this.orderLabel.join(',')}`,
    );
  }
}
