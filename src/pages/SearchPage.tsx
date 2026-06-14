import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { searchPublicRecipes } from '../lib/api'
import { imageUrl, formatTime } from '../lib/utils'
import type { Recipe } from '../types'
import styles from './SearchPage.module.css'

const AVATARS: Record<string, string> = {
  herb: '🌿', lemon: '🍋', pepper: '🌶️', apple: '🍎', mushroom: '🍄', carrot: '🥕',
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = (q: string) => {
    setLoading(true)
    searchPublicRecipes(q)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    doSearch('')
  }, [])

  const handleChange = (q: string) => {
    setQuery(q)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(q), 350)
  }

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className={styles.hero}>
          <div className="wide-col">
            <h1 className={styles.heroTitle}>Explore recipes</h1>
            <p className={styles.heroSub}>Browse dishes shared by the whole community, ranked by rating.</p>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon} aria-hidden="true">🔍</span>
              <input
                type="search"
                value={query}
                onChange={e => handleChange(e.target.value)}
                placeholder="Search by name, ingredient, tag…"
                className={styles.search}
                aria-label="Search all recipes"
                autoFocus
              />
            </div>
          </div>
        </div>

        <div className="wide-col">
          {loading ? (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`skeleton ${styles.skeletonCard}`} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No recipes found</p>
              <p className={styles.emptySub}>
                {query ? `No public recipes match "${query}".` : 'No public recipes yet — be the first to share one!'}
              </p>
            </div>
          ) : (
            <>
              <p className={styles.count}>{results.length} recipe{results.length !== 1 ? 's' : ''}</p>
              <div className={styles.grid}>
                {results.map(r => (
                  <SearchCard key={r.id} recipe={r} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function SearchCard({ recipe: r }: { recipe: Recipe }) {
  const thumb = r.hero_image_key ? imageUrl(r.hero_image_key) : null
  const totalTime = (r.prep_time ?? 0) + (r.cook_time ?? 0)
  const stars = formatStars(r.avg_rating ?? 0)

  return (
    <Link to={`/recipe/${r.id}`} className={styles.card}>
      <div className={styles.cardImg}>
        {thumb
          ? <img src={thumb} alt={r.title} className={styles.cardPhoto} />
          : <span className={styles.cardPlaceholder}>🍽️</span>
        }
        {(r.rating_count ?? 0) > 0 && (
          <div className={styles.cardBadge}>
            <span className={styles.badgeStar}>★</span>
            <span>{(r.avg_rating ?? 0).toFixed(1)}</span>
            <span className={styles.badgeCount}>({r.rating_count})</span>
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        {(r.tags ?? []).length > 0 && (
          <div className={styles.cardTags}>
            {(r.tags as string[]).slice(0, 2).map(t => (
              <span key={t} className={styles.cardTag}>{t}</span>
            ))}
          </div>
        )}
        <h3 className={styles.cardTitle}>{r.title}</h3>
        <div className={styles.cardMeta}>
          {totalTime > 0 && <span>{formatTime(totalTime)}</span>}
        </div>
        {(r.avg_rating ?? 0) > 0 && (
          <div className={styles.cardStars} aria-label={`${r.avg_rating?.toFixed(1)} out of 5 stars`}>
            {stars}
          </div>
        )}
        <div className={styles.cardAuthor}>
          <span className={styles.authorAvatar}>
            {AVATARS[r.author_avatar ?? ''] ?? '🌿'}
          </span>
          <span className={styles.authorName}>
            {r.author_name ?? 'Anonymous'}
          </span>
        </div>
      </div>
    </Link>
  )
}

function formatStars(avg: number): string {
  const full = Math.round(avg)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}
