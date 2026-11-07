// Demo account identity. Content lives in shared/demoContent.ts.
//
// The demo user is a normal account (password login through /api/auth/login)
// whose profile is private (is_public = 0), so it never appears in Explore,
// Leaderboard, Chefs, Community or public profiles. Everything the seeder
// deletes is scoped to DEMO_USER_ID / the demo recipe + collection IDs.
// See functions/api/admin/seed-demo.ts.

export {
  DEMO_USER_ID, DEMO_DISPLAY_NAME, DEMO_PHOTOS, demoPhotoKey, demoPhotoAsset, DEMO_SHARE_TOKEN,
  DEMO_RECIPES, DEMO_COLLECTIONS,
} from '../../shared/demoContent'
export type { DemoRecipe, DemoCollection } from '../../shared/demoContent'

export const DEMO_EMAIL = 'demo@myopenpantry.com'
/** Throwaway by design — the account holds no real data and is reset on reseed. */
export const DEMO_PASSWORD = 'TryPantry-Demo-2026'
