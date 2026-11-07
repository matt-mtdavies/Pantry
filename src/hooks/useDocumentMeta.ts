import { useEffect } from 'react'
import type { Recipe } from '../types'

// Per-page <title>, meta description, canonical link and optional JSON-LD.
// Google renders the SPA, so client-set metadata and structured data are
// indexed. Everything is restored to the index.html defaults on unmount.

const SITE = 'https://myopenpantry.com'

interface Meta {
  title: string
  description?: string
  path?: string | null
  jsonLd?: Record<string, unknown> | null
}

function setMeta(selector: string, attr: string, value: string | null) {
  const el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector)
  if (!el) return null
  const prev = el.getAttribute(attr)
  if (value != null) el.setAttribute(attr, value)
  return () => { if (prev != null) el.setAttribute(attr, prev) }
}

export function useDocumentMeta(meta: Meta | null) {
  const key = meta ? JSON.stringify(meta) : ''
  useEffect(() => {
    if (!meta) return
    const restore: (() => void)[] = []
    const prevTitle = document.title
    document.title = meta.title
    restore.push(() => { document.title = prevTitle })

    for (const [sel, attr, val] of [
      ['meta[name="description"]', 'content', meta.description],
      ['meta[property="og:title"]', 'content', meta.title],
      ['meta[property="og:description"]', 'content', meta.description],
      ['meta[name="twitter:title"]', 'content', meta.title],
      ['meta[name="twitter:description"]', 'content', meta.description],
    ] as const) {
      const r = val != null ? setMeta(sel, attr, val) : null
      if (r) restore.push(r)
    }

    if (meta.path) {
      const link = document.createElement('link')
      link.rel = 'canonical'
      link.href = SITE + meta.path
      document.head.appendChild(link)
      restore.push(() => link.remove())
    }

    if (meta.jsonLd) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.text = JSON.stringify(meta.jsonLd)
      document.head.appendChild(script)
      restore.push(() => script.remove())
    }

    return () => { restore.forEach(fn => fn()) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
}

function isoMinutes(m: number | null | undefined): string | undefined {
  return m != null && m > 0 ? `PT${Math.round(m)}M` : undefined
}

/** Title, description and schema.org Recipe structured data for a public recipe page. */
export function useRecipeMeta(recipe: Recipe | null, path: string | null) {
  useDocumentMeta(recipe ? {
    title: `${recipe.title} · Pantry`,
    description: recipe.description || `${recipe.title} — a recipe on Pantry.`,
    path,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: recipe.title,
      description: recipe.description || undefined,
      image: recipe.hero_image_key
        ? (/^https?:\/\//.test(recipe.hero_image_key) ? recipe.hero_image_key : `${SITE}/api/images/${encodeURIComponent(recipe.hero_image_key)}`)
        : undefined,
      author: recipe.author_name ? { '@type': 'Person', name: recipe.author_name } : undefined,
      prepTime: isoMinutes(recipe.prep_time),
      cookTime: isoMinutes(recipe.cook_time),
      totalTime: isoMinutes((recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)),
      recipeYield: recipe.servings ? String(recipe.servings) : undefined,
      keywords: recipe.tags.length ? recipe.tags.join(', ') : undefined,
      recipeIngredient: recipe.ingredients.map(i => [i.amount, i.unit, i.name].filter(Boolean).join(' ')),
      recipeInstructions: recipe.steps.map(text => ({ '@type': 'HowToStep', text })),
      nutrition: recipe.calories_per_serving
        ? { '@type': 'NutritionInformation', calories: `${recipe.calories_per_serving} calories` }
        : undefined,
    },
  } : null)
}
