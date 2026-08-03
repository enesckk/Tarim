import axios from 'axios';
import { getEnv } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

/** Refresh this many ms before actual expiry. */
const REFRESH_MARGIN_MS = 60_000;

class CopernicusAuthService {
  private cache: TokenCache | null = null;
  private refreshPromise: Promise<string> | null = null;

  async getAccessToken(): Promise<string> {
    if (this.cache && Date.now() < this.cache.expiresAt - REFRESH_MARGIN_MS) {
      return this.cache.accessToken;
    }

    // Deduplicate concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.fetchToken().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async fetchToken(): Promise<string> {
    const env = getEnv();

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.COPERNICUS_CLIENT_ID,
      client_secret: env.COPERNICUS_CLIENT_SECRET,
    });

    try {
      const response = await axios.post<{
        access_token: string;
        expires_in: number;
        token_type: string;
      }>(env.COPERNICUS_TOKEN_URL, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30_000,
      });

      const { access_token, expires_in } = response.data;

      if (!access_token) {
        throw new ApiError(502, 'Copernicus token response missing access_token');
      }

      this.cache = {
        accessToken: access_token,
        expiresAt: Date.now() + expires_in * 1000,
      };

      return access_token;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 502;
        throw new ApiError(
          status >= 400 && status < 600 ? status : 502,
          'Failed to obtain Copernicus access token',
          { status: error.response?.status },
        );
      }

      throw new ApiError(502, 'Failed to obtain Copernicus access token');
    }
  }

  /** Clears cached token (useful in tests). */
  clearCache(): void {
    this.cache = null;
  }
}

export const copernicusAuthService = new CopernicusAuthService();
