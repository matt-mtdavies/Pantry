import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { getPublicProfile } from '../lib/api'
import { imageUrl, formatTime } from '../lib/utils'
import { Avatar } from '../components/Avatar'
import { DishIcon, StarIcon, ClockIcon } from '../components/icons'
import type { PublicProfile } from '../types'
import styles from './PublicProfilePage.module.css'

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    getPublicProfile(id)
      .then(setProfile)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="page-shell">
        <Navigation />
        <main className="page-main">
          <div className={styles.heroSkeleton}>
            <div className={`skeleton ${styles.avatarSkeleton}`} />
            <div className={`skeleton ${styles.nameSkeleton}`} />
            <div className={`skeleton ${styles.subSkeleton}`} />
          </div>
          <div className="wide-col">
            <div className={styles.grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`skeleton ${styles.cardSkeleton}`} />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="page-shell">
        <Navigation />
        <main className="page-main">
          <div className={styles.notFound}>
            <DishIcon size={48} className={styles.notFoundIcon} />
            <h1 className={styles.notFoundTitle}>Profile not found</h1>
            <p className={styles.notFoundText}>This profile is private or doesn't exist.</p>
            <Link to="/leaderboard" className={styles.backBtn}>Back to Community</Link>
          </div>
        </main>
      </div>
    )
  }

  const joinedDate = new Date(profile.created_at * 1000).toLocaleDateString('en-GB', {
    month: 'long', year: 'numeric',
  })

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        {/* Profile hero */}
        <div className={styles.hero}>
          <div className="wide-col">
            <div className={styles.avatarWrap}>
              <Avatar
                imageKey={profile.avatar_image_key}
                avatarId={profile.avatar_id}
                size={80}
                className={styles.avatar}
              />
            </div>
            <h1 className={styles.name}>{profile.display_name ?? 'Anonymous'}</h1>
            {profile.country && <p className={styles.country}>{profile.country}</p>}
            <p className={styles.joined}>Member since {joinedDate}</p>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{profile.recipe_count}</span>
                <span className={styles.statLabel}>Recipe{profile.recipe_count !== 1 ? 's' : ''}</span>
              </div>
              {profile.avg_rating != null && (
                <div className={styles.stat}>
                  <span className={styles.statValue}>
                    <StarIcon size={14} className={styles.statStar} />
                    {profile.avg_rating.toFixed(1)}
                  </span>
                  <span className={styles.statLabel}>Avg rating</span>
                </div>
              )}
              {profile.total_ratings > 0 && (
                <div className={styles.stat}>
                  <span className={styles.statValue}>{profile.total_ratings}</span>
                  <span className={styles.statLabel}>Rating{profile.total_ratings !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recipe grid */}
        <div className="wide-col">
          {profile.recipes.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyText}>No recipes yet.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {profile.recipes.map(r => (
                <ProfileRecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function ProfileRecipeCard({ recipe: r }: { recipe: PublicProfile['recipes'][number] }) {
  const thumb = r.hero_image_key ? imageUrl(r.hero_image_key) : null
  const totalTime = (r.prep_time ?? 0) + (r.cook_time ?? 0)

  return (
    <Link to={`/recipe/${r.id}`} className={styles.card}>
      <div className={styles.cardThumb}>
        {thumb
          ? <img src={thumb} alt={r.title} className={styles.cardImg} />
          : <DishIcon size={32} className={styles.cardPlaceholder} />
        }
      </div>
      <div className={styles.cardBody}>
        <p className={styles.cardTitle}>{r.title}</p>
        <div className={styles.cardMeta}>
          {totalTime > 0 && (
            <span className={styles.cardMetaItem}>
              <ClockIcon size={11} className={styles.cardMetaIcon} />
              {formatTime(totalTime)}
            </span>
          )}
          {r.avg_rating != null && (
            <span className={styles.cardMetaItem}>
              <StarIcon size={11} className={styles.cardStarIcon} />
              {r.avg_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
