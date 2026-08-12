import { api } from "../api/client";

type WebPushKeyResponse = { publicKey: string };

function urlBase64ToBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function keyToBase64(key: ArrayBuffer | null) {
  if (!key) return "";
  const bytes = new Uint8Array(key);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function supportsWebPush() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerWebPush() {
  if (!supportsWebPush())
    throw new Error("Bu tarayıcı Web Push desteklemiyor.");
  if (Notification.permission !== "granted")
    throw new Error("Bildirim izni verilmedi.");

  const { publicKey } = await api<WebPushKeyResponse>(
    "/api/devices/web-push-key",
  );
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBytes(publicKey),
    });
  }

  const token = serializeSubscription(subscription);
  await api("/api/devices/push-token", {
    method: "POST",
    body: JSON.stringify({ token, platform: "web-push" }),
  });
  return subscription;
}

function serializeSubscription(subscription: PushSubscription) {
  return JSON.stringify({
    endpoint: subscription.endpoint,
    p256dh: keyToBase64(subscription.getKey("p256dh")),
    auth: keyToBase64(subscription.getKey("auth")),
  });
}

export async function hasWebPushSubscription() {
  if (!supportsWebPush()) return false;
  const registration = await navigator.serviceWorker.ready;
  return Boolean(await registration.pushManager.getSubscription());
}

export async function unregisterWebPush() {
  if (!supportsWebPush()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await api("/api/devices/push-token/unregister", {
      method: "POST",
      body: JSON.stringify({
        token: serializeSubscription(subscription),
        platform: "web-push",
      }),
    });
  } finally {
    await subscription.unsubscribe();
  }
}
