import { unstable_cache } from 'next/cache'

import { PUBLIC_SITE_SETTINGS_CACHE_TAG } from '@/lib/cache-tags'
import { getPublicSupabaseClient } from '@/lib/supabase/public'
import type { FontChoice } from '@/lib/validators/settings'

type FontsConfig = {
  heading: FontChoice
  body: FontChoice
  nav: FontChoice
}

const DEFAULTS: FontsConfig = {
  heading: { family: 'Raleway', weights: [300, 400, 600, 700] },
  body: { family: 'Roboto', weights: [400, 500, 700] },
  nav: { family: 'Libre Baskerville', weights: [400, 700] },
}

function buildGoogleFontsUrl(fonts: FontsConfig): string {
  const unique = new Map<string, number[]>()
  for (const choice of Object.values(fonts)) {
    const existing = unique.get(choice.family)
    if (existing) {
      const merged = [...new Set([...existing, ...choice.weights])].sort((a, b) => a - b)
      unique.set(choice.family, merged)
    } else {
      unique.set(choice.family, [...choice.weights])
    }
  }

  const families = Array.from(unique.entries())
    .map(([family, weights]) => `family=${encodeURIComponent(family)}:wght@${weights.join(';')}`)
    .join('&')

  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

function isCustomFont(fonts: FontsConfig): boolean {
  return (
    fonts.heading.family !== DEFAULTS.heading.family ||
    fonts.body.family !== DEFAULTS.body.family ||
    fonts.nav.family !== DEFAULTS.nav.family
  )
}

const getFontSettings = unstable_cache(
  async (): Promise<FontsConfig | null> => {
    const supabase = getPublicSupabaseClient()
    if (!supabase) return null
    const { data } = await supabase.from('site_settings').select('fonts').limit(1).single()

    return (data?.fonts as FontsConfig | undefined) ?? null
  },
  ['public-font-settings'],
  { revalidate: 300, tags: [PUBLIC_SITE_SETTINGS_CACHE_TAG] }
)

export async function DynamicFonts() {
  const fonts = await getFontSettings()

  if (!fonts || !isCustomFont(fonts)) return null

  const fontsUrl = buildGoogleFontsUrl(fonts)

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontsUrl} />
      <style
        dangerouslySetInnerHTML={{
          __html: [
            ':root {',
            `  --font-heading: '${fonts.heading.family}', 'Helvetica Neue', sans-serif;`,
            `  --font-body: '${fonts.body.family}', 'Helvetica Neue', sans-serif;`,
            `  --font-nav: '${fonts.nav.family}', 'Georgia', serif;`,
            '}',
          ].join('\n'),
        }}
      />
    </>
  )
}
