import {
  DEMO_RECIPES, DEMO_COLLECTIONS, DEMO_USER_ID, DEMO_DISPLAY_NAME, demoPhotoKey,
} from '../../shared/demoContent'
import type { Collection, Recipe } from '../types'
import { getResolvedDemoPhotos } from './demoPhotos'

// The public, read-only demo renders the demo account's seed content directly
// (shared/demoContent.ts) — the same recipes the account is reset to. Nothing
// is fetched, so no visitor can change what the demo shows.

const SEED_TIME = 1_794_000_000 // fixed so list order is stable

const baseRecipes: Recipe[] = DEMO_RECIPES.map((r, idx) => ({
  id: r.id,
  user_id: DEMO_USER_ID,
  title: r.title,
  description: r.description,
  servings: r.servings,
  prep_time: r.prep_time,
  cook_time: r.cook_time,
  ingredients: r.ingredients,
  steps: r.steps,
  tags: r.tags,
  source_guess: r.source_guess ?? null,
  source_url: r.source_url ?? null,
  hero_image_key: r.photo ? demoPhotoKey(r.photo) : null,
  screenshot_keys: [],
  is_favourite: !!r.favourite,
  is_deleted: false,
  needs_attention: false,
  share_token: null,
  calories_per_serving: r.calories_per_serving,
  cost_per_serving: r.cost_per_serving,
  cost_currency: 'USD',
  created_at: SEED_TIME - idx * 3600,
  updated_at: SEED_TIME - idx * 3600,
  author_name: DEMO_DISPLAY_NAME,
}))

export const demoCollections: Collection[] = DEMO_COLLECTIONS.map((c, idx) => ({
  id: c.id,
  name: c.name,
  created_at: SEED_TIME - 86400 + idx,
  recipe_ids: c.recipe_ids,
}))

/** Demo recipes, with any hand-picked Unsplash photo applied (see lib/demoPhotos). */
export function getDemoRecipes(): Recipe[] {
  const picks = getResolvedDemoPhotos()
  return baseRecipes.map(r => picks[r.id] ? { ...r, hero_image_key: picks[r.id].url } : r)
}

export function getDemoRecipe(id: string | undefined): Recipe | null {
  return getDemoRecipes().find(r => r.id === id) ?? null
}

export const DEMO_OWNER_NAME = DEMO_DISPLAY_NAME
