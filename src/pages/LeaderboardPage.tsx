import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import { getLeaderboard, getFeed } from '../lib/api'
import { imageUrl, formatTime, timeAgo } from '../lib/utils'
import { avatarEmoji } from '../lib/avatars'
import { TrophyIcon, PersonIcon, DishIcon, StarIcon, SunIcon, ClockIcon } from '../components/icons'
import type { LeaderboardRecipe, LeaderboardChef, FeedData } from '../types'
import styles from './LeaderboardPage.module.css'

type Tab = 'today' | 'recipes' | 'chefs'

function RankBadge({ rank }: { rank: number }) {
  const cls = rank === 1 ? styles.rankGold : rank === 2 ? styles.rankSilver : rank === 3 ? styles.rankBronze : styles.rankPlain
  return <span className={`${styles.rank} ${cls}`}>{rank <= 3 ? rank : `#${rank}`}</span>
}

export default function LeaderboardPage() {
  const [topRecipes, setTopRecipes] = useState<LeaderboardRecipe[]>([])
  const [topChefs, setTopChefs] = useState<LeaderboardChef[]>([])
  const [feed, setFeed] = useState<FeedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('today')

  useEffect(() => {
    Promise.all([getLeaderboard(), getFeed()])
      .then(([lb, fd]) => {
        setTopRecipes(lb.topRecipes)
        setTopChefs(lb.topChefs)
        setFeed(fd)
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
            <h1 className={styles.heroTitle}>Community</h1>
            <p className={styles.heroSub}>Daily tips, recently shared recipes, and the highest-rated cooks.</p>
          </div>
        </div>

        <div className="wide-col">
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'today' ? styles.tabActive : ''}`}
              onClick={() => setTab('today')}
            >
              <SunIcon size={14} className={styles.tabIcon} />
              Today
            </button>
            <button
              className={`${styles.tab} ${tab === 'recipes' ? styles.tabActive : ''}`}
              onClick={() => setTab('recipes')}
            >
              <TrophyIcon size={14} className={styles.tabIcon} />
              Top Recipes
            </button>
            <button
              className={`${styles.tab} ${tab === 'chefs' ? styles.tabActive : ''}`}
              onClick={() => setTab('chefs')}
            >
              <PersonIcon size={14} className={styles.tabIcon} />
              Top Chefs
            </button>
          </div>

          {loading ? (
            <div className={styles.loadingArea}>
              <div className={`skeleton ${styles.skeletonTip}`} />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`skeleton ${styles.skeletonRow}`} />
              ))}
            </div>
          ) : tab === 'today' ? (
            <TodayTab feed={feed} />
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

function TodayTab({ feed }: { feed: FeedData | null }) {
  if (!feed) return null

  return (
    <div className={styles.todayWrap}>
      {/* Daily tip */}
      <div className={styles.tipCard}>
        <div className={styles.tipHeader}>
          <span className={styles.tipEmoji}>{feed.tip.emoji}</span>
          <span className={styles.tipCategory}>{feed.tip.category}</span>
        </div>
        <p className={styles.tipText}>{feed.tip.tip}</p>
      </div>

      {/* Recently shared */}
      {feed.recentShared.length > 0 && (
        <div className={styles.feedSection}>
          <h2 className={styles.feedSectionTitle}>Recently Added</h2>
          <div className={styles.feedList}>
            {feed.recentShared.map(r => (
              <div key={r.id} className={styles.feedRow}>
                <Link to={`/recipe/${r.id}`} className={styles.feedOverlay} aria-label={r.title} />
                <div className={styles.feedThumb}>
                  {r.hero_image_key
                    ? <img src={imageUrl(r.hero_image_key)!} alt={r.title} className={styles.feedImg} />
                    : <DishIcon size={22} className={styles.feedPlaceholder} />
                  }
                </div>
                <div className={styles.feedInfo}>
                  <p className={styles.feedTitle}>{r.title}</p>
                  <p className={styles.feedMeta}>
                    {r.user_id ? (
                      <Link to={`/user/${r.user_id}`} className={styles.feedAuthorLink}>
                        {r.author_name ?? 'Anonymous'}
                      </Link>
                    ) : (r.author_name ?? 'Anonymous')}
                    {' · '}
                    {timeAgo(r.created_at)}
                    {(r.prep_time ?? 0) + (r.cook_time ?? 0) > 0 && (
                      <span className={styles.feedTime}>
                        <ClockIcon size={11} className={styles.feedTimeIcon} />
                        {formatTime((r.prep_time ?? 0) + (r.cook_time ?? 0))}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hot this week */}
      {feed.topThisWeek.length > 0 && (
        <div className={styles.feedSection}>
          <h2 className={styles.feedSectionTitle}>Hot This Week</h2>
          <div className={styles.feedList}>
            {feed.topThisWeek.map(r => (
              <div key={r.id} className={styles.feedRow}>
                <Link to={`/recipe/${r.id}`} className={styles.feedOverlay} aria-label={r.title} />
                <div className={styles.feedThumb}>
                  {r.hero_image_key
                    ? <img src={imageUrl(r.hero_image_key)!} alt={r.title} className={styles.feedImg} />
                    : <DishIcon size={22} className={styles.feedPlaceholder} />
                  }
                </div>
                <div className={styles.feedInfo}>
                  <p className={styles.feedTitle}>{r.title}</p>
                  <p className={styles.feedMeta}>
                    {r.user_id ? (
                      <Link to={`/user/${r.user_id}`} className={styles.feedAuthorLink}>
                        {r.author_name ?? 'Anonymous'}
                      </Link>
                    ) : (r.author_name ?? 'Anonymous')}
                  </p>
                </div>
                {r.avg_rating != null && (
                  <div className={styles.feedRating}>
                    <StarIcon size={13} className={styles.rowStar} />
                    <span className={styles.rowScore}>{r.avg_rating.toFixed(1)}</span>
                    <span className={styles.rowCount}>({r.rating_count})</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {feed.recentShared.length === 0 && feed.topThisWeek.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>No community activity yet — share a recipe and kick things off!</p>
          <Link to="/explore" className={styles.emptyBtn}>Browse Explore</Link>
        </div>
      )}

      <p className={styles.todayDate}>
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </div>
  )
}

function RecipeRow({ recipe: r, rank }: { recipe: LeaderboardRecipe; rank: number }) {
  const thumb = r.hero_image_key ? imageUrl(r.hero_image_key) : null
  const totalTime = (r.prep_time ?? 0) + (r.cook_time ?? 0)

  return (
    <div className={styles.row}>
      <Link to={`/recipe/${r.id}`} className={styles.rowOverlay} aria-label={r.title} />
      <RankBadge rank={rank} />
      <div className={styles.rowThumb}>
        {thumb
          ? <img src={thumb} alt={r.title} className={styles.rowImg} />
          : <DishIcon size={24} className={styles.rowPlaceholder} />
        }
      </div>
      <div className={styles.rowInfo}>
        <p className={styles.rowTitle}>{r.title}</p>
        <p className={styles.rowMeta}>
          <Link to={`/user/${r.user_id}`} className={styles.rowAuthorLink}>
            by {r.author_name ?? 'Anonymous'}
          </Link>
          {totalTime > 0 && ` · ${formatTime(totalTime)}`}
        </p>
      </div>
      <div className={styles.rowRating}>
        <StarIcon size={14} className={styles.rowStar} />
        <span className={styles.rowScore}>{r.avg_rating.toFixed(1)}</span>
        <span className={styles.rowCount}>({r.rating_count})</span>
      </div>
    </div>
  )
}

function ChefRow({ chef: c, rank }: { chef: LeaderboardChef; rank: number }) {
  return (
    <Link to={`/user/${c.id}`} className={styles.row}>
      <RankBadge rank={rank} />
      <div className={styles.chefAvatar}>
        {avatarEmoji(c.avatar_id)}
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
        <StarIcon size={14} className={styles.rowStar} />
        <span className={styles.rowScore}>{c.avg_rating.toFixed(1)}</span>
        <span className={styles.rowCount}>avg</span>
      </div>
    </Link>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyText}>{text}</p>
      <Link to="/explore" className={styles.emptyBtn}>Go to Explore</Link>
    </div>
  )
}
