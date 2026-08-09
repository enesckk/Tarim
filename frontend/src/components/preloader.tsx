'use client'

import { useEffect, memo } from 'react'

interface PreloaderProps {
  onComplete?: () => void
}

function PreloaderComponent({ onComplete }: PreloaderProps) {
  useEffect(() => {
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
    if (onComplete) onComplete()
  }, [onComplete])

  return null
}

export const Preloader = memo(PreloaderComponent)
