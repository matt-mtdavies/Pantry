import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getInvite } from '../lib/api'
import { imageUrl } from '../lib/utils'
import { avatarEmoji } from '../lib/avatars'
import { CollectionIcon, IngredientIcon, KitchenIcon } from '../components/icons'
import type { InviterInfo } from '../lib/api'
import styles from './InvitePage.module.css'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [inviter, setInviter] = useState<InviterInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (user) { navigate('/'); return }
    if (!token) { setNotFound(true); setLoading(false); return }
    try { sessionStorage.setItem('pantry_invite', token) } catch { /* ignore */ }
    getInvite(token)
      .then(setInviter)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token, user, authLoading, navigate])

  if (authLoading || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.brand}>Pantry</div>
        <div className={styles.card}>
          <div className={styles.avatarSkeleton} />
          <div className={styles.nameSkeleton} />
          <div className={styles.textSkeleton} />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={styles.page}>
        <div className={styles.brand}>Pantry</div>
        <div className={styles.card}>
          <p className={styles.notFoundText}>This invite link isn't valid or has expired.</p>
          <Link to="/auth?mode=register" className={styles.cta}>Create a free account →</Link>
          <Link to="/auth" className={styles.signinLink}>Already have an account? Sign in</Link>
        </div>
      </div>
    )
  }

  const firstName = inviter?.display_name?.split(' ')[0] ?? null
  const ctaLabel = firstName ? `Accept ${firstName}'s invite →` : 'Accept invite →'
  const ctaUrl = `/auth?mode=register${token ? `&invite=${token}` : ''}`

  return (
    <div className={styles.page}>
      <div className={styles.brand}>Pantry</div>

      <div className={styles.card}>
        <div className={styles.avatarRing}>
          <div className={styles.avatarInner}>
            {inviter?.avatar_image_key
              ? <img src={imageUrl(inviter.avatar_image_key)!} alt="" className={styles.avatarImg} />
              : <span className={styles.avatarEmoji}>{avatarEmoji(inviter?.avatar_id ?? 'herb')}</span>
            }
          </div>
        </div>

        <h1 className={styles.inviterName}>
          {inviter?.display_name ?? 'A friend'}
        </h1>
        <p className={styles.inviteText}>invited you to Pantry</p>

        <div className={styles.divider} />

        <ul className={styles.features}>
          <li className={styles.feature}>
            <CollectionIcon size={18} className={styles.featureIcon} />
            <span>Save any recipe in seconds</span>
          </li>
          <li className={styles.feature}>
            <IngredientIcon size={18} className={styles.featureIcon} />
            <span>Scale servings for any crowd</span>
          </li>
          <li className={styles.feature}>
            <KitchenIcon size={18} className={styles.featureIcon} />
            <span>Cook hands-free, step by step</span>
          </li>
        </ul>

        <Link to={ctaUrl} className={styles.cta}>{ctaLabel}</Link>

        <p className={styles.freeLine}>Free · No credit card needed</p>

        <Link to="/auth" className={styles.signinLink}>
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  )
}
