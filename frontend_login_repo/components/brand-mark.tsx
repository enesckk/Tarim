export function BrandMark({
  className,
  tone = 'white',
}: {
  className?: string
  tone?: 'white' | 'green'
}) {
  const stroke = tone === 'white' ? '#FFFFFF' : '#3D6436'
  return (
    <svg
      viewBox="0 0 48 52"
      className={className}
      fill="none"
      aria-hidden="true"
      role="img"
    >
      <path
        d="M24 2 44 13v26L24 50 4 39V13L24 2Z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <path
        d="M24 34c0-7 4-12 11-13-1 8-5 12-11 13Zm0 0c0-7-4-12-11-13 1 8 5 12 11 13Zm0 0v6"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
