import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API base URL (prefer EXPO_PUBLIC_API_URL).
 * - iOS Simulator / web: http://localhost:5109 or http://127.0.0.1:5109
 * - Android emulator: http://10.0.2.2:5109
 * - Physical device: EXPO_PUBLIC_API_URL=http://<LAN-IP>:5109
 *   and run API bound to 0.0.0.0:5109 (default launch profile).
 */
function resolveDefaultBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  if (extra?.apiBaseUrl) return extra.apiBaseUrl.replace(/\/$/, '');

  if (Platform.OS === 'android') return 'http://10.0.2.2:5109';
  return 'http://127.0.0.1:5109';
}

export const API_BASE_URL = resolveDefaultBaseUrl();
