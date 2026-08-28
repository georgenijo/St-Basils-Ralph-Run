'use server'

import { revalidatePath, revalidateTag } from 'next/cache'

import { PUBLIC_SITE_SETTINGS_CACHE_TAG } from '@/lib/cache-tags'
import { logger } from '@/lib/logger'
import { withLogging } from '@/lib/logger.server'
import { createClient } from '@/lib/supabase/server'
import { themeSettingsSchema, type ThemeSettings } from '@/lib/validators/settings'

type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

const DEFAULT_FONTS: ThemeSettings['fonts'] = {
  heading: { family: 'Raleway', weights: [300, 400, 600, 700] },
  body: { family: 'Roboto', weights: [400, 500, 700] },
  nav: { family: 'Libre Baskerville', weights: [400, 700] },
}

const DEFAULT_SECTION_ORDER = [
  'hero',
  'service-times',
  'announcements',
  'events',
  'about',
  'contact',
]

const log = logger.child({ scope: 'settings' })

async function getThemeSettingsImpl(): Promise<ThemeSettings> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('site_settings')
    .select('fonts, section_order')
    .limit(1)
    .single()

  if (!data) {
    return { fonts: DEFAULT_FONTS, section_order: DEFAULT_SECTION_ORDER }
  }

  return {
    fonts: (data.fonts as ThemeSettings['fonts']) ?? DEFAULT_FONTS,
    section_order: (data.section_order as string[]) ?? DEFAULT_SECTION_ORDER,
  }
}

async function updateThemeSettingsImpl(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Parse JSON fields from FormData
  let rawFonts: unknown
  let rawSectionOrder: unknown

  try {
    rawFonts = JSON.parse(formData.get('fonts') as string)
    rawSectionOrder = JSON.parse(formData.get('section_order') as string)
  } catch (error) {
    log.warn('theme_settings.invalid_json', { error })
    return { success: false, message: 'Invalid JSON in form data' }
  }

  // 2. Validate with Zod
  const parsed = themeSettingsSchema.safeParse({
    fonts: rawFonts,
    section_order: rawSectionOrder,
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  // 3. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, message: 'Forbidden: admin access required' }
  }

  // 4. Upsert the singleton row
  const { data: existing } = await supabase.from('site_settings').select('id').limit(1).single()

  if (existing) {
    const { error } = await supabase
      .from('site_settings')
      .update({
        fonts: parsed.data.fonts,
        section_order: parsed.data.section_order,
        updated_by: user.id,
      })
      .eq('id', existing.id)

    if (error) {
      log.error('theme_settings.update_failed', { error })
      return { success: false, message: 'Failed to update settings' }
    }
  } else {
    const { error } = await supabase.from('site_settings').insert({
      fonts: parsed.data.fonts,
      section_order: parsed.data.section_order,
      updated_by: user.id,
    })

    if (error) {
      log.error('theme_settings.insert_failed', { error })
      return { success: false, message: 'Failed to save settings' }
    }
  }

  // 5. Revalidate all pages so they pick up new fonts
  revalidateTag(PUBLIC_SITE_SETTINGS_CACHE_TAG)
  revalidatePath('/', 'layout')
  return { success: true, message: 'Theme settings saved successfully' }
}

export const getThemeSettings = withLogging('getThemeSettings', getThemeSettingsImpl)
export const updateThemeSettings = withLogging('updateThemeSettings', updateThemeSettingsImpl)
