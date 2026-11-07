import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import SaltGrinder from '../components/SaltGrinder'
import { DishIcon } from '../components/icons'
import PublicRecipeView from '../components/PublicRecipeView'
import { getSharedRecipe } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useRecipeMeta } from '../hooks/useDocumentMeta'
import { useDemoPhotos } from '../lib/demoPhotos'
import { DEMO_USER_ID } from '../../shared/demoIdentity'
import type { Recipe } from '../types'
import styles from '../components/PublicRecipeView.module.css'

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) return
    getSharedRecipe(token)
      .then(setRecipe)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  useRecipeMeta(recipe, token ? `/share/${token}` : null)
  const { picks: demoPhotos } = useDemoPhotos(recipe?.user_id === DEMO_USER_ID)
  const demoCredit = recipe && demoPhotos[recipe.id]?.url === recipe.hero_image_key ? demoPhotos[recipe.id] : null

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}><SaltGrinder /></div>
      </div>
    )
  }

  if (notFound || !recipe) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <DishIcon size={56} className={styles.notFoundIcon} />
          <h1 className={styles.notFoundTitle}>Recipe not found</h1>
          <p className={styles.notFoundText}>
            This link may have expired or the recipe may have been removed.
          </p>
          <Link to="/" className={styles.homeLink}>Go to Pantry</Link>
        </div>
      </div>
    )
  }

  return (
    <PublicRecipeView
      recipe={recipe}
      photoCredit={demoCredit}
      bannerText={recipe.author_name ? `${recipe.author_name} shared this recipe with you` : 'A recipe shared with you'}
      bannerAction={user ? (
        <button className={styles.saveBtn} onClick={() => navigate(`/recipe/${recipe.id}`)}>
          View in my Pantry
        </button>
      ) : (
        <Link to={`/auth?next=/recipe/${recipe.id}`} className={styles.saveBtn}>
          View in my Pantry
        </Link>
      )}
      footer={<>
        <p className={styles.footerText}>
          Shared via <strong>Pantry</strong> — your recipe home.
        </p>
        <Link to="/" className={styles.footerLink}>
          Create your own Pantry →
        </Link>
      </>}
    />
  )
}
