import type { Env } from '../env'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string

  // Lazily add the column if the migration hasn't been applied yet
  try {
    await ctx.env.DB.prepare('ALTER TABLE users ADD COLUMN avatar_image_key TEXT').run()
  } catch { /* column already exists */ }

  if (!ctx.env.R2) return json({ error: 'Image storage not configured' }, 503)

  const formData = await ctx.request.formData()
  const file = formData.get('file') as File | null

  if (!file) return json({ error: 'No file provided' }, 400)
  if (!file.type.startsWith('image/')) return json({ error: 'File must be an image' }, 400)
  if (file.size > 10 * 1024 * 1024) return json({ error: 'File must be under 10 MB' }, 400)

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const key = `avatars/${userId}/${Date.now()}.${ext}`

  // Use arrayBuffer (same as upload.ts — stream() can be unreliable)
  const buffer = await file.arrayBuffer()
  await ctx.env.R2.put(key, buffer, {
    httpMetadata: { contentType: file.type || 'image/jpeg' },
    customMetadata: { userId },
  })

  await ctx.env.DB.prepare(
    'UPDATE users SET avatar_image_key = ? WHERE id = ?'
  ).bind(key, userId).run()

  return json({ key })
}

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string
  await ctx.env.DB.prepare(
    'UPDATE users SET avatar_image_key = NULL WHERE id = ?'
  ).bind(userId).run()
  return json({ success: true })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
