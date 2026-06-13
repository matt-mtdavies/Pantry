import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { getRecipe, deleteRecipe, getShareLink, toggleFavourite } from '../lib/api'
import { formatTime, imageUrl } from '../lib/utils'
import type { Recipe } from '../types'
import styles from './RecipePage.module.css'

export default function RecipePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharePanel, setSharePanel] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    getRecipe(id)
      .then(setRecipe)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleShare = async () => {
    if (!recipe) return
    setSharing(true)
    try {
      const { url } = await getShareLink(recipe.id)
      setShareUrl(url)
      setSharePanel(true)
      if (navigator.share) {
        await navigator.share({ title: recipe.title, url }).catch(() => {})
      }
    } catch {
      // ignore
    } finally {
      setSharing(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleDelete = async () => {
    if (!recipe) return
    setDeleting(true)
    try {
      await deleteRecipe(recipe.id)
      navigate('/')
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleToggleFavourite = async () => {
    if (!recipe) return
    const next = !recipe.is_favourite
    setRecipe(r => r ? { ...r, is_favourite: next } : r)
    try {
      await toggleFavourite(recipe.id, next)
    } catch {
      setRecipe(r => r ? { ...r, is_favourite: !next } : r)
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <Navigation />
        <main className="page-main">
          <div className={styles.loadingShell}>
            <div className={`skeleton ${styles.skeletonHero}`} />
            <div className="content-col" style={{ paddingTop: '2rem' }}>
              <div className={`skeleton ${styles.skeletonTitle}`} />
              <div className={`skeleton ${styles.skeletonLine}`} />
              <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '70%' }} />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!recipe) return null

  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">

        {/* Hero */}
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

            {/* Tags */}
            {recipe.tags.length > 0 && (
              <div className={styles.tags}>
                {recipe.tags.map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className={styles.title}>{recipe.title}</h1>

            {/* Description */}
            {recipe.description && (
              <p className={styles.description}>{recipe.description}</p>
            )}

            {/* Meta row */}
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

            {/* Action buttons */}
            <div className={styles.actions}>
              <Link to={`/recipe/${recipe.id}/cook`} className={styles.cookBtn}>
                Cook this recipe
              </Link>
              <button
                className={`${styles.iconBtn} ${recipe.is_favourite ? styles.iconBtnActive : ''}`}
                onClick={handleToggleFavourite}
                aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
                aria-pressed={recipe.is_favourite}
              >
                {recipe.is_favourite ? '♥' : '♡'}
              </button>
              <button
                className={styles.iconBtn}
                onClick={handleShare}
                disabled={sharing}
                aria-label="Share recipe"
              >
                ↗
              </button>
              <Link to={`/recipe/${recipe.id}/edit`} className={styles.iconBtn} aria-label="Edit recipe">
                ✎
              </Link>
            </div>

            {sharePanel && shareUrl && (
              <div className={styles.sharePanel}>
                <div className={styles.sharePanelHeader}>
                  <span className={styles.sharePanelTitle}>Share link</span>
                  <button className={styles.sharePanelClose} onClick={() => setSharePanel(false)} aria-label="Close">✕</button>
                </div>
                <div className={styles.sharePanelRow}>
                  <input
                    className={styles.sharePanelInput}
                    value={shareUrl}
                    readOnly
                    onFocus={e => (e.target as HTMLInputElement).select()}
                  />
                  <button className={styles.copyBtn} onClick={handleCopy}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                {navigator.share && (
                  <button
                    className={styles.nativeShareBtn}
                    onClick={() => navigator.share!({ title: recipe.title, url: shareUrl }).catch(() => {})}
                  >
                    Share via…
                  </button>
                )}
              </div>
            )}

            {recipe.source_guess && (
              <p className={styles.source}>From {recipe.source_guess}</p>
            )}
          </div>

          <hr className={styles.divider} />

          {/* Ingredients */}
          <section className={styles.section} aria-labelledby="ingredients-heading">
            <h2 id="ingredients-heading" className={styles.sectionTitle}>Ingredients</h2>
            <ul className={styles.ingredients}>
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className={styles.ingredient}>
                  <span className={styles.ingAmount}>
                    {ing.amount} {ing.unit}
                  </span>
                  <span className={styles.ingName}>{ing.name}</span>
                </li>
              ))}
            </ul>
          </section>

          <hr className={styles.divider} />

          {/* Method */}
          <section className={styles.section} aria-labelledby="method-heading">
            <h2 id="method-heading" className={styles.sectionTitle}>Method</h2>
            <ol className={styles.steps}>
              {recipe.steps.map((step, i) => (
                <li key={i} className={styles.step}>
                  <span className={styles.stepNumber}>{i + 1}</span>
                  <p className={styles.stepText}>{step}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Screenshot link */}
          {recipe.screenshot_keys.length > 0 && (
            <div className={styles.original}>
              <span className={styles.originalLabel}>View original screenshot</span>
              {recipe.screenshot_keys.map((key, i) => (
                <a
                  key={i}
                  href={imageUrl(key)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.originalLink}
                >
                  {recipe.screenshot_keys.length > 1 ? `Screenshot ${i + 1}` : 'Screenshot'}
                </a>
              ))}
            </div>
          )}

          {/* Danger zone */}
          <div className={styles.dangerZone}>
            {confirmDelete ? (
              <div className={styles.confirmBox}>
                <p className={styles.confirmText}>Are you sure you want to delete this recipe? This can't be undone.</p>
                <div className={styles.confirmBtns}>
                  <button
                    className={styles.confirmDelete}
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    className={styles.confirmCancel}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className={styles.deleteBtn}
                onClick={() => setConfirmDelete(true)}
              >
                Delete recipe
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
