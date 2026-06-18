import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getInvite } from '../lib/api'
import { imageUrl } from '../lib/utils'
import { avatarEmoji } from '../lib/avatars'
import { CollectionIcon, ShareIcon, KitchenIcon } from '../components/icons'
import type { InviterInfo } from '../lib/api'
import styles from './InvitePage.module.css'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const [inviter, setInviter] = useState<InviterInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!token) { setNotFound(true); setLoading(false); return }
    if (!user) {
      try { sessionStorage.setItem('pantry_invite', token) } catch { /* ignore */ }
    }
    getInvite(token)
      .then(setInviter)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token, user, authLoading])

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
        <p className={styles.inviteText}>Share recipes with friends and discover their secret sauces.</p>

        <div className={styles.divider} />

        <ul className={styles.features}>
          <li className={styles.feature}>
            <CollectionIcon size={18} className={styles.featureIcon} />
            <span>Save any recipe in seconds</span>
          </li>
          <li className={styles.feature}>
            <ShareIcon size={18} className={styles.featureIcon} />
            <span>Share recipes with friends and discover their secret sauces</span>
          </li>
          <li className={styles.feature}>
            <KitchenIcon size={18} className={styles.featureIcon} />
            <span>Cook hands-free, step by step</span>
          </li>
        </ul>

        {user ? (
          <>
            <p className={styles.alreadyMember}>You're already on Pantry!</p>
            <Link to="/" className={styles.cta}>Go to my Pantry →</Link>
          </>
        ) : (
          <>
            <Link to={ctaUrl} className={styles.cta}>{ctaLabel}</Link>
            <p className={styles.freeLine}>Free · No credit card needed</p>
            <Link to="/auth" className={styles.signinLink}>
              Already have an account? Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
