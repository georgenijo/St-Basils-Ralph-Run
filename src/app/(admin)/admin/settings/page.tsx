import type { Metadata } from 'next'

import { getThemeSettings } from '@/actions/settings'
import { ThemeCustomizer } from './ThemeCustomizer'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  const settings = await getThemeSettings()

  return (
    <main className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Settings</h1>
          <p className="admin-page-subtitle">
            Customize fonts and homepage section ordering for the public site.
          </p>
        </div>
        <button
          type="submit"
          form="theme-settings-form"
          className="admin-button admin-button-primary"
        >
          Save changes
        </button>
      </div>

      <ThemeCustomizer currentFonts={settings.fonts} currentSectionOrder={settings.section_order} />
    </main>
  )
}
