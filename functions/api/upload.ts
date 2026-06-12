import type { Env } from '../env'

function generateKey(recipeId: string, role: string, filename: string): string {
  const ext = filename.split('.').pop() ?? 'jpg'
  const rand = Math.random().toString(36).slice(2, 8)
  return `${role}/${recipeId}/${rand}.${ext}`
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  const formData = await ctx.request.formData()
  const file = formData.get('file') as File | null
  const recipeId = formData.get('recipeId') as string | null
  const role = (formData.get('role') as string | null) ?? 'screenshot'

  if (!file || !recipeId) {
    return json({ error: 'file and recipeId are required' }, 400)
  }

  // Verify the recipe belongs to this user
  const recipe = await ctx.env.DB.prepare(
    'SELECT id, screenshot_keys, hero_image_key FROM recipes WHERE id = ? AND user_id = ?'
  ).bind(recipeId, userId).first<{
    id: string
    screenshot_keys: string
    hero_image_key: string | null
  }>()

  if (!recipe) {
    return json({ error: 'Recipe not found' }, 404)
  }

  const key = generateKey(recipeId, role, file.name || 'image.jpg')
  const buffer = await file.arrayBuffer()

  // R2 may not be configured — graceful fallback
  if (!ctx.env.R2) {
    return json({ error: 'Image storage not configured' }, 503)
  }

  await ctx.env.R2.put(key, buffer, {
    httpMetadata: { contentType: file.type || 'image/jpeg' },
    customMetadata: { recipeId, userId, role },
  })

  // Update recipe with new key
  const now = Math.floor(Date.now() / 1000)
  if (role === 'hero') {
    await ctx.env.DB.prepare(
      'UPDATE recipes SET hero_image_key = ?, updated_at = ? WHERE id = ?'
    ).bind(key, now, recipeId).run()
  } else {
    const existing = JSON.parse(recipe.screenshot_keys || '[]') as string[]
    existing.push(key)
    await ctx.env.DB.prepare(
      'UPDATE recipes SET screenshot_keys = ?, updated_at = ? WHERE id = ?'
    ).bind(JSON.stringify(existing), now, recipeId).run()
  }

  return json({ key })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
