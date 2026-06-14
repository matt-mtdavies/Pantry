import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { getLeaderboard } from '../lib/api'
import { imageUrl, formatTime } from '../lib/utils'
import type { LeaderboardRecipe, LeaderboardChef } from '../types'
import styles from './LeaderboardPage.module.css'

const AVATARS: Record<string, string> = {
  herb: '🌿', lemon: '🍋', pepper: '🌶️', apple: '🍎', mushroom: '🍄', carrot: '🥕',
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [topRecipes, setTopRecipes] = useState<LeaderboardRecipe[]>([])
  const [topChefs, setTopChefs] = useState<LeaderboardChef[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'recipes' | 'chefs'>('recipes')

  useEffect(() => {
    getLeaderboard()
      .then(({ topRecipes, topChefs }) => {
        setTopRecipes(topRecipes)
        setTopChefs(topChefs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-shell">
      <Navigation />
      <main className="page-main">
        <div className={styles.hero}>
          <div className="wide-col">
            <h1 className={styles.heroTitle}>Leaderboard</h1>
            <p className={styles.heroSub}>The community's highest-rated recipes and top chefs.</p>
          </div>
        </div>

        <div className="wide-col">
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'recipes' ? styles.tabActive : ''}`}
              onClick={() => setTab('recipes')}
            >
              🏆 Top Recipes
            </button>
            <button
              className={`${styles.tab} ${tab === 'chefs' ? styles.tabActive : ''}`}
              onClick={() => setTab('chefs')}
            >
              👨‍🍳 Top Chefs
            </button>
          </div>

          {loading ? (
            <div className={styles.list}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`skeleton ${styles.skeletonRow}`} />
              ))}
            </div>
          ) : tab === 'recipes' ? (
            topRecipes.length === 0 ? (
              <EmptyState text="No rated recipes yet. Be the first to rate a recipe from the Explore page!" />
            ) : (
              <div className={styles.list}>
                {topRecipes.map((r, i) => <RecipeRow key={r.id} recipe={r} rank={i + 1} />)}
              </div>
            )
          ) : (
            topChefs.length === 0 ? (
              <EmptyState text="No chefs have ratings yet. Share a recipe and start collecting stars!" />
            ) : (
              <div className={styles.list}>
                {topChefs.map((c, i) => <ChefRow key={c.id} chef={c} rank={i + 1} />)}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  )
}

function RecipeRow({ recipe: r, rank }: { recipe: LeaderboardRecipe; rank: number }) {
  const thumb = r.hero_image_key ? imageUrl(r.hero_image_key) : null
  const totalTime = (r.prep_time ?? 0) + (r.cook_time ?? 0)

  return (
    <Link to={`/recipe/${r.id}`} className={styles.row}>
      <span className={styles.rank}>{MEDALS[rank - 1] ?? `#${rank}`}</span>
      <div className={styles.rowThumb}>
        {thumb
          ? <img src={thumb} alt={r.title} className={styles.rowImg} />
          : <span className={styles.rowPlaceholder}>🍽️</span>
        }
      </div>
      <div className={styles.rowInfo}>
        <p className={styles.rowTitle}>{r.title}</p>
        <p className={styles.rowMeta}>
          by {r.author_name ?? 'Anonymous'}
          {totalTime > 0 && ` · ${formatTime(totalTime)}`}
        </p>
      </div>
      <div className={styles.rowRating}>
        <span className={styles.rowStar}>★</span>
        <span className={styles.rowScore}>{r.avg_rating.toFixed(1)}</span>
        <span className={styles.rowCount}>({r.rating_count})</span>
      </div>
    </Link>
  )
}

function ChefRow({ chef: c, rank }: { chef: LeaderboardChef; rank: number }) {
  return (
    <div className={styles.row}>
      <span className={styles.rank}>{MEDALS[rank - 1] ?? `#${rank}`}</span>
      <div className={styles.chefAvatar}>
        {AVATARS[c.avatar_id] ?? '🌿'}
      </div>
      <div className={styles.rowInfo}>
        <p className={styles.rowTitle}>{c.display_name ?? 'Anonymous'}</p>
        <p className={styles.rowMeta}>
          {c.recipe_count} recipe{c.recipe_count !== 1 ? 's' : ''}
          {c.country ? ` · ${c.country}` : ''}
          {` · ${c.total_ratings} rating${c.total_ratings !== 1 ? 's' : ''}`}
        </p>
      </div>
      <div className={styles.rowRating}>
        <span className={styles.rowStar}>★</span>
        <span className={styles.rowScore}>{c.avg_rating.toFixed(1)}</span>
        <span className={styles.rowCount}>avg</span>
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyText}>{text}</p>
      <Link to="/explore" className={styles.emptyLink}>Go to Explore →</Link>
    </div>
  )
}
