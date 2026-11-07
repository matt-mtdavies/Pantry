import { Link, useParams } from 'react-router-dom'
import PublicRecipeView from '../../components/PublicRecipeView'
import TourPill from '../../components/TourPill'
import NotFoundPage from '../NotFoundPage'
import { getDemoRecipe, DEMO_OWNER_NAME } from '../../lib/demo'
import { useRecipeMeta } from '../../hooks/useDocumentMeta'
import styles from '../../components/PublicRecipeView.module.css'

export default function DemoRecipePage() {
  const { id } = useParams<{ id: string }>()
  const recipe = getDemoRecipe(id)
  useRecipeMeta(recipe, recipe ? `/demo/recipe/${recipe.id}` : null)
  if (!recipe) return <NotFoundPage />

  return (
    <>
    <PublicRecipeView
      recipe={recipe}
      bannerText={<Link to="/demo" className={styles.bannerLink}>← {DEMO_OWNER_NAME}'s demo pantry</Link>}
      bannerAction={<Link to="/?signup=1#get-started" className={styles.saveBtn}>Create free account</Link>}
      actions={servings => (
        <Link
          to={`/demo/recipe/${recipe.id}/cook${servings && servings !== recipe.servings ? `?serves=${servings}` : ''}`}
          className={styles.cookBtn}
        >Cook this recipe</Link>
      )}
      footer={<>
        <p className={styles.footerText}>This is a read-only demo of <strong>Pantry</strong>.</p>
        <Link to="/?signup=1#get-started" className={styles.footerLink}>Start your own recipe box →</Link>
      </>}
    />
    <TourPill />
    </>
  )
}
