import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import SaltGrinder from '../components/SaltGrinder'
import { SearchIcon, DishIcon, DiceIcon } from '../components/icons'
import { Avatar } from '../components/Avatar'
import { searchPublicRecipes, getDinnerSuggestions, createRecipe, searchImages, fetchRecipeImage } from '../lib/api'
import type { GeneratedRecipe } from '../lib/api'
import { imageUrl, formatTime } from '../lib/utils'
import { getCurrencySymbol } from '../lib/currency'
import type { Recipe } from '../types'
import styles from './SearchPage.module.css'

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Other']
const AGE_OPTIONS = ['Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+']

interface Filters {
  author: string
  country: string
  gender: string
  age_bracket: string
  cal_max: string
  cost_max: string
}

const EMPTY_FILTERS: Filters = { author: '', country: '', gender: '', age_bracket: '', cal_max: '', cost_max: '' }

function activeFilterCount(f: Filters) {
  return [f.author, f.country, f.gender, f.age_bracket, f.cal_max, f.cost_max].filter(Boolean).length
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [results, setResults] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback((q: string, f: Filters) => {
    setLoading(true)
    const params = new URLSearchParams({ q })
    if (f.author)      params.set('author', f.author)
    if (f.country)     params.set('country', f.country)
    if (f.gender)      params.set('gender', f.gender)
    if (f.age_bracket) params.set('age_bracket', f.age_bracket)
    if (f.cal_max)     params.set('cal_max', f.cal_max)
    if (f.cost_max)    params.set('cost_max', f.cost_max)
    searchPublicRecipes(params.toString())
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    doSearch('', EMPTY_FILTERS)
  }, [doSearch])

  const handleQueryChange = (q: string) => {
    setQuery(q)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(q, filters), 350)
  }

  const handleFilterChange = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(query, next), 350)
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    doSearch(query, EMPTY_FILTERS)
  }

  const activeCount = activeFilterCount(filters)

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className={styles.hero}>
          <div className="wide-col">
            <h1 className={styles.heroTitle}>Explore recipes</h1>
            <p className={styles.heroSub}>Browse dishes shared by the community, ranked by rating.</p>
            <div className={styles.searchWrap}>
              <SearchIcon size={15} className={styles.searchIcon} />
              <input
                type="search"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search by name, ingredient, tag…"
                className={styles.search}
                aria-label="Search all recipes"
              />
            </div>
            <button className={styles.dinnerBtn} onClick={() => setWizardOpen(true)}>
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5.5 4.5C5.5 3 5.8 2 5.5 1" />
                <path d="M8.5 4.5C8.5 3 8.8 2 8.5 1" />
                <path d="M11.5 4.5C11.5 3 11.8 2 11.5 1" />
                <path d="M2 7.5h13" />
                <path d="M2 7.5C2 11.64 4.91 15 8.5 15S15 11.64 15 7.5" />
              </svg>
              What's for dinner tonight?
            </button>
          </div>
        </div>

        <div className="wide-col">
          {/* Filter toggle */}
          <div className={styles.filterBar}>
            <button
              className={`${styles.filterToggle} ${filtersOpen ? styles.filterToggleOpen : ''}`}
              onClick={() => setFiltersOpen(o => !o)}
            >
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <line x1="0.75" y1="1" x2="13.25" y2="1" />
                <line x1="2.75" y1="5.5" x2="11.25" y2="5.5" />
                <line x1="4.75" y1="10" x2="9.25" y2="10" />
              </svg>
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
            {activeCount > 0 && (
              <button className={styles.clearFilters} onClick={clearFilters}>Clear all</button>
            )}
          </div>

          {/* Filter panel */}
          {filtersOpen && (
            <div className={styles.filterPanel}>
              <div className={styles.filterSection}>
                <p className={styles.filterSectionLabel}>Author</p>
                <div className={styles.filterRow}>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Name</label>
                    <input
                      className={styles.filterInput}
                      placeholder="e.g. Matt"
                      value={filters.author}
                      onChange={e => handleFilterChange({ author: e.target.value })}
                    />
                  </div>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Country</label>
                    <input
                      className={styles.filterInput}
                      placeholder="e.g. Australia"
                      value={filters.country}
                      onChange={e => handleFilterChange({ country: e.target.value })}
                    />
                  </div>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Gender</label>
                    <select
                      className={styles.filterSelect}
                      value={filters.gender}
                      onChange={e => handleFilterChange({ gender: e.target.value })}
                    >
                      <option value="">Any</option>
                      {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Age group</label>
                    <select
                      className={styles.filterSelect}
                      value={filters.age_bracket}
                      onChange={e => handleFilterChange({ age_bracket: e.target.value })}
                    >
                      <option value="">Any</option>
                      {AGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.filterSection}>
                <p className={styles.filterSectionLabel}>Recipe</p>
                <div className={styles.filterRow}>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Max calories / serving</label>
                    <input
                      className={styles.filterInput}
                      type="number"
                      min={0}
                      placeholder="e.g. 500"
                      value={filters.cal_max}
                      onChange={e => handleFilterChange({ cal_max: e.target.value })}
                    />
                  </div>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Max cost / serving (USD)</label>
                    <input
                      className={styles.filterInput}
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="e.g. 10"
                      value={filters.cost_max}
                      onChange={e => handleFilterChange({ cost_max: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`skeleton ${styles.skeletonCard}`} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No recipes found</p>
              <p className={styles.emptySub}>
                {query || activeCount > 0
                  ? 'Try adjusting your search or filters.'
                  : 'No public recipes yet — be the first to share one!'}
              </p>
            </div>
          ) : (
            <>
              <p className={styles.count}>{results.length} recipe{results.length !== 1 ? 's' : ''}</p>
              <div className={styles.grid}>
                {results.map(r => <SearchCard key={r.id} recipe={r} />)}
              </div>
            </>
          )}
        </div>
      </main>
      {wizardOpen && <DinnerWizard onClose={() => setWizardOpen(false)} />}
    </div>
  )
}

function SearchCard({ recipe: r }: { recipe: Recipe }) {
  const thumb = r.hero_image_key ? imageUrl(r.hero_image_key) : null
  const totalTime = (r.prep_time ?? 0) + (r.cook_time ?? 0)

  return (
    <div className={styles.card}>
      <Link to={`/recipe/${r.id}`} className={styles.cardOverlay} aria-label={r.title} />
      <div className={styles.cardImg}>
        {thumb
          ? <img src={thumb} alt={r.title} className={styles.cardPhoto} />
          : <DishIcon size={36} className={styles.cardPlaceholder} />
        }
        {(r.rating_count ?? 0) > 0 && (
          <div className={styles.cardBadge}>
            <span className={styles.badgeStar}>★</span>
            <span>{(r.avg_rating ?? 0).toFixed(1)}</span>
            <span className={styles.badgeCount}>({r.rating_count})</span>
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        {(r.tags ?? []).length > 0 && (
          <div className={styles.cardTags}>
            {(r.tags as string[]).slice(0, 2).map(t => (
              <span key={t} className={styles.cardTag}>{t}</span>
            ))}
          </div>
        )}
        <h3 className={styles.cardTitle}>{r.title}</h3>
        <div className={styles.cardMeta}>
          {totalTime > 0 && <span>{formatTime(totalTime)}</span>}
          {r.calories_per_serving && <span>~{r.calories_per_serving} kcal</span>}
          {r.cost_per_serving != null && <span>~{getCurrencySymbol(r.cost_currency)}{r.cost_per_serving.toFixed(2)}</span>}
        </div>
        {(r.avg_rating ?? 0) > 0 && (
          <div className={styles.cardStars}>
            {'★'.repeat(Math.round(r.avg_rating ?? 0))}{'☆'.repeat(5 - Math.round(r.avg_rating ?? 0))}
          </div>
        )}
        <div className={styles.cardAuthor}>
          <Avatar imageKey={r.author_avatar_key} avatarId={r.author_avatar} size={20} className={styles.authorAvatar} />
          <Link to={`/user/${r.user_id}`} className={styles.authorLink}>
            {r.author_name ?? 'Anonymous'}
          </Link>
        </div>
      </div>
    </div>
  )
}

const PANTRY_CHIPS = [
  'Eggs', 'Onion', 'Garlic', 'Tomatoes', 'Chicken', 'Pasta', 'Rice',
  'Potatoes', 'Carrots', 'Butter', 'Milk', 'Cheese', 'Bread', 'Lemon',
  'Olive oil', 'Flour', 'Canned tomatoes', 'Mushrooms', 'Spinach', 'Broccoli',
  'Tuna', 'Salmon', 'Bacon', 'Sausages', 'Chickpeas', 'Lentils',
  'Kidney beans', 'Avocado', 'Yoghurt', 'Cream', 'Soy sauce',
  'Ginger', 'Pork', 'Beef mince', 'Prawns', 'Tofu', 'Corn',
]

type WizardStage = 'form' | 'loading' | 'summaries' | 'detail' | 'error'

function DinnerWizard({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<'match' | 'create'>('create')
  const [stage, setStage] = useState<WizardStage>('form')
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([])
  const [summaryImages, setSummaryImages] = useState<(string | null)[]>([null, null, null])
  const [activeRecipe, setActiveRecipe] = useState<GeneratedRecipe | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleChip = (item: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(item)) { next.delete(item) } else { next.add(item) }
      return next
    })
  }

  const runWizard = async (ingredientOverride?: string[]) => {
    setStage('loading')
    setSummaryImages([null, null, null])
    try {
      const ingredientList = ingredientOverride ?? Array.from(selected)
      const result = await getDinnerSuggestions(ingredientList, mode)
      setRecipes(result.recipes.slice(0, 3))
      setStage('summaries')
      result.recipes.slice(0, 3).forEach(async (r, i) => {
        try {
          const imgs = await searchImages([r.title, ...r.tags.slice(0, 1)].join(' '))
          if (imgs.length > 0) {
            setSummaryImages(prev => { const next = [...prev]; next[i] = imgs[0].thumb; return next })
          }
        } catch { /* image is optional */ }
      })
    } catch {
      setStage('error')
    }
  }

  const handleSave = async () => {
    if (!activeRecipe) return
    setSaving(true)
    try {
      const saved = await createRecipe({
        title: activeRecipe.title,
        description: activeRecipe.description,
        servings: activeRecipe.servings,
        prep_time: activeRecipe.prep_time,
        cook_time: activeRecipe.cook_time,
        ingredients: activeRecipe.ingredients,
        steps: activeRecipe.steps,
        tags: activeRecipe.tags,
        calories_per_serving: activeRecipe.calories_per_serving,
        cost_per_serving: activeRecipe.cost_per_serving,
        cost_currency: activeRecipe.cost_currency || 'USD',
      })
      try {
        const imageQuery = [activeRecipe.title, ...activeRecipe.tags.slice(0, 2)].join(' ')
        const images = await searchImages(imageQuery)
        if (images.length > 0) await fetchRecipeImage(saved.id, images[0].url)
      } catch { /* image is optional */ }
      setSavedId(saved.id)
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const wizardSubtitle =
    stage === 'summaries' ? '3 ideas for tonight — tap one to see the full recipe.' :
    stage === 'detail' ? 'Full recipe — save it to your collection.' :
    'Tap what you have in your pantry.'

  return (
    <div className={styles.wizardOverlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.wizardSheet}>
        <div className={styles.wizardHandle} />
        <div className={styles.wizardHeader}>
          <div>
            <h2 className={styles.wizardTitle}>What's for dinner?</h2>
            <p className={styles.wizardSub}>{wizardSubtitle}</p>
          </div>
          <button className={styles.wizardClose} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {stage === 'form' && (
          <div className={styles.wizardForm}>
            <button className={styles.surprisePill} onClick={() => runWizard([])}>
              <DiceIcon size={17} /> Surprise me
            </button>

            <div className={styles.wizardDivider}><span>or pick what you have</span></div>

            <div className={styles.wizardField}>
              <div className={styles.chipGrid}>
                {PANTRY_CHIPS.map(item => (
                  <button
                    key={item}
                    className={`${styles.chip} ${selected.has(item) ? styles.chipActive : ''}`}
                    onClick={() => toggleChip(item)}
                    aria-pressed={selected.has(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.wizardField}>
              <label className={styles.wizardLabel}>Do you want to go shopping?</label>
              <div className={styles.wizardModeToggle}>
                <button
                  className={`${styles.wizardModeBtn} ${mode === 'match' ? styles.wizardModeBtnActive : ''}`}
                  onClick={() => setMode('match')}
                >
                  No, use what I have
                </button>
                <button
                  className={`${styles.wizardModeBtn} ${mode === 'create' ? styles.wizardModeBtnActive : ''}`}
                  onClick={() => setMode('create')}
                >
                  Happy to go to the shops
                </button>
              </div>
            </div>

            <button
              className={styles.wizardFindBtn}
              onClick={() => runWizard()}
            >
              Find recipes →
            </button>
          </div>
        )}

        {stage === 'loading' && (
          <div className={styles.wizardLoading}>
            <SaltGrinder size={56} />
            <p className={styles.wizardLoadingText}>Cooking up 3 ideas for you…</p>
          </div>
        )}

        {stage === 'error' && (
          <div className={styles.wizardEmpty}>
            <p className={styles.wizardEmptyTitle}>Something went wrong</p>
            <p className={styles.wizardEmptySub}>Couldn't generate recipes — please try again.</p>
            <button className={styles.wizardBackBtn} onClick={() => runWizard()}>Try again</button>
            <button className={styles.wizardBackBtn} onClick={() => setStage('form')}>← Change ingredients</button>
          </div>
        )}

        {stage === 'summaries' && (
          <div className={styles.wizardSummaries}>
            <div className={styles.summaryGrid}>
              {recipes.map((r, i) => (
                <button
                  key={i}
                  className={styles.summaryCard}
                  onClick={() => { setActiveRecipe(r); setSavedId(null); setStage('detail') }}
                >
                  <div className={styles.summaryImgWrap}>
                    {summaryImages[i]
                      ? <img src={summaryImages[i]!} alt={r.title} className={styles.summaryImg} />
                      : <DishIcon size={32} className={styles.summaryPlaceholder} />
                    }
                  </div>
                  <div className={styles.summaryBody}>
                    <h3 className={styles.summaryTitle}>{r.title}</h3>
                    {r.description && <p className={styles.summaryDesc}>{r.description}</p>}
                    <div className={styles.summaryMeta}>
                      {(r.prep_time + r.cook_time) > 0 && <span>{formatTime(r.prep_time + r.cook_time)}</span>}
                      <span>Serves {r.servings}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className={styles.summaryActions}>
              <button className={styles.wizardTryAgain} onClick={() => runWizard()}>Try different ideas</button>
              <button className={styles.wizardBackBtn} onClick={() => setStage('form')}>← Change ingredients</button>
            </div>
          </div>
        )}

        {stage === 'detail' && activeRecipe && (
          <div className={styles.wizardCreated}>
            <div className={styles.createdCard}>
              {activeRecipe.tags.length > 0 && (
                <div className={styles.createdTags}>
                  {activeRecipe.tags.slice(0, 3).map(t => (
                    <span key={t} className={styles.createdTag}>{t}</span>
                  ))}
                </div>
              )}
              <h3 className={styles.createdTitle}>{activeRecipe.title}</h3>
              {activeRecipe.description && (
                <p className={styles.createdDesc}>{activeRecipe.description}</p>
              )}
              <div className={styles.createdMeta}>
                {activeRecipe.prep_time > 0 && <span>Prep {activeRecipe.prep_time}m</span>}
                {activeRecipe.cook_time > 0 && <span>Cook {activeRecipe.cook_time}m</span>}
                <span>Serves {activeRecipe.servings}</span>
                {activeRecipe.calories_per_serving != null && <span>~{activeRecipe.calories_per_serving} kcal</span>}
                {activeRecipe.cost_per_serving != null && <span>~${activeRecipe.cost_per_serving.toFixed(2)}/serve</span>}
              </div>

              <div className={styles.createdSection}>
                <h4 className={styles.createdSectionTitle}>Ingredients</h4>
                <ul className={styles.createdIngredients}>
                  {activeRecipe.ingredients.map((ing, i) => (
                    <li key={i} className={styles.createdIngredient}>
                      <span className={styles.createdIngAmt}>{ing.amount} {ing.unit}</span>
                      <span>{ing.name}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {activeRecipe.shopping_list.length > 0 && (
                <div className={styles.createdSection}>
                  <h4 className={styles.createdSectionTitle}>Shopping list</h4>
                  <ul className={styles.createdShoppingList}>
                    {activeRecipe.shopping_list.map((item, i) => (
                      <li key={i} className={styles.createdShoppingItem}>
                        <span className={styles.createdShopCheck}>☐</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.createdSection}>
                <h4 className={styles.createdSectionTitle}>Method</h4>
                <ol className={styles.createdSteps}>
                  {activeRecipe.steps.map((step, i) => (
                    <li key={i} className={styles.createdStep}>
                      <span className={styles.createdStepNum}>{i + 1}</span>
                      <p>{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className={styles.createdActions}>
              {savedId ? (
                <Link to={`/recipe/${savedId}`} className={styles.createdSavedLink} onClick={onClose}>
                  ✓ Saved — View recipe
                </Link>
              ) : (
                <button className={styles.createdSaveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save to my recipes'}
                </button>
              )}
              <button className={styles.wizardBackBtn} onClick={() => { setActiveRecipe(null); setSavedId(null); setStage('summaries') }}>
                ← Back to ideas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
