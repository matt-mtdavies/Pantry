import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { useAuth } from '../hooks/useAuth'
import { useWakeLock } from '../hooks/useWakeLock'
import { getRecipe, deleteRecipe, getShareLink, toggleFavourite, rateRecipe, uploadImage, deleteHeroImage, listCollections, toggleRecipeInCollection, createCollection } from '../lib/api'
import { formatTime, imageUrl } from '../lib/utils'
import { getCurrencySymbol } from '../lib/currency'
import { convertIngredient, convertStepText } from '../lib/units'
import { HeartIcon, CameraIcon, ShareIcon, EditIcon, CollectionIcon } from '../components/icons'
import { Avatar } from '../components/Avatar'
import type { Recipe, Collection } from '../types'
import styles from './RecipePage.module.css'

export default function RecipePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { acquire: acquireWakeLock, release: releaseWakeLock } = useWakeLock()
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
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoDeleting, setPhotoDeleting] = useState(false)
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!photoMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target as Node)) {
        setPhotoMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [photoMenuOpen])
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [newColName, setNewColName] = useState('')
  const [creatingCol, setCreatingCol] = useState(false)

  useEffect(() => {
    if (!id) return
    getRecipe(id)
      .then(r => { setRecipe(r); acquireWakeLock() })
      .catch(() => navigate('/explore'))
      .finally(() => setLoading(false))
    return () => releaseWakeLock()
  }, [id, navigate, acquireWakeLock, releaseWakeLock])

  useEffect(() => {
    if (!user) return
    listCollections().then(setCollections).catch(() => {})
  }, [user?.id])

  const isOwner = !!user && !!recipe && recipe.user_id === user.id

  const handleShare = async () => {
    if (!recipe) return
    setSharing(true)
    try {
      const { url } = await getShareLink(recipe.id)
      setShareUrl(url)
      if (navigator.share) {
        await navigator.share({ title: recipe.title, url }).catch(() => {})
      } else {
        setSharePanel(true)
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !recipe) return
    setPhotoUploading(true)
    try {
      const { key } = await uploadImage(file, recipe.id, 'hero')
      setRecipe(r => r ? { ...r, hero_image_key: key } : r)
    } catch { /* ignore */ } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  const handlePhotoDelete = async () => {
    if (!recipe) return
    setPhotoDeleting(true)
    try {
      await deleteHeroImage(recipe.id)
      setRecipe(r => r ? { ...r, hero_image_key: null } : r)
    } catch { /* ignore */ } finally { setPhotoDeleting(false) }
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
  const activeCollections = collections.filter(c => c.recipe_ids.includes(recipe.id))

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handlePhotoUpload}
          aria-hidden="true"
        />

        {recipe.hero_image_key ? (
          <div className={styles.hero}>
            <img src={imageUrl(recipe.hero_image_key)!} alt={recipe.title} className={styles.heroImg} />
            <button
              className={styles.heroShareBtn}
              onClick={handleShare}
              disabled={sharing}
              aria-label="Share recipe"
            >
              <ShareIcon size={14} />
              {sharing ? 'Sharing…' : 'Share'}
            </button>
            {isOwner && (
              <div className={styles.heroBtnRow} ref={photoMenuRef}>
                <button
                  className={styles.heroPhotoBtn}
                  onClick={() => setPhotoMenuOpen(o => !o)}
                  disabled={photoUploading || photoDeleting}
                  aria-label="Change recipe photo"
                  aria-expanded={photoMenuOpen}
                >
                  {photoUploading ? 'Uploading…' : photoDeleting ? 'Removing…' : <><CameraIcon size={14} /> Change photo</>}
                </button>
                {photoMenuOpen && (
                  <div className={styles.photoMenu} role="menu">
                    <button
                      className={styles.photoMenuItem}
                      role="menuitem"
                      onClick={() => { setPhotoMenuOpen(false); photoInputRef.current?.click() }}
                    >
                      Choose photo
                    </button>
                    <button
                      className={`${styles.photoMenuItem} ${styles.photoMenuItemDanger}`}
                      role="menuitem"
                      onClick={() => { setPhotoMenuOpen(false); handlePhotoDelete() }}
                    >
                      Remove photo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : isOwner ? (
          <div className={styles.heroEmpty}>
            <button
              className={styles.heroAddPhotoBtn}
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
            >
              {photoUploading ? 'Uploading…' : <><CameraIcon size={14} /> Add a photo</>}
            </button>
          </div>
        ) : null}

        <div className="content-col">
          <div className={styles.header}>

            {user && (recipe.is_favourite || activeCollections.length > 0) && (
              <div className={styles.designations}>
                {recipe.is_favourite && (
                  <span className={styles.designationFav}>
                    <HeartIcon filled size={11} /> Saved
                  </span>
                )}
                {activeCollections.map(c => (
                  <span key={c.id} className={styles.designationCol}>
                    <CollectionIcon size={11} /> In: {c.name}
                  </span>
                ))}
              </div>
            )}

            {recipe.tags.length > 0 && (
              <div className={styles.tags}>
                {recipe.tags.map(tag => <span key={tag} className={styles.tag}>{tag}</span>)}
              </div>
            )}

            <h1 className={styles.title}>{recipe.title}</h1>

            {/* Author attribution for public recipes */}
            {!isOwner && recipe.author_name !== undefined && (
              <Link to={`/user/${recipe.user_id}`} className={styles.authorRow}>
                <Avatar
                  imageKey={recipe.author_avatar_key}
                  avatarId={recipe.author_avatar}
                  size={24}
                  className={styles.authorAvatar}
                />
                <span className={styles.authorName}>by {recipe.author_name ?? 'Anonymous'}</span>
              </Link>
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
              {recipe.calories_per_serving != null && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Calories</span>
                  <span className={styles.metaValue}>~{recipe.calories_per_serving} kcal</span>
                </div>
              )}
              {recipe.cost_per_serving != null && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Est. cost</span>
                  <span className={styles.metaValue}>~{getCurrencySymbol(recipe.cost_currency)}{recipe.cost_per_serving.toFixed(2)}</span>
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

            {/* Actions */}
            <div className={styles.actions}>
              <Link to={`/recipe/${recipe.id}/cook`} className={styles.cookBtn}>Cook this recipe</Link>
              {user && (
                <button
                  className={`${styles.iconBtn} ${recipe.is_favourite ? styles.iconBtnActive : ''}`}
                  onClick={handleToggleFavourite}
                  aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
                  aria-pressed={recipe.is_favourite}
                ><HeartIcon filled={recipe.is_favourite} size={20} /></button>
              )}
              {isOwner && (
                <>
                  <button className={styles.iconBtn} onClick={() => setCollectionsOpen(o => !o)} aria-label="Add to collection" title="Add to collection">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                      <rect x="1.5" y="4.5" width="6" height="6" rx="1.5"/>
                      <rect x="10.5" y="4.5" width="6" height="6" rx="1.5"/>
                      <rect x="1.5" y="13" width="6" height="3.5" rx="1"/>
                      <path d="M13.5 13v3.5M11.5 15h4"/>
                    </svg>
                  </button>
                  <Link to={`/recipe/${recipe.id}/edit`} className={styles.iconBtn} aria-label="Edit recipe"><EditIcon size={18} /></Link>
                </>
              )}
            </div>

            {/* Collection panel */}
            {isOwner && collectionsOpen && recipe && (
              <div className={styles.collectionPanel}>
                <p className={styles.collectionPanelTitle}>Add to collection</p>
                {collections.length === 0 && !creatingCol && (
                  <p className={styles.collectionPanelEmpty}>No collections yet.</p>
                )}
                {collections.map(col => {
                  const inCol = col.recipe_ids.includes(recipe.id)
                  return (
                    <button
                      key={col.id}
                      className={`${styles.collectionItem} ${inCol ? styles.collectionItemIn : ''}`}
                      onClick={async () => {
                        const res = await toggleRecipeInCollection(col.id, recipe.id)
                        setCollections(prev => prev.map(c => c.id === col.id ? {
                          ...c,
                          recipe_ids: res.action === 'added'
                            ? [...c.recipe_ids, recipe.id]
                            : c.recipe_ids.filter(rid => rid !== recipe.id),
                        } : c))
                      }}
                    >
                      <span className={styles.collectionItemName}>{col.name}</span>
                      <span className={styles.collectionItemCheck}>{inCol ? '✓' : '+'}</span>
                    </button>
                  )
                })}
                <div className={styles.collectionCreate}>
                  <input
                    className={styles.collectionInput}
                    placeholder="New collection…"
                    value={newColName}
                    onChange={e => setNewColName(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key !== 'Enter') return
                      const name = newColName.trim()
                      if (!name) return
                      setCreatingCol(true)
                      try {
                        const col = await createCollection(name)
                        const toggled = await toggleRecipeInCollection(col.id, recipe.id)
                        setCollections(prev => [...prev, { ...col, recipe_ids: toggled.action === 'added' ? [recipe.id] : [] }])
                        setNewColName('')
                      } catch { /* ignore */ } finally { setCreatingCol(false) }
                    }}
                    maxLength={80}
                  />
                </div>
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

            {recipe.source_guess && (
              recipe.source_url
                ? <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>From {recipe.source_guess} ↗</a>
                : <p className={styles.source}>From {recipe.source_guess}</p>
            )}
          </div>

          <hr className={styles.divider} />

          <section className={styles.section} aria-labelledby="ingredients-heading">
            <h2 id="ingredients-heading" className={styles.sectionTitle}>Ingredients</h2>
            <ul className={styles.ingredients}>
              {recipe.ingredients.map((ing, i) => {
                const unitPref = user?.unit_system ?? 'metric'
                const c = convertIngredient(ing.amount, ing.unit, unitPref)
                return (
                  <li key={i} className={styles.ingredient}>
                    <span className={styles.ingAmount}>{c.amount} {c.unit}</span>
                    <span className={styles.ingName}>{ing.name}</span>
                  </li>
                )
              })}
            </ul>
          </section>

          <hr className={styles.divider} />

          <section className={styles.section} aria-labelledby="method-heading">
            <h2 id="method-heading" className={styles.sectionTitle}>Method</h2>
            <ol className={styles.steps}>
              {recipe.steps.map((step, i) => {
                const unitPref = user?.unit_system ?? 'metric'
                const text = convertStepText(step, unitPref)
                return (
                  <li key={i} className={styles.step}>
                    <span className={styles.stepNumber}>{i + 1}</span>
                    <p className={styles.stepText}>{text}</p>
                  </li>
                )
              })}
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
