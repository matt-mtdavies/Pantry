import { imageUrl } from '../lib/utils'
import { avatarEmoji } from '../lib/avatars'

export interface AvatarProps {
  imageKey?: string | null
  avatarId?: string | null
  size?: number
  className?: string
}

export function Avatar({ imageKey, avatarId, size = 40, className }: AvatarProps) {
  const src = imageUrl(imageKey ?? null)

  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <span className={className} aria-hidden="true">
      {avatarEmoji(avatarId ?? 'herb')}
    </span>
  )
}
