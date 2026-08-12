import { useCallback, useEffect, useState } from 'react'
import { Download, RefreshCw, WifiOff, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './pwa.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'tarim-pwa-install-dismissed-at'
const DISMISS_DAYS = 14

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function recentlyDismissed() {
  const value = Number(localStorage.getItem(DISMISS_KEY))
  return Number.isFinite(value) && Date.now() - value < DISMISS_DAYS * 24 * 60 * 60 * 1000
}

export function PwaManager() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [installed, setInstalled] = useState(isStandalone())
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisterError(error) {
      console.error('PWA service worker kaydı başarısız oldu.', error)
    },
  })

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
      localStorage.removeItem(DISMISS_KEY)
    }
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const dismissInstall = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setInstallPrompt(null)
    setShowIosHelp(false)
  }, [])

  const install = useCallback(async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') setInstallPrompt(null)
      return
    }
    if (isIos()) setShowIosHelp(true)
  }, [installPrompt])

  const canOfferInstall = !installed && !recentlyDismissed() && (Boolean(installPrompt) || isIos())

  return (
    <div className="pwa-notices" aria-live="polite" aria-atomic="true">
      {!online ? (
        <section className="pwa-notice pwa-notice-offline" role="status">
          <WifiOff aria-hidden="true" />
          <div><strong>Çevrimdışısınız</strong><span>Görüntülenen sayfalar kullanılabilir; veri gönderme işlemleri bağlantı gelince yapılmalıdır.</span></div>
        </section>
      ) : null}
      {needRefresh ? (
        <section className="pwa-notice" role="status">
          <RefreshCw aria-hidden="true" />
          <div><strong>Yeni sürüm hazır</strong><span>En güncel özellikleri kullanmak için uygulamayı yenileyin.</span></div>
          <button type="button" className="pwa-primary" onClick={() => void updateServiceWorker(true)}>Güncelle</button>
          <button type="button" className="pwa-icon-button" aria-label="Bildirimi kapat" onClick={() => setNeedRefresh(false)}><X aria-hidden="true" /></button>
        </section>
      ) : null}
      {offlineReady ? (
        <section className="pwa-notice" role="status">
          <Download aria-hidden="true" />
          <div><strong>Çevrimdışı kullanım hazır</strong><span>Uygulama kabuğu bu cihazda güvenli biçimde saklandı.</span></div>
          <button type="button" className="pwa-icon-button" aria-label="Bildirimi kapat" onClick={() => setOfflineReady(false)}><X aria-hidden="true" /></button>
        </section>
      ) : null}
      {canOfferInstall ? (
        <section className="pwa-notice pwa-install" role="status">
          <Download aria-hidden="true" />
          <div><strong>Tarım'ı ana ekranınıza ekleyin</strong><span>Mağazaya gerek olmadan, uygulama gibi hızlıca açın.</span></div>
          <button type="button" className="pwa-primary" onClick={() => void install()}>Ana ekrana ekle</button>
          <button type="button" className="pwa-icon-button" aria-label="Kurulum önerisini kapat" onClick={dismissInstall}><X aria-hidden="true" /></button>
        </section>
      ) : null}
      {showIosHelp ? (
        <section className="pwa-notice pwa-ios-help" role="dialog" aria-label="iPhone ve iPad kurulum açıklaması">
          <Download aria-hidden="true" />
          <div><strong>iPhone veya iPad'e ekleme</strong><span>Safari'de Paylaş düğmesine dokunun, ardından “Ana Ekrana Ekle” seçeneğini seçin.</span></div>
          <button type="button" className="pwa-icon-button" aria-label="Açıklamayı kapat" onClick={() => setShowIosHelp(false)}><X aria-hidden="true" /></button>
        </section>
      ) : null}
    </div>
  )
}
