import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DemoBar from '../../components/DemoBar'
import RecipeCard from '../../components/RecipeCard'
import TourPill from '../../components/TourPill'
import { HeartIcon, CollectionIcon } from '../../components/icons'
import { getDemoRecipes, demoCollections, DEMO_OWNER_NAME } from '../../lib/demo'
import { useDemoPhotos } from '../../lib/demoPhotos'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import styles from './DemoPage.module.css'

type Filter = 'all' | 'favourites' | string // or a collection id

export default function DemoPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const { ready, picks } = useDemoPhotos()
  const demoRecipes = ready ? getDemoRecipes() : []
  const credits = [...new Map(Object.values(picks).map(p => [p.photographer_url, p])).values()]

  useDocumentMeta({
    title: 'Demo pantry · Pantry',
    description: 'Look around a real Pantry recipe box — recipes, collections and cook mode — no account needed.',
    path: '/demo',
  })

  const collectionNamesById = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const c of demoCollections) for (const id of c.recipe_ids) map.set(id, [...(map.get(id) ?? []), c.name])
    return map
  }, [])

  const visible = demoRecipes.filter(r =>
    filter === 'all' ? true
    : filter === 'favourites' ? r.is_favourite
    : demoCollections.find(c => c.id === filter)?.recipe_ids.includes(r.id),
  )

  return (
    <div className={styles.page}>
      <DemoBar />
      <section className={styles.hero} aria-label="Demo pantry">
        <div className="wide-col">
          <p className={styles.eyebrow}>Demo pantry</p>
          <h1 className={styles.title}>{DEMO_OWNER_NAME}'s recipes</h1>
          <p className={styles.sub}>
            10 recipes, saved the way you'd save yours: one imported from a recipe site,
            the rest typed in. Open one, scale it, switch units, or start cook mode.
          </p>
        </div>
      </section>

      <main className="wide-col">
        <div className={styles.filters} role="group" aria-label="Filter recipes">
          <button className={`${styles.filter} ${filter === 'all' ? styles.filterActive : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </button>
          <button className={`${styles.filter} ${filter === 'favourites' ? styles.filterActive : ''}`} aria-pressed={filter === 'favourites'} onClick={() => setFilter('favourites')}>
            <HeartIcon size={13} /> Favourites
          </button>
          {demoCollections.map(c => (
            <button key={c.id} className={`${styles.filter} ${filter === c.id ? styles.filterActive : ''}`} aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
              <CollectionIcon size={13} /> {c.name}
            </button>
          ))}
        </div>

        <div className={styles.grid} aria-busy={!ready}>
          {!ready && Array.from({ length: 6 }, (_, i) => <div key={i} className={styles.skeleton} aria-hidden="true" />)}
          {visible.map(r => (
            <RecipeCard
              key={r.id}
              recipe={r}
              href={`/demo/recipe/${r.id}`}
              collectionNames={filter === 'all' || filter === 'favourites' ? collectionNamesById.get(r.id) : undefined}
            />
          ))}
        </div>

        {credits.length > 0 && (
          <p className={styles.credits}>
            Photos on <a href="https://unsplash.com/?utm_source=pantry&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a> by{' '}
            {credits.map((c, i) => (
              <span key={c.photographer_url}>
                {i > 0 && (i === credits.length - 1 ? ' and ' : ', ')}
                <a href={c.photographer_url} target="_blank" rel="noopener noreferrer">{c.photographer}</a>
              </span>
            ))}.
          </p>
        )}

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Start your own recipe box</h2>
          <p className={styles.ctaText}>Free. Paste a link from any recipe site and it's saved in about 20 seconds.</p>
          <Link to="/?signup=1#get-started" className={styles.ctaBtn}>Create free account</Link>
        </section>
      </main>
      <TourPill />
    </div>
  )
}
