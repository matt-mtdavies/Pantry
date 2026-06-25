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

export function SunIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.7 3.7l1.06 1.06M11.24 11.24l1.06 1.06M12.3 3.7l-1.06 1.06M4.76 11.24l-1.06 1.06" />
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

export function DiceIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <rect x="1.75" y="1.75" width="12.5" height="12.5" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.25" cy="5.25" r="1.1" fill="currentColor" />
      <circle cx="10.75" cy="5.25" r="1.1" fill="currentColor" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" />
      <circle cx="5.25" cy="10.75" r="1.1" fill="currentColor" />
      <circle cx="10.75" cy="10.75" r="1.1" fill="currentColor" />
    </svg>
  )
}

export function CollectionIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M1.5 5.5h13" />
      <path d="M1.5 5.5v7a1 1 0 001 1h11a1 1 0 001-1v-7" />
      <path d="M1.5 5.5l1.5-3h9l1.5 3" />
      <path d="M6 8.5h4" />
    </svg>
  )
}

export function TechniqueIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="8" cy="5" r="3" />
      <path d="M8 8v6.5" />
    </svg>
  )
}

export function IngredientIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M8 13.5C8 13.5 2.5 9.5 2.5 6C2.5 3 5 1.5 8 1.5C11 1.5 13.5 3 13.5 6C13.5 9.5 8 13.5 8 13.5Z" />
      <path d="M8 1.5V13.5" />
    </svg>
  )
}

export function StorageIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M5.5 4.5V2.5h5v2" />
      <path d="M3.5 4.5h9" />
      <path d="M4 4.5v8a1 1 0 001 1h6a1 1 0 001-1v-8" />
    </svg>
  )
}

export function FlavourIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M8 2C8 2 13 7 13 10.5a5 5 0 01-10 0C3 7 8 2 8 2z" />
    </svg>
  )
}

export function ArrowUpIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M8 12V4M4.5 7.5L8 4l3.5 3.5" />
    </svg>
  )
}

export function ArrowDownIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M8 4v8M4.5 8.5L8 12l3.5-3.5" />
    </svg>
  )
}

export function MailIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
      <path d="M1.5 5l6.5 4.5L14.5 5" />
    </svg>
  )
}

export function CopyIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <rect x="5.5" y="5.5" width="8" height="9" rx="1.5" />
      <path d="M10.5 5.5V3.5a1.5 1.5 0 00-1.5-1.5H3.5a1.5 1.5 0 00-1.5 1.5v6a1.5 1.5 0 001.5 1.5h2" />
    </svg>
  )
}

export function CheckIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M2.5 8.5l4 4 7-8" />
    </svg>
  )
}

export function KitchenIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M3 7.5h10v5a1 1 0 01-1 1H4a1 1 0 01-1-1v-5z" />
      <path d="M2.5 7.5h11" />
      <path d="M5.5 7.5V6h5v1.5" />
      <path d="M1 10h2M13 10h2" />
    </svg>
  )
}
