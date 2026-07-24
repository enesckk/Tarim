import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API base URL (prefer EXPO_PUBLIC_API_URL).
 * - Expo Go / physical device: auto-detect LAN IP from Expo hostUri → :5109
 * - iOS Simulator: http://127.0.0.1:5109
 * - Android emulator: http://10.0.2.2:5109
 * Override: EXPO_PUBLIC_API_URL=http://<LAN-IP>:5109
 */
function resolveExpoLanHost(): string | null {
  const candidates: Array<string | null | undefined> = [
    Constants.expoConfig?.hostUri,
    // Expo Go (SDK 49+)
    (
      Constants as {
        manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
      }
    ).manifest2?.extra?.expoGo?.debuggerHost,
    // Legacy manifest
    (Constants as { manifest?: { debuggerHost?: string } }).manifest
      ?.debuggerHost,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const host = raw.split(':')[0]?.trim();
    if (
      host &&
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      host !== '0.0.0.0'
    ) {
      return host;
    }
  }
  return null;
}

function isLoopbackUrl(url: string): boolean {
  return /:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url);
}

function resolveDefaultBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  // Physical device / Expo Go on LAN — use same machine Expo is served from
  const lan = resolveExpoLanHost();
  if (lan) return `http://${lan}:5109`;

  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  if (extra?.apiBaseUrl) {
    const url = extra.apiBaseUrl.replace(/\/$/, '');
    // Ignore loopback baked into app.json when we couldn't resolve a LAN host
    // (simulator will fall through to Platform defaults below if needed)
    if (!isLoopbackUrl(url)) return url;
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:5109';
  return 'http://127.0.0.1:5109';
}

export const API_BASE_URL = resolveDefaultBaseUrl();
