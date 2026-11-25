interface WaveBackdropProps {
  className?: string
}

export function WaveBackdrop({ className }: WaveBackdropProps) {
  return (
    <svg
      aria-hidden="true"
      className={`wave-backdrop ${className ?? ''}`}
      viewBox="0 0 600 180"
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d="M0 92C25 92 25 44 50 44s25 104 50 104 25-128 50-128 25 148 50 148 25-116 50-116 25 76 50 76 25-52 50-52 25 28 50 28 25-20 50-20 25 8 50 8 25-4 50-4"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M0 102C25 102 25 64 50 64s25 84 50 84 25-104 50-104 25 124 50 124 25-96 50-96 25 60 50 60 25-40 50-40 25 20 50 20 25-14 50-14 25 6 50 6 25-2 50-2"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        opacity=".38"
      />
    </svg>
  )
}
