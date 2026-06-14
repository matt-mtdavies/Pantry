import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../hooks/useAuth'
import { getRecipe, deleteRecipe, getShareLink, toggleFavourite, rateRecipe } from '../lib/api'
import { formatTime, imageUrl } from '../lib/utils'
import type { Recipe } from '../types'
import styles from './RecipePage.module.css'

const AVATARS: Record<string, string> = {
  herb: '🌿', lemon: '🍋', pepper: '🌶️', apple: '🍎', mushroom: '🍄', carrot: '🥕',
}

export default function RecipePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharePanel, setSharePanel] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [hoverStar, setHoverStar] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    getRecipe(id)
      .then(setRecipe)
      .catch(() => navigate('/explore'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const isOwner = !!user && !!recipe && recipe.user_id === user.id

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
    } catch { /* ignore */ } finally { setSharing(false) }
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
    try { await toggleFavourite(recipe.id, next) }
    catch { setRecipe(r => r ? { ...r, is_favourite: !next } : r) }
  }

  const handleRate = async (rating: number) => {
    if (!recipe || ratingLoading) return
    setRatingLoading(true)
    try {
      const stats = await rateRecipe(recipe.id, rating)
      setRecipe(r => r ? { ...r, avg_rating: stats.avg_rating, rating_count: stats.rating_count, my_rating: stats.my_rating } : r)
    } catch { /* ignore */ } finally { setRatingLoading(false) }
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
  const displayStar = hoverStar ?? recipe.my_rating ?? 0

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">

        {recipe.hero_image_key && (
          <div className={styles.hero}>
            <img src={imageUrl(recipe.hero_image_key)!} alt={recipe.title} className={styles.heroImg} />
          </div>
        )}

        <div className="content-col">
          <div className={styles.header}>

            {recipe.tags.length > 0 && (
              <div className={styles.tags}>
                {recipe.tags.map(tag => <span key={tag} className={styles.tag}>{tag}</span>)}
              </div>
            )}

            <h1 className={styles.title}>{recipe.title}</h1>

            {/* Author attribution for public recipes */}
            {!isOwner && recipe.author_name !== undefined && (
              <div className={styles.authorRow}>
                <span className={styles.authorAvatar}>{AVATARS[recipe.author_avatar ?? ''] ?? '🌿'}</span>
                <span className={styles.authorName}>by {recipe.author_name ?? 'Anonymous'}</span>
              </div>
            )}

            {recipe.description && <p className={styles.description}>{recipe.description}</p>}

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

            {/* Rating display */}
            {(recipe.rating_count ?? 0) > 0 && (
              <div className={styles.ratingDisplay}>
                <span className={styles.ratingStars}>
                  {renderStars(recipe.avg_rating ?? 0)}
                </span>
                <span className={styles.ratingScore}>{(recipe.avg_rating ?? 0).toFixed(1)}</span>
                <span className={styles.ratingCount}>({recipe.rating_count} rating{recipe.rating_count !== 1 ? 's' : ''})</span>
              </div>
            )}

            {/* Owner actions */}
            {isOwner && (
              <div className={styles.actions}>
                <Link to={`/recipe/${recipe.id}/cook`} className={styles.cookBtn}>Cook this recipe</Link>
                <button
                  className={`${styles.iconBtn} ${recipe.is_favourite ? styles.iconBtnActive : ''}`}
                  onClick={handleToggleFavourite}
                  aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
                  aria-pressed={recipe.is_favourite}
                >{recipe.is_favourite ? '♥' : '♡'}</button>
                <button className={styles.iconBtn} onClick={handleShare} disabled={sharing} aria-label="Share recipe">↗</button>
                <Link to={`/recipe/${recipe.id}/edit`} className={styles.iconBtn} aria-label="Edit recipe">✎</Link>
              </div>
            )}

            {/* Visitor actions */}
            {!isOwner && (
              <div className={styles.actions}>
                <Link to={`/recipe/${recipe.id}/cook`} className={styles.cookBtn}>Cook this recipe</Link>
              </div>
            )}

            {sharePanel && shareUrl && (
              <div className={styles.sharePanel}>
                <div className={styles.sharePanelHeader}>
                  <span className={styles.sharePanelTitle}>Share link</span>
                  <button className={styles.sharePanelClose} onClick={() => setSharePanel(false)} aria-label="Close">✕</button>
                </div>
                <div className={styles.sharePanelRow}>
                  <input className={styles.sharePanelInput} value={shareUrl} readOnly onFocus={e => (e.target as HTMLInputElement).select()} />
                  <button className={styles.copyBtn} onClick={handleCopy}>{copied ? '✓ Copied' : 'Copy'}</button>
                </div>
                {navigator.share && (
                  <button className={styles.nativeShareBtn} onClick={() => navigator.share!({ title: recipe.title, url: shareUrl }).catch(() => {})}>Share via…</button>
                )}
              </div>
            )}

            {recipe.source_guess && <p className={styles.source}>From {recipe.source_guess}</p>}
          </div>

          <hr className={styles.divider} />

          <section className={styles.section} aria-labelledby="ingredients-heading">
            <h2 id="ingredients-heading" className={styles.sectionTitle}>Ingredients</h2>
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

          {/* Star rating widget for non-owners */}
          {!isOwner && (
            <div className={styles.ratingWidget}>
              <p className={styles.ratingWidgetLabel}>
                {recipe.my_rating ? 'Your rating' : 'Rate this recipe'}
              </p>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    className={`${styles.star} ${displayStar >= n ? styles.starFilled : ''}`}
                    onClick={() => handleRate(n)}
                    onMouseEnter={() => setHoverStar(n)}
                    onMouseLeave={() => setHoverStar(null)}
                    disabled={ratingLoading}
                    aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                  >★</button>
                ))}
              </div>
              {recipe.my_rating && (
                <p className={styles.ratingWidgetSub}>
                  You rated this {recipe.my_rating}/5 — tap to change
                </p>
              )}
            </div>
          )}

          {recipe.screenshot_keys.length > 0 && (
            <div className={styles.original}>
              <span className={styles.originalLabel}>View original screenshot</span>
              {recipe.screenshot_keys.map((key, i) => (
                <a key={i} href={imageUrl(key)!} target="_blank" rel="noopener noreferrer" className={styles.originalLink}>
                  {recipe.screenshot_keys.length > 1 ? `Screenshot ${i + 1}` : 'Screenshot'}
                </a>
              ))}
            </div>
          )}

          {isOwner && (
            <div className={styles.dangerZone}>
              {confirmDelete ? (
                <div className={styles.confirmBox}>
                  <p className={styles.confirmText}>Are you sure you want to delete this recipe? This can't be undone.</p>
                  <div className={styles.confirmBtns}>
                    <button className={styles.confirmDelete} onClick={handleDelete} disabled={deleting}>
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button className={styles.confirmCancel} onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>Delete recipe</button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function renderStars(avg: number): string {
  const full = Math.round(avg)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}
