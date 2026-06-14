import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { searchPublicRecipes } from '../lib/api'
import { imageUrl, formatTime } from '../lib/utils'
import { getCurrencySymbol } from '../lib/currency'
import type { Recipe } from '../types'
import styles from './SearchPage.module.css'

const AVATARS: Record<string, string> = {
  herb: '🌿', lemon: '🍋', pepper: '🌶️', apple: '🍎', mushroom: '🍄', carrot: '🥕',
}

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Other']
const AGE_OPTIONS = ['Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+']

interface Filters {
  country: string
  gender: string
  age_bracket: string
  cal_max: string
  cost_max: string
}

const EMPTY_FILTERS: Filters = { country: '', gender: '', age_bracket: '', cal_max: '', cost_max: '' }

function activeFilterCount(f: Filters) {
  return [f.country, f.gender, f.age_bracket, f.cal_max, f.cost_max].filter(Boolean).length
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [results, setResults] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback((q: string, f: Filters) => {
    setLoading(true)
    const params = new URLSearchParams({ q })
    if (f.country)     params.set('country', f.country)
    if (f.gender)      params.set('gender', f.gender)
    if (f.age_bracket) params.set('age_bracket', f.age_bracket)
    if (f.cal_max)     params.set('cal_max', f.cal_max)
    if (f.cost_max)    params.set('cost_max', f.cost_max)
    searchPublicRecipes(params.toString())
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    doSearch('', EMPTY_FILTERS)
  }, [doSearch])

  const handleQueryChange = (q: string) => {
    setQuery(q)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(q, filters), 350)
  }

  const handleFilterChange = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(query, next), 350)
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    doSearch(query, EMPTY_FILTERS)
  }

  const activeCount = activeFilterCount(filters)

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className={styles.hero}>
          <div className="wide-col">
            <h1 className={styles.heroTitle}>Explore recipes</h1>
            <p className={styles.heroSub}>Browse dishes shared by the community, ranked by rating.</p>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon} aria-hidden="true">🔍</span>
              <input
                type="search"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search by name, ingredient, tag…"
                className={styles.search}
                aria-label="Search all recipes"
                autoFocus
              />
            </div>
          </div>
        </div>

        <div className="wide-col">
          {/* Filter toggle */}
          <div className={styles.filterBar}>
            <button
              className={`${styles.filterToggle} ${filtersOpen ? styles.filterToggleOpen : ''}`}
              onClick={() => setFiltersOpen(o => !o)}
            >
              ⚙ Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
            {activeCount > 0 && (
              <button className={styles.clearFilters} onClick={clearFilters}>Clear all</button>
            )}
          </div>

          {/* Filter panel */}
          {filtersOpen && (
            <div className={styles.filterPanel}>
              <div className={styles.filterSection}>
                <p className={styles.filterSectionLabel}>Author</p>
                <div className={styles.filterRow}>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Country</label>
                    <input
                      className={styles.filterInput}
                      placeholder="e.g. Australia"
                      value={filters.country}
                      onChange={e => handleFilterChange({ country: e.target.value })}
                    />
                  </div>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Gender</label>
                    <select
                      className={styles.filterSelect}
                      value={filters.gender}
                      onChange={e => handleFilterChange({ gender: e.target.value })}
                    >
                      <option value="">Any</option>
                      {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Age group</label>
                    <select
                      className={styles.filterSelect}
                      value={filters.age_bracket}
                      onChange={e => handleFilterChange({ age_bracket: e.target.value })}
                    >
                      <option value="">Any</option>
                      {AGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.filterSection}>
                <p className={styles.filterSectionLabel}>Recipe</p>
                <div className={styles.filterRow}>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Max calories / serving</label>
                    <input
                      className={styles.filterInput}
                      type="number"
                      min={0}
                      placeholder="e.g. 500"
                      value={filters.cal_max}
                      onChange={e => handleFilterChange({ cal_max: e.target.value })}
                    />
                  </div>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Max cost / serving (USD)</label>
                    <input
                      className={styles.filterInput}
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="e.g. 10"
                      value={filters.cost_max}
                      onChange={e => handleFilterChange({ cost_max: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

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
                {query || activeCount > 0
                  ? 'Try adjusting your search or filters.'
                  : 'No public recipes yet — be the first to share one!'}
              </p>
            </div>
          ) : (
            <>
              <p className={styles.count}>{results.length} recipe{results.length !== 1 ? 's' : ''}</p>
              <div className={styles.grid}>
                {results.map(r => <SearchCard key={r.id} recipe={r} />)}
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
          {r.calories_per_serving && <span>~{r.calories_per_serving} kcal</span>}
          {r.cost_per_serving != null && <span>~{getCurrencySymbol(r.cost_currency)}{r.cost_per_serving.toFixed(2)}</span>}
        </div>
        {(r.avg_rating ?? 0) > 0 && (
          <div className={styles.cardStars}>
            {'★'.repeat(Math.round(r.avg_rating ?? 0))}{'☆'.repeat(5 - Math.round(r.avg_rating ?? 0))}
          </div>
        )}
        <div className={styles.cardAuthor}>
          <span className={styles.authorAvatar}>{AVATARS[r.author_avatar ?? ''] ?? '🌿'}</span>
          <span className={styles.authorName}>{r.author_name ?? 'Anonymous'}</span>
        </div>
      </div>
    </Link>
  )
}
