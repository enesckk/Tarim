import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../api/client';

/** Register Expo push token with API (best-effort; no-op in Expo Go limitations). */
export async function registerForPushNotificationsAsync(
  accessToken: string | null,
): Promise<string | null> {
  if (!accessToken) return null;

  try {
    // Dynamic import so app still boots if native module missing briefly.
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenResponse.data;
    await api('/api/devices/push-token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
      }),
    });
    return token;
  } catch {
    return null;
  }
}
