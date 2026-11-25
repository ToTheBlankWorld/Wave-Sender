interface ContourFieldProps {
  className?: string
}

export function ContourField({ className }: ContourFieldProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 800 600"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke="currentColor" strokeWidth="1">
        <path d="M-40 410C90 290 150 505 285 390S485 185 620 275s180 40 225-55" />
        <path d="M-35 438C95 318 165 533 300 418s190-205 325-115 180 40 225-55" />
        <path d="M-30 466C100 346 180 561 315 446s190-205 325-115 180 40 225-55" />
        <path d="M-25 494C105 374 195 589 330 474s190-205 325-115 180 40 225-55" />
        <path d="M-20 522C110 402 210 617 345 502s190-205 325-115 180 40 225-55" />
        <path d="M-15 550C115 430 225 645 360 530s190-205 325-115 180 40 225-55" />
        <path d="M-40 310C90 190 155 405 290 290S490 85 625 175s175 40 220-55" />
        <path d="M-35 282C95 162 170 377 305 262s190-205 325-115 175 40 220-55" />
        <path d="M-30 254C100 134 185 349 320 234s190-205 325-115 175 40 220-55" />
        <path d="M-25 226C105 106 200 321 335 206s190-205 325-115 175 40 220-55" />
        <path d="M-20 198C110 78 215 293 350 178s190-205 325-115 175 40 220-55" />
      </g>
    </svg>
  )
}
