import { Link } from 'react-router-dom'
import type { Recipe } from '../types'
import { formatTime, imageUrl } from '../lib/utils'
import { useCurrency } from '../hooks/useCurrency'
import { ClockIcon, PersonIcon, HeartIcon, DishIcon, CollectionIcon } from './icons'
import { Avatar } from './Avatar'
import styles from './RecipeCard.module.css'

/** The one recipe card used on Home, Explore and public profiles.
 *  Only id/title/hero are required so partial API shapes (e.g. profile lists) fit. */
export type CardRecipe =
  Pick<Recipe, 'id' | 'title' | 'hero_image_key'> &
  Partial<Pick<Recipe,
    'user_id' | 'description' | 'tags' | 'prep_time' | 'cook_time' | 'servings' |
    'calories_per_serving' | 'cost_per_serving' | 'cost_currency' | 'is_favourite' |
    'author_name' | 'author_avatar' | 'author_avatar_key'
  >> & {
    avg_rating?: number | null
    rating_count?: number | null
  }

interface Props {
  recipe: CardRecipe
  onToggleFavourite?: (id: string, value: boolean) => void
  /** Show the author row (defaults to "recipe isn't mine" when currentUserId is set). */
  showAuthor?: boolean
  currentUserId?: string
  inCollection?: boolean
  onToggleCollection?: (id: string, add: boolean) => void
  collectionNames?: string[]
  /** Denser layout for 2-up mobile grids: no description or author. */
  compact?: boolean
}

export default function RecipeCard({
  recipe, onToggleFavourite, showAuthor, currentUserId, inCollection, onToggleCollection, collectionNames, compact,
}: Props) {
  const { formatCost } = useCurrency()
  const heroSrc = imageUrl(recipe.hero_image_key)
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)
  const ratingCount = recipe.rating_count ?? 0
  const tags = recipe.tags ?? []
  const authorVisible = !compact && !!recipe.user_id &&
    (showAuthor ?? (!!currentUserId && recipe.user_id !== currentUserId))

  return (
    <article className={`${styles.card} ${compact ? styles.compact : ''}`}>
      {/* Whole-card link; interactive children sit above it via z-index. */}
      <Link to={`/recipe/${recipe.id}`} className={styles.overlay} aria-label={recipe.title} />

      <div className={styles.imageWrap}>
        {heroSrc ? (
          <img src={heroSrc} alt="" className={styles.image} loading="lazy" />
        ) : (
          <div className={styles.placeholder}>
            <DishIcon size={compact ? 32 : 44} className={styles.placeholderIcon} />
          </div>
        )}
        {ratingCount > 0 && recipe.avg_rating != null && (
          <div className={styles.ratingBadge} aria-label={`Rated ${recipe.avg_rating.toFixed(1)} from ${ratingCount} rating${ratingCount === 1 ? '' : 's'}`}>
            <span className={styles.ratingStar} aria-hidden="true">★</span>
            <span aria-hidden="true">{recipe.avg_rating.toFixed(1)}</span>
            <span className={styles.ratingCount} aria-hidden="true">({ratingCount})</span>
          </div>
        )}
      </div>

      {onToggleCollection && (
        <button
          className={`${styles.colToggle} ${inCollection ? styles.colToggleIn : ''}`}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleCollection(recipe.id, !inCollection) }}
          aria-label={inCollection ? 'Remove from collection' : 'Add to collection'}
          aria-pressed={inCollection}
        >
          {inCollection ? '✓' : '+'}
        </button>
      )}

      {onToggleFavourite && (
        <button
          className={`${styles.heart} ${recipe.is_favourite ? styles.heartActive : ''}`}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavourite(recipe.id, !recipe.is_favourite) }}
          aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
          aria-pressed={!!recipe.is_favourite}
        >
          <HeartIcon filled={!!recipe.is_favourite} size={20} />
        </button>
      )}

      <div className={styles.body}>
        {tags.length > 0 && (
          <div className={styles.tags}>
            {tags.slice(0, 2).map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}

        <h2 className={styles.title}>{recipe.title}</h2>

        {!compact && recipe.description && (
          <p className={styles.description}>{recipe.description}</p>
        )}

        <div className={styles.meta}>
          {totalTime > 0 && (
            <span className={styles.metaItem}>
              <ClockIcon size={13} className={styles.metaIcon} />
              {formatTime(totalTime)}
            </span>
          )}
          {!compact && recipe.servings && (
            <span className={styles.metaItem}>
              <PersonIcon size={13} className={styles.metaIcon} />
              {recipe.servings}
            </span>
          )}
          {!compact && recipe.calories_per_serving && (
            <span className={styles.metaItem}>~{recipe.calories_per_serving} kcal</span>
          )}
          {!compact && recipe.cost_per_serving != null && (
            <span className={styles.metaItem}>~{formatCost(recipe.cost_per_serving, recipe.cost_currency)}</span>
          )}
        </div>

        {collectionNames && collectionNames.length > 0 && (
          <div className={styles.designations}>
            {collectionNames.map(name => (
              <span key={name} className={styles.designationCol}>
                <CollectionIcon size={10} /> In: {name}
              </span>
            ))}
          </div>
        )}

        {authorVisible && (
          <Link to={`/user/${recipe.user_id}`} className={styles.author}>
            <Avatar
              imageKey={recipe.author_avatar_key ?? null}
              avatarId={recipe.author_avatar ?? 'default'}
              size={18}
              className={styles.authorAvatar}
            />
            <span className={styles.authorName}>{recipe.author_name ?? 'Anonymous'}</span>
          </Link>
        )}
      </div>
    </article>
  )
}
