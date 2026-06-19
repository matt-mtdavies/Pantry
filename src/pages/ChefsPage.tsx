import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { Avatar } from '../components/Avatar'
import { getChefs, followChef, unfollowChef } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { StarIcon } from '../components/icons'
import type { Chef } from '../types'
import styles from './ChefsPage.module.css'

export default function ChefsPage() {
  const { user } = useAuth()
  const [chefs, setChefs] = useState<Chef[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    getChefs()
      .then(setChefs)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chefs
    return chefs.filter(c => c.display_name?.toLowerCase().includes(q) || c.country?.toLowerCase().includes(q))
  }, [chefs, query])

  const handleFollow = async (chef: Chef) => {
    const prev = chef.is_following
    // Optimistic update
    setChefs(cs => cs.map(c => c.id === chef.id
      ? { ...c, is_following: !prev, follower_count: c.follower_count + (prev ? -1 : 1) }
      : c
    ))
    try {
      const res = prev ? await unfollowChef(chef.id) : await followChef(chef.id)
      setChefs(cs => cs.map(c => c.id === chef.id
        ? { ...c, is_following: res.following, follower_count: res.follower_count }
        : c
      ))
    } catch {
      // Revert on error
      setChefs(cs => cs.map(c => c.id === chef.id
        ? { ...c, is_following: prev, follower_count: c.follower_count + (prev ? 1 : -1) }
        : c
      ))
    }
  }

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className="wide-col">
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Chefs</h1>
              <p className={styles.subtitle}>Discover cooks sharing their recipes</p>
            </div>
          </div>

          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              className={styles.search}
              type="search"
              placeholder="Search chefs…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search chefs"
            />
          </div>

          {loading ? (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`skeleton ${styles.cardSkeleton}`} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyText}>{query ? 'No chefs match your search.' : 'No chefs yet.'}</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map(chef => (
                <ChefCard
                  key={chef.id}
                  chef={chef}
                  isOwnProfile={chef.id === user?.id}
                  onFollow={() => handleFollow(chef)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function ChefCard({ chef, isOwnProfile, onFollow }: {
  chef: Chef
  isOwnProfile: boolean
  onFollow: () => void
}) {
  return (
    <div className={styles.card}>
      <Link to={`/user/${chef.id}`} className={styles.cardLink}>
        <Avatar
          imageKey={chef.avatar_image_key}
          avatarId={chef.avatar_id}
          size={72}
          className={styles.avatar}
        />
        <div className={styles.identity}>
          <p className={styles.name}>{chef.display_name ?? 'Anonymous'}</p>
          <p className={styles.country}>{chef.country ?? ''}</p>
        </div>

        <div className={styles.stats}>
          <span className={styles.stat}>
            <strong>{chef.recipe_count}</strong>
            <span> recipe{chef.recipe_count !== 1 ? 's' : ''}</span>
          </span>
          {chef.avg_rating != null && (
            <span className={styles.stat}>
              <StarIcon size={11} className={styles.star} />
              <strong>{chef.avg_rating.toFixed(1)}</strong>
            </span>
          )}
          <span className={styles.stat}>
            <strong>{chef.follower_count}</strong>
            <span> follower{chef.follower_count !== 1 ? 's' : ''}</span>
          </span>
        </div>
        </Link>

      {!isOwnProfile && (
        <button
          className={`${styles.followBtn} ${chef.is_following ? styles.following : ''}`}
          onClick={onFollow}
        >
          {chef.is_following ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  )
}
