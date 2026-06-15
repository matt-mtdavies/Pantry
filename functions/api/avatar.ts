import type { Env } from '../env'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string

  if (!ctx.env.R2) {
    return json({ error: 'R2 not configured' }, 503)
  }

  const formData = await ctx.request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return json({ error: 'No file provided' }, 400)
  }

  if (!file.type.startsWith('image/')) {
    return json({ error: 'File must be an image' }, 400)
  }

  if (file.size > 5 * 1024 * 1024) {
    return json({ error: 'File must be under 5MB' }, 400)
  }

  const nameParts = file.name.split('.')
  const ext = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'jpg'
  const key = `avatars/${userId}/${Date.now()}.${ext}`

  await ctx.env.R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
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
