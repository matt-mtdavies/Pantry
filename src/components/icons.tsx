interface IconProps {
  size?: number
  className?: string
}

export function ClockIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5v3.75L10.5 10" />
    </svg>
  )
}

export function PersonIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M2.5 14c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5" />
    </svg>
  )
}

export function HeartIcon({ filled = false, size = 16, className }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M8 13.5C8 13.5 2 9.5 2 5.75a3.25 3.25 0 016-1.68A3.25 3.25 0 0114 5.75C14 9.5 8 13.5 8 13.5z" />
    </svg>
  )
}

export function SearchIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M11 11l2.5 2.5" />
    </svg>
  )
}

export function DishIcon({ size = 32, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M4 17h24" />
      <path d="M4 17C4 23.08 9.37 28 16 28S28 23.08 28 17" />
      <path d="M11 10h10" />
      <path d="M16 10V8" />
    </svg>
  )
}

export function WarningIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M8 1.5L14.5 13.5h-13L8 1.5z" />
      <path d="M8 6v3.5" />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function CameraIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M1.5 7a2 2 0 012-2h1.73l1.5-2h6.54l1.5 2H16.5a2 2 0 012 2v9a2 2 0 01-2 2h-13a2 2 0 01-2-2V7z" />
      <circle cx="10" cy="11.5" r="2.75" />
    </svg>
  )
}

export function ShareIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M8 1.5V10" />
      <path d="M5 4.5L8 1.5l3 3" />
      <path d="M2.5 10.5V14h11v-3.5" />
    </svg>
  )
}

export function EditIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" />
    </svg>
  )
}

export function TrophyIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M4.5 2h7v5.5c0 1.93-1.57 3.5-3.5 3.5S4.5 9.43 4.5 7.5V2z" />
      <path d="M4.5 3.5C3 3.5 2 4.5 2 6s1 2.5 2.5 2.5" />
      <path d="M11.5 3.5C13 3.5 14 4.5 14 6s-1 2.5-2.5 2.5" />
      <path d="M8 11v2.5" />
      <path d="M5.5 13.5h5" />
    </svg>
  )
}

export function StarIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" stroke="none" aria-hidden="true" className={className}>
      <path d="M8 2l1.65 3.35L13.5 6l-2.75 2.68.65 3.82L8 10.65l-3.4 1.85.65-3.82L2.5 6l3.85-.65L8 2z" />
    </svg>
  )
}
