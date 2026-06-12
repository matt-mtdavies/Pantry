import { Link } from 'react-router-dom'
import type { Recipe } from '../types'
import { formatTime, imageUrl } from '../lib/utils'
import styles from './RecipeCard.module.css'

interface Props {
  recipe: Recipe
  onToggleFavourite?: (id: string, value: boolean) => void
}

export default function RecipeCard({ recipe, onToggleFavourite }: Props) {
  const heroSrc = imageUrl(recipe.hero_image_key)

  return (
    <article className={styles.card}>
      <Link to={`/recipe/${recipe.id}`} className={styles.imageLink} tabIndex={-1}>
        {heroSrc ? (
          <img src={heroSrc} alt={recipe.title} className={styles.image} loading="lazy" />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>🍽</span>
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
          {recipe.is_favourite ? '♥' : '♡'}
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
              <span className={styles.metaIcon}>⏱</span>
              {formatTime(recipe.cook_time)}
            </span>
          )}
          {recipe.servings && (
            <span className={styles.metaItem}>
              <span className={styles.metaIcon}>👤</span>
              {recipe.servings}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
