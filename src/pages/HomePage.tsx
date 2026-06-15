import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Fuse from 'fuse.js'
import Navigation from '../components/Navigation'
import RecipeCard from '../components/RecipeCard'
import { SearchIcon, DishIcon, WarningIcon } from '../components/icons'
import { listRecipes, toggleFavourite } from '../lib/api'
import type { Recipe, FilterMode } from '../types'
import styles from './HomePage.module.css'

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')

  useEffect(() => {
    listRecipes()
      .then(setRecipes)
      .finally(() => setLoading(false))
  }, [])

  const fuse = useMemo(() =>
    new Fuse(recipes, {
      keys: ['title', 'description', 'tags', 'ingredients.name'],
      threshold: 0.4,
      includeScore: true,
    }), [recipes])

  const filtered = useMemo(() => {
    let list = recipes
    if (filter === 'favourites') list = list.filter(r => r.is_favourite)
    if (filter === 'needs-attention') list = list.filter(r => r.needs_attention)
    if (query.trim()) {
      list = fuse.search(query).map(r => r.item).filter(r =>
        filter === 'favourites' ? r.is_favourite :
        filter === 'needs-attention' ? r.needs_attention : true
      )
    }
    return list
  }, [recipes, filter, query, fuse])

  const handleToggleFavourite = async (id: string, value: boolean) => {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, is_favourite: value } : r))
    try {
      await toggleFavourite(id, value)
    } catch {
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, is_favourite: !value } : r))
    }
  }

  const needsAttentionCount = recipes.filter(r => r.needs_attention).length

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className={styles.hero}>
          <div className="wide-col">
            <h1 className={styles.heroTitle}>Your recipes</h1>
            <p className={styles.heroSub}>
              {recipes.length === 0 && !loading
                ? 'Your collection is waiting — add your first recipe below.'
                : `${recipes.length} recipe${recipes.length === 1 ? '' : 's'} in your collection`}
            </p>
          </div>
        </div>

        <div className="wide-col">
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <SearchIcon size={15} className={styles.searchIcon} />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search recipes, ingredients…"
                className={styles.search}
                aria-label="Search recipes"
              />
              {query && (
                <button
                  className={styles.searchClear}
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >✕</button>
              )}
            </div>

            <div className={styles.filters} role="group" aria-label="Filter recipes">
              {(['all', 'favourites'] as FilterMode[]).map(f => (
                <button
                  key={f}
                  className={`${styles.filter} ${filter === f ? styles.filterActive : ''}`}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                >
                  {f === 'all' ? 'All' : '♥ Favourites'}
                </button>
              ))}
            </div>

            <Link to="/import" className={styles.addBtn}>
              + Add recipe
            </Link>
          </div>

          {needsAttentionCount > 0 && (
            <Link to="/needs-attention" className={styles.attentionBanner}>
              <WarningIcon size={16} />
              <span>{needsAttentionCount} screenshot{needsAttentionCount > 1 ? 's need' : ' needs'} attention</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.attentionArrow}><path d="M2 7h10M8 3l4 4-4 4"/></svg>
            </Link>
          )}

          {loading ? (
            <div className={styles.grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={`skeleton ${styles.skeletonImg}`} />
                  <div className={styles.skeletonBody}>
                    <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '60%' }} />
                    <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '90%', height: '1.5rem' }} />
                    <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <DishIcon size={56} className={styles.emptyIcon} />
              {query ? (
                <>
                  <h2 className={styles.emptyTitle}>No recipes found</h2>
                  <p className={styles.emptySub}>Try a different search — maybe "{query.split(' ')[0]}" on its own?</p>
                </>
              ) : (
                <>
                  <h2 className={styles.emptyTitle}>
                    {filter === 'favourites' ? 'No favourites yet' : 'No recipes yet'}
                  </h2>
                  <p className={styles.emptySub}>
                    {filter === 'favourites'
                      ? 'Tap the ♡ heart on any recipe to save it here.'
                      : 'Import your first recipe from a screenshot, or add one by hand.'}
                  </p>
                  {filter === 'all' && (
                    <Link to="/import" className={styles.emptyBtn}>Add your first recipe</Link>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onToggleFavourite={handleToggleFavourite}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
