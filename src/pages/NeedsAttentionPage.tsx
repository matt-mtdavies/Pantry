import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { listRecipes, deleteRecipe } from '../lib/api'
import { imageUrl } from '../lib/utils'
import type { Recipe } from '../types'
import styles from './NeedsAttentionPage.module.css'

export default function NeedsAttentionPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listRecipes()
      .then(all => setRecipes(all.filter(r => r.needs_attention)))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this screenshot? This cannot be undone.')) return
    await deleteRecipe(id)
    setRecipes(prev => prev.filter(r => r.id !== id))
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
              These screenshots couldn't be read automatically. Open each one to fix it up,
              or delete it if you don't need it.
            </p>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
            </div>
          ) : recipes.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>✓</div>
              <h2 className={styles.emptyTitle}>All clear!</h2>
              <p className={styles.emptySub}>No screenshots waiting for attention.</p>
              <Link to="/" className={styles.homeBtn}>Back to recipes</Link>
            </div>
          ) : (
            <div className={styles.list}>
              {recipes.map(r => (
                <div key={r.id} className={styles.item}>
                  {r.screenshot_keys.length > 0 && (
                    <a
                      href={imageUrl(r.screenshot_keys[0])!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.thumb}
                    >
                      <img
                        src={imageUrl(r.screenshot_keys[0])!}
                        alt="Screenshot thumbnail"
                        className={styles.thumbImg}
                      />
                    </a>
                  )}
                  <div className={styles.itemBody}>
                    <p className={styles.itemTitle}>{r.title}</p>
                    <p className={styles.itemDate}>
                      Added {new Date(r.created_at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <div className={styles.itemActions}>
                    <Link to={`/recipe/${r.id}/edit`} className={styles.editBtn}>
                      Fix recipe
                    </Link>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(r.id)}
                      aria-label="Delete this screenshot"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
