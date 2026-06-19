import type { Recipe, ExtractedRecipe, LeaderboardRecipe, LeaderboardChef, FeedData, PublicProfile, Collection, Chef } from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' })) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// Recipes

export async function listRecipes(): Promise<Recipe[]> {
  return request<Recipe[]>('/api/recipes')
}

export async function getRecipe(id: string): Promise<Recipe> {
  return request<Recipe>(`/api/recipes/${id}`)
}

export async function createRecipe(data: Partial<Recipe>): Promise<Recipe> {
  return request<Recipe>('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateRecipe(id: string, data: Partial<Recipe>): Promise<Recipe> {
  return request<Recipe>(`/api/recipes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteRecipe(id: string): Promise<void> {
  await request<void>(`/api/recipes/${id}`, { method: 'DELETE' })
}

export async function deleteHeroImage(id: string): Promise<void> {
  await request<void>(`/api/recipes/${id}/hero-image`, { method: 'DELETE' })
}

export async function toggleFavourite(id: string, value: boolean): Promise<{ is_favourite: boolean }> {
  return request<{ is_favourite: boolean }>(`/api/recipes/${id}/favourite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
}

export async function getShareLink(id: string): Promise<{ token: string; url: string }> {
  return request<{ token: string; url: string }>(`/api/recipes/${id}/share`, { method: 'POST' })
}

// Extract from screenshots

export async function extractFromScreenshots(files: File[]): Promise<ExtractedRecipe> {
  const form = new FormData()
  files.forEach(f => form.append('screenshots', f))
  return request<ExtractedRecipe>('/api/extract', { method: 'POST', body: form })
}

// Extract from URL

export async function extractFromUrl(url: string): Promise<ExtractedRecipe> {
  return request<ExtractedRecipe>('/api/extract-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
}

// Image search (Unsplash proxy — returns empty array if UNSPLASH_ACCESS_KEY not set)

export async function searchImages(query: string): Promise<{ url: string; thumb: string }[]> {
  return request<{ url: string; thumb: string }[]>(
    `/api/image-search?q=${encodeURIComponent(query)}`
  )
}

// Fetch an external image URL and store it in R2 as the recipe hero

export async function fetchRecipeImage(recipeId: string, imageUrl: string): Promise<{ key: string }> {
  return request<{ key: string }>('/api/fetch-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: imageUrl, recipeId }),
  })
}

// Upload / remove profile avatar

export async function uploadAvatar(file: File): Promise<{ key: string }> {
  const form = new FormData()
  form.append('file', file)
  return request<{ key: string }>('/api/avatar', { method: 'POST', body: form })
}

export async function removeAvatar(): Promise<void> {
  await request('/api/avatar', { method: 'DELETE' })
}

// Upload image

export async function uploadImage(file: File, recipeId: string, role: 'hero' | 'screenshot'): Promise<{ key: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('recipeId', recipeId)
  form.append('role', role)
  return request<{ key: string }>('/api/upload', { method: 'POST', body: form })
}

// Auth

export async function login(email: string, password: string): Promise<{ sessionId: string }> {
  return request<{ sessionId: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

export async function register(
  email: string,
  password: string,
  displayName?: string,
): Promise<{ sessionId: string }> {
  return request<{ sessionId: string }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: displayName }),
  })
}

export async function forgotPassword(email: string): Promise<void> {
  await request<void>('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, password: string): Promise<{ sessionId: string }> {
  return request<{ sessionId: string }>('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
}

// Search public recipes

export async function searchPublicRecipes(qs: string): Promise<{ results: Recipe[]; has_more: boolean; page: number }> {
  return request<{ results: Recipe[]; has_more: boolean; page: number }>(`/api/search?${qs}`)
}

// Email verification

export async function resendVerificationEmail(): Promise<void> {
  await request('/api/resend-verification', { method: 'POST' })
}

// Leaderboard

export async function getLeaderboard(): Promise<{ topRecipes: LeaderboardRecipe[]; topChefs: LeaderboardChef[] }> {
  return request('/api/leaderboard')
}

// Public user profile

export async function getPublicProfile(userId: string): Promise<PublicProfile> {
  return request<PublicProfile>(`/api/users/${userId}`)
}

// Chef discovery

export async function getChefs(): Promise<Chef[]> {
  return request<Chef[]>('/api/chefs')
}

export async function followChef(userId: string): Promise<{ following: boolean; follower_count: number }> {
  return request(`/api/follows/${userId}`, { method: 'POST' })
}

export async function unfollowChef(userId: string): Promise<{ following: boolean; follower_count: number }> {
  return request(`/api/follows/${userId}`, { method: 'DELETE' })
}

// Community feed

export async function getFeed(): Promise<FeedData> {
  return request<FeedData>('/api/feed')
}

// Backfill missing nutrition/cost estimates

export async function backfillNutrition(): Promise<{ updated: number; has_more: boolean; message: string }> {
  return request('/api/admin/backfill-nutrition', { method: 'POST' })
}

// Backfill missing recipe hero images

export async function backfillImages(): Promise<{ updated: number; has_more: boolean; message: string }> {
  return request('/api/admin/backfill-images', { method: 'POST' })
}

// Rate a recipe

export async function rateRecipe(
  recipeId: string,
  rating: number,
): Promise<{ avg_rating: number; rating_count: number; my_rating: number }> {
  return request(`/api/recipes/${recipeId}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating }),
  })
}

// Public share

export async function getSharedRecipe(token: string): Promise<Recipe> {
  const res = await fetch(`/api/share/${token}`)
  if (!res.ok) throw new Error('Not found')
  return res.json() as Promise<Recipe>
}

export async function saveSharedRecipe(token: string): Promise<Recipe> {
  return request<Recipe>(`/api/share/${token}/save`, { method: 'POST' })
}

export interface GeneratedRecipe {
  title: string
  description: string
  servings: number
  prep_time: number
  cook_time: number
  ingredients: Array<{ amount: string; unit: string; name: string }>
  steps: string[]
  tags: string[]
  shopping_list: string[]
  calories_per_serving: number | null
  cost_per_serving: number | null
  cost_currency: string
}

export async function getDinnerSuggestions(
  ingredients: string[],
  mode?: 'match' | 'create',
): Promise<{ recipes: GeneratedRecipe[] }> {
  return request<{ recipes: GeneratedRecipe[] }>('/api/dinner-suggestion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients, mode }),
  })
}

// Collections

export async function listCollections(): Promise<Collection[]> {
  return request<Collection[]>('/api/collections')
}

export async function createCollection(name: string): Promise<Collection> {
  return request<Collection>('/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function deleteCollection(id: string): Promise<void> {
  await request<void>(`/api/collections/${id}`, { method: 'DELETE' })
}

export async function toggleRecipeInCollection(collectionId: string, recipeId: string): Promise<{ action: 'added' | 'removed' }> {
  return request<{ action: 'added' | 'removed' }>(`/api/collections/${collectionId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe_id: recipeId }),
  })
}

// Invites

export interface InviterInfo {
  display_name: string | null
  avatar_id: string | null
  avatar_image_key: string | null
}

export async function createInvite(): Promise<{ token: string; url: string }> {
  return request<{ token: string; url: string }>('/api/invites', { method: 'POST' })
}

export async function getInvite(token: string): Promise<InviterInfo> {
  const res = await fetch(`/api/invites/${token}`)
  if (!res.ok) throw new Error('Not found')
  return res.json() as Promise<InviterInfo>
}

// Data export

export function downloadExport(): void {
  window.location.href = '/api/me/export'
}
