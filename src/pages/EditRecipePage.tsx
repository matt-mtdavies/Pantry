import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { getRecipe, createRecipe, updateRecipe } from '../lib/api'
import type { Recipe, Ingredient } from '../types'
import styles from './EditRecipePage.module.css'

const EMPTY_RECIPE = (): Partial<Recipe> => ({
  title: '',
  description: '',
  servings: 4,
  prep_time: null,
  cook_time: null,
  ingredients: [],
  steps: [],
  tags: [],
  source_guess: '',
})

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id

  const [recipe, setRecipe] = useState<Partial<Recipe>>(EMPTY_RECIPE())
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    if (isNew) return
    getRecipe(id)
      .then(r => setRecipe(r))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id, isNew, navigate])

  const update = <K extends keyof Recipe>(key: K, val: Recipe[K]) => {
    setRecipe(r => ({ ...r, [key]: val }))
  }

  const updateIng = (i: number, field: keyof Ingredient, val: string) => {
    const ings = [...(recipe.ingredients ?? [])]
    ings[i] = { ...ings[i], [field]: val }
    update('ingredients', ings)
  }

  const removeIng = (i: number) =>
    update('ingredients', (recipe.ingredients ?? []).filter((_, idx) => idx !== i))

  const addIng = () =>
    update('ingredients', [...(recipe.ingredients ?? []), { amount: '', unit: '', name: '' }])

  const updateStep = (i: number, val: string) => {
    const steps = [...(recipe.steps ?? [])]
    steps[i] = val
    update('steps', steps)
  }

  const removeStep = (i: number) =>
    update('steps', (recipe.steps ?? []).filter((_, idx) => idx !== i))

  const addStep = () =>
    update('steps', [...(recipe.steps ?? []), ''])

  const addTag = () => {
    const t = newTag.trim().toLowerCase()
    if (t && !(recipe.tags ?? []).includes(t)) {
      update('tags', [...(recipe.tags ?? []), t])
    }
    setNewTag('')
  }

  const handleSave = async () => {
    if (!recipe.title?.trim()) return
    setSaving(true)
    try {
      if (isNew) {
        const created = await createRecipe(recipe)
        navigate(`/recipe/${created.id}`)
      } else {
        await updateRecipe(id, recipe)
        navigate(`/recipe/${id}`)
      }
    } catch (err) {
      setSaving(false)
      alert(err instanceof Error ? err.message : 'Save failed')
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <Navigation />
        <main className="page-main">
          <div className={styles.loading}>
            <div className={styles.spinner} aria-label="Loading recipe" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className="content-col">
          <div className={styles.pageHeader}>
            <button className={styles.backBtn} onClick={() => navigate(-1)}>← Back</button>
            <h1 className={styles.pageTitle}>{isNew ? 'Add a recipe' : 'Edit recipe'}</h1>
          </div>

          <div className={styles.form}>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="title">Recipe title</label>
              <input
                id="title"
                className={styles.input}
                value={recipe.title ?? ''}
                onChange={e => update('title', e.target.value)}
                placeholder="e.g. Roast chicken with herbs"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="description">
                Description <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                id="description"
                className={`${styles.input} ${styles.textarea}`}
                value={recipe.description ?? ''}
                onChange={e => update('description', e.target.value)}
                placeholder="A short description of the dish…"
                rows={3}
              />
            </div>

            <div className={styles.metaRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="prep">Prep (mins)</label>
                <input
                  id="prep"
                  className={styles.inputSm}
                  type="number"
                  min={0}
                  value={recipe.prep_time ?? ''}
                  onChange={e => update('prep_time', parseInt(e.target.value) || null as unknown as number)}
                  placeholder="15"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="cook">Cook (mins)</label>
                <input
                  id="cook"
                  className={styles.inputSm}
                  type="number"
                  min={0}
                  value={recipe.cook_time ?? ''}
                  onChange={e => update('cook_time', parseInt(e.target.value) || null as unknown as number)}
                  placeholder="30"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="servings">Serves</label>
                <input
                  id="servings"
                  className={styles.inputSm}
                  type="number"
                  min={1}
                  value={recipe.servings ?? ''}
                  onChange={e => update('servings', parseInt(e.target.value) || null as unknown as number)}
                  placeholder="4"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Ingredients</label>
              <div className={styles.ingredientsList}>
                {(recipe.ingredients ?? []).map((ing, i) => (
                  <div key={i} className={styles.ingRow}>
                    <input
                      className={styles.ingAmount}
                      placeholder="Amt"
                      value={ing.amount}
                      onChange={e => updateIng(i, 'amount', e.target.value)}
                      aria-label={`Amount for ingredient ${i + 1}`}
                    />
                    <input
                      className={styles.ingUnit}
                      placeholder="Unit"
                      value={ing.unit}
                      onChange={e => updateIng(i, 'unit', e.target.value)}
                      aria-label={`Unit for ingredient ${i + 1}`}
                    />
                    <input
                      className={`${styles.ingName} ${styles.inputFlex}`}
                      placeholder="Ingredient name"
                      value={ing.name}
                      onChange={e => updateIng(i, 'name', e.target.value)}
                      aria-label={`Name of ingredient ${i + 1}`}
                    />
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeIng(i)}
                      aria-label={`Remove ${ing.name || `ingredient ${i + 1}`}`}
                    >✕</button>
                  </div>
                ))}
                <button className={styles.addRowBtn} onClick={addIng}>+ Add ingredient</button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Steps</label>
              <ol className={styles.stepsList}>
                {(recipe.steps ?? []).map((step, i) => (
                  <li key={i} className={styles.stepRow}>
                    <span className={styles.stepNum}>{i + 1}</span>
                    <textarea
                      className={`${styles.input} ${styles.stepInput}`}
                      value={step}
                      onChange={e => updateStep(i, e.target.value)}
                      rows={3}
                      aria-label={`Step ${i + 1}`}
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

            <div className={styles.field}>
              <label className={styles.label}>Tags</label>
              <p className={styles.hint}>e.g. dinner, baking, quick, vegetarian</p>
              <div className={styles.tagsField}>
                {(recipe.tags ?? []).map(tag => (
                  <span key={tag} className={styles.tagChip}>
                    {tag}
                    <button
                      className={styles.tagRemove}
                      onClick={() => update('tags', (recipe.tags ?? []).filter(t => t !== tag))}
                      aria-label={`Remove tag ${tag}`}
                    >✕</button>
                  </span>
                ))}
                <input
                  className={styles.tagInput}
                  placeholder="Type a tag, press Enter…"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
                  }}
                  aria-label="Add tag"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="source">
                Where's it from? <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="source"
                className={styles.input}
                value={recipe.source_guess ?? ''}
                onChange={e => update('source_guess', e.target.value)}
                placeholder="e.g. BBC Good Food, Nigella Lawson"
              />
            </div>

            <div className={styles.saveRow}>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving || !recipe.title?.trim()}
              >
                {saving ? 'Saving…' : isNew ? 'Save recipe' : 'Save changes'}
              </button>
              <button className={styles.cancelBtn} onClick={() => navigate(-1)} disabled={saving}>
                Cancel
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
