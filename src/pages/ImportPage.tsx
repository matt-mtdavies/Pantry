import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { extractFromScreenshots, extractFromUrl, createRecipe, uploadImage, searchImages, fetchRecipeImage } from '../lib/api'
import { formatTime } from '../lib/utils'
import type { ExtractedRecipe, Ingredient } from '../types'
import styles from './ImportPage.module.css'

type Stage = 'upload' | 'extracting' | 'review' | 'saving' | 'error'

export default function ImportPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [stage, setStage] = useState<Stage>('upload')
  const [extracted, setExtracted] = useState<ExtractedRecipe | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  const handleFiles = useCallback((selected: File[]) => {
    const valid = selected.filter(f => f.type.startsWith('image/'))
    if (!valid.length) return
    setFiles(prev => [...prev, ...valid])
    setPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))])
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(Array.from(e.target.files ?? []))
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  const handleExtract = async () => {
    if (!files.length) return
    setStage('extracting')
    try {
      const result = await extractFromScreenshots(files)
      setExtracted(result)
      setStage('review')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Extraction failed')
      setStage('error')
    }
  }

  const handleExtractUrl = async () => {
    const url = urlInput.trim()
    if (!url) return
    setStage('extracting')
    try {
      const result = await extractFromUrl(url)
      setExtracted(result)
      setStage('review')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not import from that URL')
      setStage('error')
    }
  }

  const handleSaveAsDraft = async () => {
    setStage('saving')
    try {
      const recipe = await createRecipe({
        title: 'Untitled recipe (from screenshot)',
        needs_attention: true,
        screenshot_keys: [],
      } as Parameters<typeof createRecipe>[0])
      for (const file of files) {
        try { await uploadImage(file, recipe.id, 'screenshot') } catch { /* non-fatal */ }
      }
      navigate('/needs-attention')
    } catch {
      navigate('/needs-attention')
    }
  }

  if (stage === 'extracting') {
    return (
      <div className="page-shell">
        <Navigation />
        <main className="page-main">
          <div className={styles.extracting}>
            <div className={styles.spinner} />
            <h2 className={styles.extractingTitle}>Reading your recipe…</h2>
            <p className={styles.extractingText}>
              Claude is pulling out all the ingredients and steps.
              This takes about 10–15 seconds.
            </p>
          </div>
        </main>
      </div>
    )
  }

  if (stage === 'review' && extracted) {
    return <ReviewScreen
      extracted={extracted}
      files={files}
      onBack={() => setStage('upload')}
    />
  }

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className="content-col">
          <div className={styles.header}>
            <h1 className={styles.title}>Import recipe</h1>
            <p className={styles.sub}>
              Paste a link from any recipe site, or drop in a screenshot — Claude will
              pull out all the ingredients and steps automatically.
            </p>
          </div>

          {stage === 'error' && (
            <div className={styles.errorBox} role="alert">
              <p className={styles.errorTitle}>Couldn't import that recipe</p>
              <p className={styles.errorText}>{errorMsg}</p>
              <div className={styles.errorActions}>
                <button className={styles.retryBtn} onClick={() => setStage('upload')}>Try again</button>
                <button className={styles.draftBtn} onClick={handleSaveAsDraft}>
                  Save to needs-attention tray
                </button>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''} ${files.length ? styles.hasFiles : ''}`}
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload screenshot"
            onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className={styles.fileInput}
              onChange={onFileChange}
              aria-hidden="true"
            />

            {files.length === 0 ? (
              <div className={styles.dropContent}>
                <div className={styles.dropIcon}>📸</div>
                <p className={styles.dropTitle}>Tap to choose a screenshot</p>
                <p className={styles.dropHint}>
                  Add up to 10 screenshots — we'll combine them into one recipe.
                </p>
              </div>
            ) : (
              <div className={styles.previews}>
                {previews.map((src, i) => (
                  <img key={i} src={src} alt={`Screenshot ${i + 1}`} className={styles.preview} />
                ))}
                <div className={styles.previewAdd}>
                  <span>+ Add more ({files.length} added)</span>
                </div>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className={styles.actions}>
              <button className={styles.extractBtn} onClick={handleExtract}>
                Extract recipe →
              </button>
              <button
                className={styles.clearBtn}
                onClick={() => { setFiles([]); setPreviews([]); setStage('upload') }}
              >
                Start over
              </button>
            </div>
          )}

          <div className={styles.divider}>
            <span className={styles.dividerText}>or</span>
          </div>

          {/* URL import */}
          <div className={styles.urlSection}>
            <p className={styles.urlLabel}>Paste a recipe link</p>
            <div className={styles.urlRow}>
              <input
                className={styles.urlInput}
                type="url"
                placeholder="https://www.example.com/recipes/pasta"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleExtractUrl() }}
                aria-label="Recipe URL"
              />
              <button
                className={styles.urlBtn}
                onClick={handleExtractUrl}
                disabled={!urlInput.trim()}
              >
                Import →
              </button>
            </div>
          </div>

          <div className={styles.divider}>
            <span className={styles.dividerText}>or</span>
          </div>

          <div className={styles.manualOption}>
            <p className={styles.manualText}>Prefer to type it in yourself?</p>
            <button
              className={styles.manualBtn}
              onClick={() => navigate('/recipe/new')}
            >
              Add recipe manually
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── Review screen ───────────────────────────────────────────────────────────

function ReviewScreen({
  extracted: initial,
  files,
  onBack,
}: {
  extracted: ExtractedRecipe
  files: File[]
  onBack: () => void
}) {
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<ExtractedRecipe>({ ...initial })
  const [saving, setSaving] = useState(false)
  const [newTag, setNewTag] = useState('')
  const isEmptyExtraction = initial.ingredients.length === 0 && initial.steps.length === 0
  const [editMode, setEditMode] = useState(isEmptyExtraction)

  // Image picker state
  const [selectedImage, setSelectedImage] = useState<string | null>(initial.source_image_url ?? null)
  const [imageOptions, setImageOptions] = useState<{ url: string; thumb: string }[]>([])
  const [searchingImages, setSearchingImages] = useState(!initial.source_image_url)

  useEffect(() => {
    if (initial.source_image_url) return
    const title = initial.title.trim()
    if (!title) { setSearchingImages(false); return }
    searchImages(title)
      .then(imgs => {
        setImageOptions(imgs)
        if (imgs.length) setSelectedImage(imgs[0].url)
      })
      .catch(() => {})
      .finally(() => setSearchingImages(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updateIng = (i: number, field: keyof Ingredient, val: string) => {
    setRecipe(r => {
      const ings = [...r.ingredients]
      ings[i] = { ...ings[i], [field]: val }
      return { ...r, ingredients: ings }
    })
  }
  const removeIng = (i: number) => setRecipe(r => ({ ...r, ingredients: r.ingredients.filter((_, idx) => idx !== i) }))
  const addIng = () => setRecipe(r => ({ ...r, ingredients: [...r.ingredients, { amount: '', unit: '', name: '' }] }))
  const updateStep = (i: number, val: string) => setRecipe(r => { const s = [...r.steps]; s[i] = val; return { ...r, steps: s } })
  const removeStep = (i: number) => setRecipe(r => ({ ...r, steps: r.steps.filter((_, idx) => idx !== i) }))
  const addStep = () => setRecipe(r => ({ ...r, steps: [...r.steps, ''] }))
  const addTag = () => {
    const t = newTag.trim().toLowerCase()
    if (t && !recipe.tags.includes(t)) setRecipe(r => ({ ...r, tags: [...r.tags, t] }))
    setNewTag('')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const created = await createRecipe({
        title: recipe.title,
        description: recipe.description || null,
        servings: recipe.servings,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tags: recipe.tags,
        source_guess: recipe.source_guess || null,
        screenshot_keys: [],
      } as Parameters<typeof createRecipe>[0])

      for (const file of files) {
        try { await uploadImage(file, created.id, 'screenshot') } catch { /* non-fatal */ }
      }
      if (selectedImage) {
        try { await fetchRecipeImage(created.id, selectedImage) } catch { /* non-fatal */ }
      }

      navigate(`/recipe/${created.id}`)
    } catch (err) {
      setSaving(false)
      alert(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)

  // ── Preview mode (default) ────────────────────────────────────────────────
  if (!editMode) {
    return (
      <div className="page-shell">
        <Navigation />
        <main className="page-main">
          {(selectedImage || searchingImages) && (
            <div className={styles.previewHero}>
              {searchingImages
                ? <div className={styles.previewHeroPlaceholder} />
                : <img src={selectedImage!} alt={recipe.title} className={styles.previewHeroImg} />
              }
            </div>
          )}

          <div className="content-col">
            <button className={styles.backBtn} onClick={onBack}>← Start over</button>

            {recipe.tags.length > 0 && (
              <div className={styles.previewTags}>
                {recipe.tags.map(tag => <span key={tag} className={styles.previewTag}>{tag}</span>)}
              </div>
            )}

            <h1 className={styles.previewTitle}>{recipe.title}</h1>

            {recipe.description && <p className={styles.previewDesc}>{recipe.description}</p>}

            {(recipe.prep_time != null || recipe.cook_time != null || recipe.servings != null) && (
              <div className={styles.previewMeta}>
                {recipe.prep_time != null && (
                  <div className={styles.previewMetaItem}>
                    <span className={styles.previewMetaLabel}>Prep</span>
                    <span className={styles.previewMetaValue}>{formatTime(recipe.prep_time)}</span>
                  </div>
                )}
                {recipe.cook_time != null && (
                  <div className={styles.previewMetaItem}>
                    <span className={styles.previewMetaLabel}>Cook</span>
                    <span className={styles.previewMetaValue}>{formatTime(recipe.cook_time)}</span>
                  </div>
                )}
                {totalTime > 0 && recipe.prep_time != null && recipe.cook_time != null && (
                  <div className={styles.previewMetaItem}>
                    <span className={styles.previewMetaLabel}>Total</span>
                    <span className={styles.previewMetaValue}>{formatTime(totalTime)}</span>
                  </div>
                )}
                {recipe.servings != null && (
                  <div className={styles.previewMetaItem}>
                    <span className={styles.previewMetaLabel}>Serves</span>
                    <span className={styles.previewMetaValue}>{recipe.servings}</span>
                  </div>
                )}
              </div>
            )}

            <hr className={styles.previewDivider} />

            <section>
              <h2 className={styles.previewSectionTitle}>Ingredients</h2>
              <ul className={styles.previewIngredients}>
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className={styles.previewIng}>
                    <span className={styles.previewIngAmount}>{ing.amount}{ing.unit ? ` ${ing.unit}` : ''}</span>
                    <span className={styles.previewIngName}>{ing.name}</span>
                  </li>
                ))}
              </ul>
            </section>

            <hr className={styles.previewDivider} />

            <section>
              <h2 className={styles.previewSectionTitle}>Method</h2>
              <ol className={styles.previewSteps}>
                {recipe.steps.map((step, i) => (
                  <li key={i} className={styles.previewStep}>
                    <span className={styles.previewStepNum}>{i + 1}</span>
                    <p className={styles.previewStepText}>{step}</p>
                  </li>
                ))}
              </ol>
            </section>

            <div className={styles.previewActions}>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving || !recipe.title.trim()}
              >
                {saving ? 'Saving…' : 'Save recipe →'}
              </button>
              <button className={styles.editDetailsBtn} onClick={() => setEditMode(true)}>
                Something look off? Edit details
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className="content-col">
          <div className={styles.reviewHeader}>
            <button className={styles.backBtn} onClick={() => setEditMode(false)}>← Back to preview</button>
            <h1 className={styles.reviewTitle}>Edit details</h1>
            <p className={styles.reviewSub}>Fix anything before saving.</p>
          </div>

          <div className={styles.reviewForm}>
            {/* Photo picker */}
            {(searchingImages || selectedImage || imageOptions.length > 0) && (
              <div className={styles.field}>
                <label className={styles.label}>Recipe photo</label>

                {searchingImages && <p className={styles.imgSearching}>Finding photos…</p>}

                {!searchingImages && selectedImage && (
                  <div className={styles.imgSelected}>
                    <img src={selectedImage} alt="Recipe" className={styles.imgPreview} />
                    <div className={styles.imgThumbs}>
                      {imageOptions.map((opt, i) => (
                        <button
                          key={i}
                          className={`${styles.imgThumb} ${selectedImage === opt.url ? styles.imgThumbActive : ''}`}
                          onClick={() => setSelectedImage(opt.url)}
                        >
                          <img src={opt.thumb} alt="" />
                        </button>
                      ))}
                      <button className={styles.imgThumbNone} onClick={() => setSelectedImage(null)}>
                        No photo
                      </button>
                    </div>
                  </div>
                )}

                {!searchingImages && !selectedImage && imageOptions.length > 0 && (
                  <div className={styles.imgPicker}>
                    {imageOptions.map((opt, i) => (
                      <button key={i} className={styles.imgThumb} onClick={() => setSelectedImage(opt.url)}>
                        <img src={opt.thumb} alt={`Photo option ${i + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <div className={styles.field}>
              <label className={styles.label}>Recipe title</label>
              <input
                className={styles.input}
                value={recipe.title}
                onChange={e => setRecipe(r => ({ ...r, title: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className={styles.field}>
              <label className={styles.label}>Description <span className={styles.optional}>(optional)</span></label>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                value={recipe.description ?? ''}
                onChange={e => setRecipe(r => ({ ...r, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Times + servings */}
            <div className={styles.metaRow}>
              <div className={styles.field}>
                <label className={styles.label}>Prep (mins)</label>
                <input
                  className={styles.inputSm}
                  type="number"
                  min={0}
                  value={recipe.prep_time ?? ''}
                  onChange={e => setRecipe(r => ({ ...r, prep_time: parseInt(e.target.value) || null }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Cook (mins)</label>
                <input
                  className={styles.inputSm}
                  type="number"
                  min={0}
                  value={recipe.cook_time ?? ''}
                  onChange={e => setRecipe(r => ({ ...r, cook_time: parseInt(e.target.value) || null }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Serves</label>
                <input
                  className={styles.inputSm}
                  type="number"
                  min={1}
                  value={recipe.servings ?? ''}
                  onChange={e => setRecipe(r => ({ ...r, servings: parseInt(e.target.value) || null }))}
                />
              </div>
            </div>

            {/* Ingredients */}
            <div className={styles.field}>
              <label className={styles.label}>Ingredients</label>
              <div className={styles.ingredientsList}>
                {recipe.ingredients.map((ing, i) => (
                  <div key={i} className={styles.ingRow}>
                    <input className={styles.ingAmount} placeholder="Amount" value={ing.amount} onChange={e => updateIng(i, 'amount', e.target.value)} />
                    <input className={styles.ingUnit} placeholder="Unit" value={ing.unit} onChange={e => updateIng(i, 'unit', e.target.value)} />
                    <input className={`${styles.ingName} ${styles.inputFlex}`} placeholder="Ingredient" value={ing.name} onChange={e => updateIng(i, 'name', e.target.value)} />
                    <button className={styles.removeBtn} onClick={() => removeIng(i)} aria-label={`Remove ${ing.name}`}>✕</button>
                  </div>
                ))}
                <button className={styles.addRowBtn} onClick={addIng}>+ Add ingredient</button>
              </div>
            </div>

            {/* Steps */}
            <div className={styles.field}>
              <label className={styles.label}>Steps</label>
              <ol className={styles.stepsList}>
                {recipe.steps.map((step, i) => (
                  <li key={i} className={styles.stepRow}>
                    <span className={styles.stepNum}>{i + 1}</span>
                    <textarea
                      className={`${styles.input} ${styles.stepInput}`}
                      value={step}
                      onChange={e => updateStep(i, e.target.value)}
                      rows={3}
                    />
                    <button className={styles.removeBtn} onClick={() => removeStep(i)} aria-label={`Remove step ${i + 1}`}>✕</button>
                  </li>
                ))}
              </ol>
              <button className={styles.addRowBtn} onClick={addStep}>+ Add step</button>
            </div>

            {/* Tags */}
            <div className={styles.field}>
              <label className={styles.label}>Tags</label>
              <div className={styles.tagsField}>
                {recipe.tags.map(tag => (
                  <span key={tag} className={styles.tagChip}>
                    {tag}
                    <button className={styles.tagRemove} onClick={() => setRecipe(r => ({ ...r, tags: r.tags.filter(t => t !== tag) }))} aria-label={`Remove tag ${tag}`}>✕</button>
                  </span>
                ))}
                <input
                  className={styles.tagInput}
                  placeholder="Add tag…"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                />
              </div>
            </div>

            <div className={styles.saveRow}>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !recipe.title.trim()}>
                {saving ? 'Saving…' : 'Save recipe'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
