import { Link } from 'react-router-dom'
import type { Recipe } from '../types'
import { formatTime, imageUrl } from '../lib/utils'
import { ClockIcon, PersonIcon, HeartIcon, DishIcon } from './icons'
import { Avatar } from './Avatar'
import styles from './RecipeCard.module.css'

interface Props {
  recipe: Recipe
  onToggleFavourite?: (id: string, value: boolean) => void
  currentUserId?: string
}

export default function RecipeCard({ recipe, onToggleFavourite, currentUserId }: Props) {
  const isExternal = !!currentUserId && recipe.user_id !== currentUserId
  const heroSrc = imageUrl(recipe.hero_image_key)

  return (
    <article className={styles.card}>
      <Link to={`/recipe/${recipe.id}`} className={styles.imageLink} tabIndex={-1}>
        {heroSrc ? (
          <img src={heroSrc} alt={recipe.title} className={styles.image} loading="lazy" />
        ) : (
          <div className={styles.placeholder}>
            <DishIcon size={44} className={styles.placeholderIcon} />
          </div>
        )}
      </Link>

      {onToggleFavourite && (
        <button
          className={`${styles.heart} ${recipe.is_favourite ? styles.heartActive : ''}`}
          onClick={e => { e.preventDefault(); onToggleFavourite(recipe.id, !recipe.is_favourite) }}
          aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
          aria-pressed={recipe.is_favourite}
        >
          <HeartIcon filled={recipe.is_favourite} size={20} />
        </button>
      )}

      <div className={styles.body}>
        {recipe.tags.length > 0 && (
          <div className={styles.tags}>
            {recipe.tags.slice(0, 2).map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}

        <Link to={`/recipe/${recipe.id}`} className={styles.titleLink}>
          <h2 className={styles.title}>{recipe.title}</h2>
        </Link>

        {recipe.description && (
          <p className={styles.description}>{recipe.description}</p>
        )}

        <div className={styles.meta}>
          {recipe.cook_time && (
            <span className={styles.metaItem}>
              <ClockIcon size={13} className={styles.metaIcon} />
              {formatTime(recipe.cook_time)}
            </span>
          )}
          {recipe.servings && (
            <span className={styles.metaItem}>
              <PersonIcon size={13} className={styles.metaIcon} />
              {recipe.servings}
            </span>
          )}
        </div>

        {isExternal && (
          <Link to={`/user/${recipe.user_id}`} className={styles.author} onClick={e => e.stopPropagation()}>
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
