import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_KEY = 'ams_access_token';
const REFRESH_KEY = 'ams_refresh_token';
const USER_KEY = 'ams_user_json';

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export type StoredUser = {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
};

export async function saveSession(
  accessToken: string,
  refreshToken: string,
  user: StoredUser,
) {
  await setItem(ACCESS_KEY, accessToken);
  await setItem(REFRESH_KEY, refreshToken);
  await setItem(USER_KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<{
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
} | null> {
  const accessToken = await getItem(ACCESS_KEY);
  const refreshToken = await getItem(REFRESH_KEY);
  const userJson = await getItem(USER_KEY);
  if (!accessToken || !refreshToken || !userJson) return null;
  return { accessToken, refreshToken, user: JSON.parse(userJson) as StoredUser };
}

export async function clearSession() {
  await deleteItem(ACCESS_KEY);
  await deleteItem(REFRESH_KEY);
  await deleteItem(USER_KEY);
}

export async function updateTokens(accessToken: string, refreshToken: string) {
  await setItem(ACCESS_KEY, accessToken);
  await setItem(REFRESH_KEY, refreshToken);
}
