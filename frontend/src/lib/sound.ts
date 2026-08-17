'use client'

export type SoundProfile = 'natural-click' | 'glass-drop' | 'deep-pulse'

class SoundManager {
  public currentProfile: SoundProfile = 'natural-click'

  playTransition() {
    // Sound disabled by request
  }
}

export const soundManager = new SoundManager()
