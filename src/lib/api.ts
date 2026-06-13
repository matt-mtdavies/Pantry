import type { Recipe, ExtractedRecipe } from '../types'

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

export async function toggleFavourite(id: string, value: boolean): Promise<Recipe> {
  return updateRecipe(id, { is_favourite: value } as Partial<Recipe>)
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

// Upload image

export async function uploadImage(file: File, recipeId: string, role: 'hero' | 'screenshot'): Promise<{ key: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('recipeId', recipeId)
  form.append('role', role)
  return request<{ key: string }>('/api/upload', { method: 'POST', body: form })
}

// Auth

export async function sendMagicLink(email: string): Promise<void> {
  await request<void>('/api/auth/send-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
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
