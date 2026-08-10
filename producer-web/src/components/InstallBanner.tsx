import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(() => localStorage.getItem('pwa-install-dismissed') === '1')
  const [isStandalone, setIsStandalone] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    setIsStandalone(standalone)

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent)
    setIosHint(isIos && isSafari && !standalone)

    function onBip(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  if (hidden || isStandalone) return null
  if (!deferred && !iosHint) return null

  return (
    <div className="install-banner" role="region" aria-label="Uygulamayı ana ekrana ekle">
      <div>
        <strong>Ana ekrana ekle</strong>
        <p>
          {iosHint
            ? 'Safari’de Paylaş → Ana Ekrana Ekle ile uygulama gibi kullanın.'
            : 'Mağaza indirmeden logo olarak ekleyin; bildirimleri de alabilirsiniz.'}
        </p>
      </div>
      <div className="install-actions">
        {deferred ? (
          <button
            type="button"
            className="btn primary"
            onClick={async () => {
              await deferred.prompt()
              await deferred.userChoice
              setDeferred(null)
            }}
          >
            Ekle
          </button>
        ) : null}
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            localStorage.setItem('pwa-install-dismissed', '1')
            setHidden(true)
          }}
        >
          Sonra
        </button>
      </div>
    </div>
  )
}
