import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { extractFromScreenshots, createRecipe, uploadImage } from '../lib/api'
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

  const handleFiles = useCallback((selected: File[]) => {
    const valid = selected.filter(f => f.type.startsWith('image/'))
    if (!valid.length) return
    setFiles(valid)
    const urls = valid.map(f => URL.createObjectURL(f))
    setPreviews(urls)
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

  const handleSaveAsDraft = async () => {
    setStage('saving')
    try {
      const recipe = await createRecipe({
        title: 'Untitled recipe (from screenshot)',
        needs_attention: true,
        screenshot_keys: [],
      } as Parameters<typeof createRecipe>[0])
      // Upload screenshots and attach
      for (const file of files) {
        try {
          await uploadImage(file, recipe.id, 'screenshot')
        } catch { /* non-fatal */ }
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
              Claude is looking at your screenshot and pulling out all the details.
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
            <h1 className={styles.title}>Add from screenshot</h1>
            <p className={styles.sub}>
              Got a photo of a recipe? Drop it here and we'll pull out all the
              ingredients and steps automatically.
            </p>
          </div>

          {stage === 'error' && (
            <div className={styles.errorBox} role="alert">
              <p className={styles.errorTitle}>Couldn't read that screenshot</p>
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
                  Long recipes? You can add multiple screenshots — we'll combine them.
                </p>
              </div>
            ) : (
              <div className={styles.previews}>
                {previews.map((src, i) => (
                  <img key={i} src={src} alt={`Screenshot ${i + 1}`} className={styles.preview} />
                ))}
                <div className={styles.previewAdd}>
                  <span>+ Add more</span>
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

  const updateIng = (i: number, field: keyof Ingredient, val: string) => {
    setRecipe(r => {
      const ings = [...r.ingredients]
      ings[i] = { ...ings[i], [field]: val }
      return { ...r, ingredients: ings }
    })
  }

  const removeIng = (i: number) => {
    setRecipe(r => ({ ...r, ingredients: r.ingredients.filter((_, idx) => idx !== i) }))
  }

  const addIng = () => {
    setRecipe(r => ({ ...r, ingredients: [...r.ingredients, { amount: '', unit: '', name: '' }] }))
  }

  const updateStep = (i: number, val: string) => {
    setRecipe(r => {
      const steps = [...r.steps]
      steps[i] = val
      return { ...r, steps }
    })
  }

  const removeStep = (i: number) => {
    setRecipe(r => ({ ...r, steps: r.steps.filter((_, idx) => idx !== i) }))
  }

  const addStep = () => {
    setRecipe(r => ({ ...r, steps: [...r.steps, ''] }))
  }

  const addTag = () => {
    const t = newTag.trim().toLowerCase()
    if (t && !recipe.tags.includes(t)) {
      setRecipe(r => ({ ...r, tags: [...r.tags, t] }))
    }
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

      // Upload screenshots
      for (const file of files) {
        try {
          await uploadImage(file, created.id, 'screenshot')
        } catch { /* non-fatal */ }
      }

      navigate(`/recipe/${created.id}`)
    } catch (err) {
      setSaving(false)
      alert(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className="content-col">
          <div className={styles.reviewHeader}>
            <button className={styles.backBtn} onClick={onBack}>← Back</button>
            <h1 className={styles.reviewTitle}>Review & fix</h1>
            <p className={styles.reviewSub}>
              Claude did its best — check the details and fix anything that looks off before saving.
            </p>
          </div>

          <div className={styles.reviewForm}>
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
                    <input
                      className={styles.ingAmount}
                      placeholder="Amount"
                      value={ing.amount}
                      onChange={e => updateIng(i, 'amount', e.target.value)}
                    />
                    <input
                      className={styles.ingUnit}
                      placeholder="Unit"
                      value={ing.unit}
                      onChange={e => updateIng(i, 'unit', e.target.value)}
                    />
                    <input
                      className={`${styles.ingName} ${styles.inputFlex}`}
                      placeholder="Ingredient"
                      value={ing.name}
                      onChange={e => updateIng(i, 'name', e.target.value)}
                    />
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeIng(i)}
                      aria-label={`Remove ${ing.name}`}
                    >✕</button>
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
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeStep(i)}
                      aria-label={`Remove step ${i + 1}`}
                    >✕</button>
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
                    <button
                      className={styles.tagRemove}
                      onClick={() => setRecipe(r => ({ ...r, tags: r.tags.filter(t => t !== tag) }))}
                      aria-label={`Remove tag ${tag}`}
                    >✕</button>
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
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving || !recipe.title.trim()}
              >
                {saving ? 'Saving…' : 'Save recipe'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
