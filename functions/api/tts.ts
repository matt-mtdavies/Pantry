import type { Env } from '../env'
import { logAiUsage } from '../lib/logAiUsage'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const userId = ctx.data.userId as string | undefined
  if (!userId) return json({ error: 'Unauthorized' }, 401)

  let text: string
  let hd = false
  try {
    const body = await ctx.request.json() as { text?: string; hd?: boolean }
    text = (body.text ?? '').trim()
    hd = body.hd === true
  } catch {
    return json({ error: 'Invalid body' }, 400)
  }
  if (!text) return json({ error: 'text is required' }, 400)
  if (text.length > 4096) return json({ error: 'text too long' }, 400)

  if (!ctx.env.OPENAI_API_KEY) return json({ error: 'not_configured' }, 503)

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ctx.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: hd ? 'tts-1-hd' : 'tts-1',
      voice: 'nova',
      input: text,
      response_format: 'mp3',
      speed: hd ? 1.05 : 0.92,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return json({ error: 'upstream_failed', detail }, 502)
  }

  ctx.waitUntil(logAiUsage(ctx.env.DB, 'tts'))

  return new Response(res.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
