import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Fuse from 'fuse.js'
import Navigation from '../components/Navigation'
import RecipeCard from '../components/RecipeCard'
import { SearchIcon, DishIcon, WarningIcon, CollectionIcon, HeartIcon } from '../components/icons'
import { listRecipes, toggleFavourite, listCollections, createCollection, deleteCollection } from '../lib/api'
import type { Recipe, Collection } from '../types'
import styles from './HomePage.module.css'

type FilterMode = 'all' | 'favourites' | string // string = collection id

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [creatingCol, setCreatingCol] = useState(false)

  useEffect(() => {
    Promise.all([listRecipes(), listCollections()])
      .then(([r, c]) => { setRecipes(r); setCollections(c) })
      .finally(() => setLoading(false))
  }, [])

  const fuse = useMemo(() =>
    new Fuse(recipes, {
      keys: ['title', 'description', 'tags', 'ingredients.name'],
      threshold: 0.4,
      includeScore: true,
    }), [recipes])

  const activeCollection = collections.find(c => c.id === filter)

  const filtered = useMemo(() => {
    let list = recipes
    if (filter === 'favourites') list = list.filter(r => r.is_favourite)
    else if (filter !== 'all') {
      const col = collections.find(c => c.id === filter)
      if (col) list = list.filter(r => col.recipe_ids.includes(r.id))
    }
    if (query.trim()) {
      list = fuse.search(query).map(r => r.item).filter(r => list.includes(r))
    }
    return list
  }, [recipes, collections, filter, query, fuse])

  const handleToggleFavourite = async (id: string, value: boolean) => {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, is_favourite: value } : r))
    try {
      await toggleFavourite(id, value)
    } catch {
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, is_favourite: !value } : r))
    }
  }

  const handleCreateCollection = async () => {
    const name = newColName.trim()
    if (!name) return
    setCreatingCol(true)
    try {
      const col = await createCollection(name)
      setCollections(prev => [...prev, col])
      setNewColName('')
    } catch { /* ignore */ } finally {
      setCreatingCol(false)
    }
  }

  const handleDeleteCollection = async (id: string) => {
    await deleteCollection(id)
    setCollections(prev => prev.filter(c => c.id !== id))
    if (filter === id) setFilter('all')
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
            <div className={styles.searchRow}>
              <div className={styles.searchWrap}>
                <SearchIcon size={15} className={styles.searchIcon} />
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search recipes"
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
              <Link to="/import" className={styles.addBtn}>
                + Add recipe
              </Link>
            </div>

            <div className={styles.filters} role="group" aria-label="Filter recipes">
              <button
                className={`${styles.filter} ${filter === 'all' ? styles.filterActive : ''}`}
                onClick={() => setFilter('all')}
                aria-pressed={filter === 'all'}
              >All</button>
              <button
                className={`${styles.filter} ${filter === 'favourites' ? styles.filterActive : ''}`}
                onClick={() => setFilter('favourites')}
                aria-pressed={filter === 'favourites'}
              >
                <HeartIcon size={13} />
                Favourites
              </button>
              <button
                className={`${styles.filter} ${activeCollection ? styles.filterActive : ''}`}
                onClick={() => setCollectionsOpen(o => !o)}
                aria-pressed={!!activeCollection}
              >
                {activeCollection ? (
                  <span className={styles.filterColLabel}>
                    {activeCollection.name}
                    <span
                      className={styles.filterColClear}
                      role="button"
                      aria-label="Clear collection filter"
                      onClick={e => { e.stopPropagation(); setFilter('all') }}
                    >✕</span>
                  </span>
                ) : (
                  <span className={styles.filterColLabel}>
                    <CollectionIcon size={14} />
                    Collections
                  </span>
                )}
              </button>
            </div>
          </div>

          {collectionsOpen && (
            <div className={styles.collectionsPanel}>
              <p className={styles.collectionsPanelTitle}>Collections</p>
              {collections.length === 0 && (
                <p className={styles.collectionsEmpty}>No collections yet — create one below.</p>
              )}
              {collections.map(c => (
                <div key={c.id} className={`${styles.collectionRow} ${filter === c.id ? styles.collectionRowActive : ''}`}>
                  <button
                    className={styles.collectionRowSelect}
                    onClick={() => { setFilter(c.id); setCollectionsOpen(false) }}
                  >
                    <span className={styles.collectionRowName}>{c.name}</span>
                    <span className={styles.collectionRowCount}>{c.recipe_ids.length}</span>
                  </button>
                  <button
                    className={styles.collectionRowDelete}
                    onClick={() => handleDeleteCollection(c.id)}
                    aria-label={`Delete ${c.name}`}
                  >✕</button>
                </div>
              ))}
              <div className={styles.collectionCreate}>
                <input
                  className={styles.collectionInput}
                  placeholder="New collection name…"
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateCollection() }}
                  maxLength={80}
                />
                <button
                  className={styles.collectionCreateBtn}
                  onClick={handleCreateCollection}
                  disabled={!newColName.trim() || creatingCol}
                >
                  {creatingCol ? '…' : 'Create'}
                </button>
              </div>
            </div>
          )}

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
                    {filter === 'favourites' ? 'No favourites yet'
                      : activeCollection ? `No recipes in "${activeCollection.name}" yet`
                      : 'No recipes yet'}
                  </h2>
                  <p className={styles.emptySub}>
                    {filter === 'favourites'
                      ? 'Tap the ♡ heart on any recipe to save it here.'
                      : activeCollection
                      ? 'Open a recipe and tap "Add to collection" to add it here.'
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
