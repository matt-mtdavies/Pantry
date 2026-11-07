import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { formatTime, imageUrl, scaleIngredient } from '../lib/utils'
import { convertIngredient, convertStepText } from '../lib/units'
import type { Recipe } from '../types'
import ServingsStepper from './ServingsStepper'
import UnitToggle from './UnitToggle'
import { useUnitSystem } from '../hooks/useUnitSystem'
import PhotoCredit from './PhotoCredit'
import type { DemoPhotoCredit } from '../lib/demoPhotos'
import styles from './PublicRecipeView.module.css'

interface Props {
  recipe: Recipe
  /** Dark top bar: a line of context plus one action (e.g. "View in my Pantry"). */
  bannerText: ReactNode
  bannerAction?: ReactNode
  /** Rendered under the meta row, e.g. a "Cook this recipe" button. Gets the scaled servings. */
  actions?: (servings: number | null) => ReactNode
  footer?: ReactNode
  /** Attribution shown on the hero photo (hotlinked Unsplash photos). */
  photoCredit?: DemoPhotoCredit | null
}

/** Read-only recipe page for visitors: shared links and the public demo. */
export default function PublicRecipeView({ recipe, bannerText, bannerAction, actions, footer, photoCredit }: Props) {
  const [servings, setServings] = useState<number | null>(recipe.servings ?? null)
  const [unitPref, setUnitPref] = useUnitSystem()
  useEffect(() => { setServings(recipe.servings ?? null) }, [recipe.id, recipe.servings])

  const displayIngredients = useMemo(() => recipe.ingredients.map(ing => {
    const scaled = recipe.servings && servings ? scaleIngredient(ing, recipe.servings, servings) : ing
    const c = convertIngredient(scaled.amount, scaled.unit, unitPref)
    return { name: ing.name, amount: c.amount, unit: c.unit }
  }), [recipe, servings, unitPref])

  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)

  return (
    <div className={styles.page}>
      <header className={styles.banner}>
        <div className={styles.bannerInner}>
          <span className={styles.bannerBrand}>Pantry</span>
          <span className={styles.bannerText}>{bannerText}</span>
          {bannerAction}
        </div>
      </header>

      <main className={styles.main}>
        {recipe.hero_image_key && (
          <div className={styles.hero}>
            <img src={imageUrl(recipe.hero_image_key)!} alt={recipe.title} className={styles.heroImg} />
            {photoCredit && <PhotoCredit credit={photoCredit} overlay />}
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

            {actions && <div className={`${styles.actions} no-print`}>{actions(servings)}</div>}

            {recipe.source_url && (
              <p className={styles.source}>
                From <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">{recipe.source_guess || new URL(recipe.source_url).hostname.replace(/^www\./, '')}</a>
              </p>
            )}
          </div>

          <hr className={styles.divider} />

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Ingredients</h2>
              <div className={styles.ingControls}>
                {recipe.servings != null && servings != null && (
                  <ServingsStepper value={servings} onChange={setServings} base={recipe.servings} />
                )}
                <UnitToggle value={unitPref} onChange={setUnitPref} />
              </div>
            </div>
            <ul className={styles.ingredients}>
              {displayIngredients.map((ing, i) => (
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
                  <p className={styles.stepText}>{convertStepText(step, unitPref)}</p>
                </li>
              ))}
            </ol>
          </section>

          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </main>
    </div>
  )
}
