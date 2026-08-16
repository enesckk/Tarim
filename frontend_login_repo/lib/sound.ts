'use client'

export type SoundProfile = 'natural-click' | 'glass-drop' | 'deep-pulse'

class SoundManager {
  private ctx: AudioContext | null = null
  public currentProfile: SoundProfile = 'natural-click'

  constructor() {
    if (typeof window !== 'undefined') {
      const initAudio = () => {
        if (!this.ctx) {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
          if (AudioCtx) {
            this.ctx = new AudioCtx()
          }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {})
        }
      }

      window.addEventListener('click', initAudio, { once: true })
      window.addEventListener('keydown', initAudio, { once: true })
      window.addEventListener('touchstart', initAudio, { once: true })
      window.addEventListener('scroll', initAudio, { once: true })
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  playTransition() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }

      const now = ctx.currentTime

      if (this.currentProfile === 'natural-click') {
        // PROFIL 1: Ahşap / Bambu Doğal Dokunuş (Net ve Duyulabilir)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const filter = ctx.createBiquadFilter()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(380, now)
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.07)

        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(900, now)
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.08)

        // Balanced sweet-spot volume level (0.09)
        gain.gain.setValueAtTime(0.09, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.10)
      } else if (this.currentProfile === 'glass-drop') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(523.25, now)
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08)

        gain.gain.setValueAtTime(0.07, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.11)
      } else {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(120, now)
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.15)

        gain.gain.setValueAtTime(0.10, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 0.19)
      }
    } catch {
      // Ignore audio errors gracefully
    }
  }
}

export const soundManager = new SoundManager()
