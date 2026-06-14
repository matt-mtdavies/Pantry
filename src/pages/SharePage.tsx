import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import SaltGrinder from '../components/SaltGrinder'
import { getSharedRecipe, saveSharedRecipe } from '../lib/api'
import { formatTime, imageUrl } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'
import type { Recipe } from '../types'
import styles from './SharePage.module.css'

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const { user } = useAuth()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!token) return
    getSharedRecipe(token)
      .then(setRecipe)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    try {
      await saveSharedRecipe(token)
      setSaved(true)
    } catch {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}><SaltGrinder /></div>
      </div>
    )
  }

  if (notFound || !recipe) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <div className={styles.notFoundIcon}>🍽</div>
          <h1 className={styles.notFoundTitle}>Recipe not found</h1>
          <p className={styles.notFoundText}>
            This link may have expired or the recipe may have been removed.
          </p>
          <Link to="/" className={styles.homeLink}>Go to Pantry</Link>
        </div>
      </div>
    )
  }

  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)

  return (
    <div className={styles.page}>
      {/* Top banner */}
      <div className={styles.banner}>
        <div className={styles.bannerInner}>
          <span className={styles.bannerBrand}>Pantry</span>
          <span className={styles.bannerText}>A friend shared this recipe with you</span>
          {saved ? (
            <span className={styles.savedBadge}>✓ Saved to your Pantry</span>
          ) : user ? (
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save to my Pantry'}
            </button>
          ) : (
            <Link to={`/auth?next=/share/${token}`} className={styles.saveBtn}>
              Save to my Pantry
            </Link>
          )}
        </div>
      </div>

      <main className={styles.main}>
        {recipe.hero_image_key && (
          <div className={styles.hero}>
            <img
              src={imageUrl(recipe.hero_image_key)!}
              alt={recipe.title}
              className={styles.heroImg}
            />
          </div>
        )}

        <div className="content-col">
          <div className={styles.header}>
            {recipe.tags.length > 0 && (
              <div className={styles.tags}>
                {recipe.tags.map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            )}

            <h1 className={styles.title}>{recipe.title}</h1>

            {recipe.description && (
              <p className={styles.description}>{recipe.description}</p>
            )}

            <div className={styles.meta}>
              {recipe.prep_time != null && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Prep</span>
                  <span className={styles.metaValue}>{formatTime(recipe.prep_time)}</span>
                </div>
              )}
              {recipe.cook_time != null && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Cook</span>
                  <span className={styles.metaValue}>{formatTime(recipe.cook_time)}</span>
                </div>
              )}
              {totalTime > 0 && recipe.prep_time != null && recipe.cook_time != null && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Total</span>
                  <span className={styles.metaValue}>{formatTime(totalTime)}</span>
                </div>
              )}
              {recipe.servings != null && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Serves</span>
                  <span className={styles.metaValue}>{recipe.servings}</span>
                </div>
              )}
            </div>
          </div>

          <hr className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Ingredients</h2>
            <ul className={styles.ingredients}>
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className={styles.ingredient}>
                  <span className={styles.ingAmount}>{ing.amount} {ing.unit}</span>
                  <span className={styles.ingName}>{ing.name}</span>
                </li>
              ))}
            </ul>
          </section>

          <hr className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Method</h2>
            <ol className={styles.steps}>
              {recipe.steps.map((step, i) => (
                <li key={i} className={styles.step}>
                  <span className={styles.stepNumber}>{i + 1}</span>
                  <p className={styles.stepText}>{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Shared via <strong>Pantry</strong> — your recipe home.
            </p>
            <Link to="/auth" className={styles.footerLink}>
              Create your own Pantry →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
