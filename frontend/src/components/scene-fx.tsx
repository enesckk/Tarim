'use client'

import type { Chapter } from '@/lib/chapters'

export function SceneFx({ scene }: { scene: Chapter['scene'] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* Moving ambient light sweep */}
      <div className="fx-lightsweep absolute inset-0" />

      {(scene === 'seed' || scene === 'aerial') && <NetworkMesh />}
      {scene === 'phone' && <BreatheGlow className="right-[14%] top-1/2" />}
      {scene === 'product' && <BreatheGlow className="right-[24%] top-[46%]" tone="gold" />}
      {scene === 'training' && <BreatheGlow className="right-[22%] top-[52%]" tone="gold" />}
    </div>
  )
}

function NetworkMesh() {
  const nodes = [
    [22, 82],
    [36, 72],
    [54, 86],
    [68, 68],
    [82, 78],
    [92, 60],
    [48, 56],
  ]
  return (
    <svg
      className="absolute bottom-0 right-0 h-[50%] w-[60%]"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {nodes.map((a, i) =>
        nodes.slice(i + 1).map((b, j) => {
          const d = Math.hypot(a[0] - b[0], a[1] - b[1])
          if (d > 28) return null
          return (
            <line
              key={`${i}-${j}`}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke="#D7B36A"
              strokeWidth="0.12"
              opacity="0.25"
              className="fx-line"
              style={{ animationDelay: `${(i + j) * 0.35}s` }}
            />
          )
        }),
      )}
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n[0]}
          cy={n[1]}
          r="0.5"
          fill="#D7B36A"
          opacity="0.4"
          className="fx-node"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </svg>
  )
}

function BreatheGlow({
  className,
  tone = 'gold',
}: {
  className?: string
  tone?: 'lime' | 'gold'
}) {
  return (
    <div
      className={`fx-breathe absolute h-36 w-36 -translate-y-1/2 rounded-full blur-3xl ${className ?? ''}`}
      style={{
        background: 'radial-gradient(circle, rgba(215,179,106,0.25), transparent 70%)',
      }}
    />
  )
}
