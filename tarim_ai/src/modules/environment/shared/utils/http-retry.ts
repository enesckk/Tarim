import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { ApiError } from '../../../../utils/api-error.js';

export interface RetryOptions {
  maxRetries: number;
  timeoutsRetryable?: boolean;
  baseDelayMs?: number;
  secondDelayMs?: number;
  providerLabel: string;
  timeoutStatus?: number;
  unavailableStatus?: number;
  rateLimitStatus?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableAxiosError(error: AxiosError): boolean {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return true;
  }
  const status = error.response?.status;
  if (status == null) {
    // network error
    return true;
  }
  if (status === 429) {
    return true;
  }
  if (status >= 500) {
    return true;
  }
  return false;
}

export async function axiosGetWithRetry<T>(
  url: string,
  config: AxiosRequestConfig,
  options: RetryOptions,
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxRetries + 1);
  const delays = [options.baseDelayMs ?? 500, options.secondDelayMs ?? 1500];
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get<T>(url, config);
      return response.data;
    } catch (error) {
      lastError = error;
      if (!axios.isAxiosError(error)) {
        throw mapProviderError(error, options);
      }

      const retryable = isRetryableAxiosError(error);
      const status = error.response?.status;

      if (!retryable || attempt >= maxAttempts) {
        throw mapAxiosProviderError(error, options);
      }

      const delay = delays[Math.min(attempt - 1, delays.length - 1)] ?? 1500;
      console.warn(`[${options.providerLabel}] retry`, {
        attempt,
        status,
        code: error.code,
        delayMs: delay,
      });
      await sleep(delay);
    }
  }

  throw mapProviderError(lastError, options);
}

function mapAxiosProviderError(error: AxiosError, options: RetryOptions): ApiError {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError(
      options.timeoutStatus ?? 504,
      `${options.providerLabel} timed out.`,
    );
  }

  const status = error.response?.status;
  if (status === 429) {
    return new ApiError(
      options.rateLimitStatus ?? 503,
      `${options.providerLabel} rate limited.`,
    );
  }
  if (status != null && status >= 400 && status < 500) {
    return new ApiError(
      502,
      `${options.providerLabel} rejected the request.`,
    );
  }

  return new ApiError(
    options.unavailableStatus ?? 502,
    `${options.providerLabel} is unavailable.`,
  );
}

function mapProviderError(error: unknown, options: RetryOptions): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  return new ApiError(
    options.unavailableStatus ?? 502,
    `${options.providerLabel} is unavailable.`,
  );
}
