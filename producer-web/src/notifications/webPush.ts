import { api } from '../api/client'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

/** Register browser Web Push subscription with AMS (best-effort). */
export async function registerWebPush(accessToken: string | null): Promise<boolean> {
  if (!accessToken) return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  try {
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
    if (permission !== 'granted') return false

    const { publicKey } = await api<{ publicKey: string }>(
      '/api/devices/web-push-public-key',
      {},
      accessToken,
    )
    if (!publicKey) return false

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }

    await api(
      '/api/devices/push-token',
      {
        method: 'POST',
        body: JSON.stringify({
          token: JSON.stringify(subscription.toJSON()),
          platform: 'web',
        }),
      },
      accessToken,
    )
    return true
  } catch {
    return false
  }
}
