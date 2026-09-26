import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import SaltGrinder from '../components/SaltGrinder'
import LoadError from '../components/LoadError'
import { DishIcon } from '../components/icons'
import { listRecipes, deleteRecipe } from '../lib/api'
import { imageUrl } from '../lib/utils'
import type { Recipe } from '../types'
import styles from './NeedsAttentionPage.module.css'

export default function NeedsAttentionPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadFailed(false)
    listRecipes()
      .then(all => setRecipes(all.filter(r => r.needs_attention)))
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setDeleteError(null)
    try {
      await deleteRecipe(id)
      setRecipes(prev => prev.filter(r => r.id !== id))
      setConfirmingId(null)
    } catch {
      setDeleteError(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className="content-col">
          <div className={styles.header}>
            <Link to="/" className={styles.back}>← Back to recipes</Link>
            <h1 className={styles.title}>Needs attention</h1>
            <p className={styles.sub}>
              These imports couldn't be read automatically. Open each one to fix it up,
              or delete it if you don't need it.
            </p>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <SaltGrinder />
            </div>
          ) : loadFailed ? (
            <LoadError title="Couldn't load this list" onRetry={load} />
          ) : recipes.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>✓</div>
              <h2 className={styles.emptyTitle}>All clear!</h2>
              <p className={styles.emptySub}>No imports waiting for attention.</p>
              <Link to="/" className={styles.homeBtn}>Back to recipes</Link>
            </div>
          ) : (
            <div className={styles.list}>
              {recipes.map(r => {
                const kind = r.source_url ? 'link' : 'screenshot'
                const confirming = confirmingId === r.id
                return (
                <div key={r.id} className={styles.item}>
                  {r.screenshot_keys.length > 0 ? (
                    <a
                      href={imageUrl(r.screenshot_keys[0])!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.thumb}
                    >
                      <img
                        src={imageUrl(r.screenshot_keys[0])!}
                        alt={`Screenshot for ${r.title}`}
                        className={styles.thumbImg}
                      />
                    </a>
                  ) : (
                    <div className={styles.thumb} aria-hidden="true">
                      <DishIcon size={32} className={styles.thumbPlaceholder} />
                    </div>
                  )}
                  <div className={styles.itemBody}>
                    <p className={styles.itemTitle}>{r.title}</p>
                    <p className={styles.itemDate}>
                      {kind === 'link' ? 'Link import' : 'Screenshot import'}
                      {' · added '}
                      {new Date(r.created_at * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                    {r.source_url && <p className={styles.itemSource}>{r.source_url}</p>}
                  </div>
                  {confirming ? (
                    <div className={styles.confirm} role="alert">
                      <p className={styles.confirmText}>Delete “{r.title}”? This can't be undone.</p>
                      {deleteError === r.id && (
                        <p className={styles.confirmError}>Couldn't delete — try again.</p>
                      )}
                      <div className={styles.itemActions}>
                        <button className={styles.cancelBtn} onClick={() => { setConfirmingId(null); setDeleteError(null) }}>
                          Keep it
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                        >
                          {deletingId === r.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.itemActions}>
                      <Link to={`/recipe/${r.id}/edit`} className={styles.editBtn}>
                        Fix recipe
                      </Link>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => { setConfirmingId(r.id); setDeleteError(null) }}
                        aria-label={`Delete ${r.title}`}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
