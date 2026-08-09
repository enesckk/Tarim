/**
 * Apple & Framer Engineering Motion System Constants
 * Centralized easing, durations, and GPU animation tokens.
 */

export const EASE_APPLE_CINEMATIC = 'cubic-bezier(0.22, 1, 0.36, 1)' as const
export const EASE_BUTTON_FAST = 'cubic-bezier(0.22, 1, 0.36, 1)' as const

export const DURATION_SECTION_TRANSITION = 800 // ms
export const DURATION_BUTTON_HOVER = 180 // ms
export const DURATION_TIMELINE_STEP = 300 // ms

export const MOTION_PARALLAX_Y_PERCENT = 4
export const MOTION_IMAGE_SCALE_START = 1.0
export const MOTION_IMAGE_SCALE_END = 1.02

export const SECTION_ART_DIRECTION: Record<string, { className: string }> = {
  baslangic: { className: 'object-[85%_50%]' },
  analiz: { className: 'object-[88%_40%]' },
  vizyon: { className: 'object-[85%_48%]' },
  'dijital-takip': { className: 'object-[92%_45%]' },
  egitim: { className: 'object-[88%_52%]' },
  uretim: { className: 'object-[85%_50%]' },
  hasat: { className: 'object-[88%_48%]' },
  pazara: { className: 'object-[90%_55%]' },
}
