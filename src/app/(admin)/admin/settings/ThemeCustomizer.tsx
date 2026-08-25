'use client'

import { useActionState, useState, useCallback, useRef, useEffect } from 'react'

import { updateThemeSettings } from '@/actions/settings'
import type { FontChoice } from '@/lib/validators/settings'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────

type FontRole = 'heading' | 'body' | 'nav'

interface ThemeCustomizerProps {
  currentFonts: Record<FontRole, FontChoice>
  currentSectionOrder: string[]
}

// ─── Curated Google Fonts list ──────────────────────────────────────

const GOOGLE_FONTS: FontChoice[] = [
  { family: 'Raleway', weights: [300, 400, 600, 700] },
  { family: 'Roboto', weights: [400, 500, 700] },
  { family: 'Libre Baskerville', weights: [400, 700] },
  { family: 'Open Sans', weights: [400, 600, 700] },
  { family: 'Lato', weights: [300, 400, 700] },
  { family: 'Montserrat', weights: [400, 500, 600, 700] },
  { family: 'Poppins', weights: [400, 500, 600, 700] },
  { family: 'Merriweather', weights: [300, 400, 700] },
  { family: 'Playfair Display', weights: [400, 600, 700] },
  { family: 'Source Sans 3', weights: [400, 600, 700] },
  { family: 'Oswald', weights: [400, 500, 600, 700] },
  { family: 'Nunito', weights: [400, 600, 700] },
  { family: 'PT Serif', weights: [400, 700] },
  { family: 'Lora', weights: [400, 500, 600, 700] },
  { family: 'Inter', weights: [400, 500, 600, 700] },
  { family: 'Josefin Sans', weights: [300, 400, 600, 700] },
  { family: 'Crimson Text', weights: [400, 600, 700] },
  { family: 'Work Sans', weights: [400, 500, 600, 700] },
  { family: 'Cabin', weights: [400, 500, 600, 700] },
  { family: 'EB Garamond', weights: [400, 500, 600, 700] },
  { family: 'DM Sans', weights: [400, 500, 700] },
  { family: 'DM Serif Display', weights: [400] },
  { family: 'Bitter', weights: [400, 500, 700] },
  { family: 'Cormorant Garamond', weights: [400, 500, 600, 700] },
  { family: 'Noto Sans', weights: [400, 500, 700] },
  { family: 'Noto Serif', weights: [400, 700] },
  { family: 'Rubik', weights: [400, 500, 600, 700] },
  { family: 'Quicksand', weights: [400, 500, 600, 700] },
  { family: 'Fira Sans', weights: [400, 500, 600, 700] },
  { family: 'Barlow', weights: [400, 500, 600, 700] },
  { family: 'IBM Plex Sans', weights: [400, 500, 600, 700] },
  { family: 'IBM Plex Serif', weights: [400, 500, 700] },
  { family: 'Archivo', weights: [400, 500, 600, 700] },
  { family: 'Spectral', weights: [400, 500, 600, 700] },
  { family: 'Alegreya', weights: [400, 500, 700] },
  { family: 'Karla', weights: [400, 500, 700] },
  { family: 'Mulish', weights: [400, 500, 600, 700] },
  { family: 'Manrope', weights: [400, 500, 600, 700] },
  { family: 'Space Grotesk', weights: [400, 500, 600, 700] },
  { family: 'Outfit', weights: [400, 500, 600, 700] },
]

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero Banner',
  'service-times': 'Service Times',
  announcements: 'Announcements',
  events: 'Events Calendar',
  about: 'About Section',
  contact: 'Contact Info',
}

// ─── Font loading helper ────────────────────────────────────────────

const loadedFonts = new Set<string>()

function loadGoogleFont(family: string) {
  if (loadedFonts.has(family)) return
  loadedFonts.add(family)

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`
  document.head.appendChild(link)
}

// ─── Component ──────────────────────────────────────────────────────

export function ThemeCustomizer({ currentFonts, currentSectionOrder }: ThemeCustomizerProps) {
  const [fonts, setFonts] = useState(currentFonts)
  const [sectionOrder, setSectionOrder] = useState(currentSectionOrder)
  const [state, formAction, isPending] = useActionState(updateThemeSettings, {
    success: false,
    message: '',
  })

  // Load current custom fonts for preview
  useEffect(() => {
    for (const role of ['heading', 'body', 'nav'] as FontRole[]) {
      loadGoogleFont(fonts[role].family)
    }
  }, [fonts])

  const handleFontChange = useCallback((role: FontRole, font: FontChoice) => {
    loadGoogleFont(font.family)
    setFonts((prev) => ({ ...prev, [role]: font }))
  }, [])

  return (
    <form id="theme-settings-form" action={formAction}>
      {/* Hidden fields for serialized data */}
      <input type="hidden" name="fonts" value={JSON.stringify(fonts)} />
      <input type="hidden" name="section_order" value={JSON.stringify(sectionOrder)} />

      {/* Font Picker Section */}
      <section className="admin-settings-group">
        <h2>Font selection</h2>
        <p className="admin-notice">
          Choose fonts for different text roles. Changes preview immediately below.
        </p>

        <div>
          <FontPicker
            label="Heading Font"
            description="Used for page titles and section headings"
            value={fonts.heading}
            onChange={(font) => handleFontChange('heading', font)}
          />
          <FontPicker
            label="Body Font"
            description="Used for paragraph text and general content"
            value={fonts.body}
            onChange={(font) => handleFontChange('body', font)}
          />
          <FontPicker
            label="Navigation Font"
            description="Used for menu items and navigation links"
            value={fonts.nav}
            onChange={(font) => handleFontChange('nav', font)}
          />
        </div>

        {/* Live Preview */}
        <div className="admin-section mt-8">
          <h3 className="admin-section-title">Live Preview</h3>
          <div className="space-y-4">
            <h4
              className="text-2xl font-semibold text-wood-900"
              style={{ fontFamily: `'${fonts.heading.family}', sans-serif` }}
            >
              St. Basil&apos;s Syriac Orthodox Church
            </h4>
            <p
              className="text-base text-wood-800"
              style={{ fontFamily: `'${fonts.body.family}', sans-serif` }}
            >
              Serving the Jacobite Malayalee community in the New England region. Join us for Holy
              Qurbono every Sunday at 9:15 AM EST.
            </p>
            <nav className="flex gap-4" aria-label="Font preview navigation">
              {['Home', 'About', 'Events', 'Contact'].map((item) => (
                <span
                  key={item}
                  className="text-sm font-medium"
                  style={{ fontFamily: `'${fonts.nav.family}', serif` }}
                >
                  {item}
                </span>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {/* Section Order */}
      <section className="admin-settings-group">
        <h2>Homepage Section Order</h2>
        <p className="admin-notice">Drag and drop to reorder homepage sections.</p>

        <SectionReorder sections={sectionOrder} onChange={setSectionOrder} />
      </section>

      <div className="admin-toolbar" aria-live="polite">
        {isPending && <span className="admin-status admin-status-warn">Saving changes</span>}
        {state.message && (
          <p
            className={state.success ? 'admin-status admin-status-ok' : 'admin-error'}
            role="status"
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  )
}

// ─── FontPicker Sub-component ───────────────────────────────────────

interface FontPickerProps {
  label: string
  description: string
  value: FontChoice
  onChange: (font: FontChoice) => void
}

function FontPicker({ label, description, value, onChange }: FontPickerProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = search
    ? GOOGLE_FONTS.filter((f) => f.family.toLowerCase().includes(search.toLowerCase()))
    : GOOGLE_FONTS

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="admin-setting-row relative">
      <div className="admin-setting-copy">
        <div className="admin-setting-title">{label}</div>
        <p className="admin-setting-description">{description}</p>
      </div>

      {/* Selected font display / trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="admin-button admin-button-quiet min-w-[220px] justify-between"
      >
        <span style={{ fontFamily: `'${value.family}', sans-serif` }}>{value.family}</span>
        <ChevronDownIcon className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-1 w-[260px] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts..."
              // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional: dropdown search input should focus on open
              autoFocus
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
            {filtered.map((font) => (
              <li key={font.family}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value.family === font.family}
                  onClick={() => {
                    onChange(font)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  onMouseEnter={() => loadGoogleFont(font.family)}
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-[var(--fg-soft)]"
                >
                  <span style={{ fontFamily: `'${font.family}', sans-serif` }}>{font.family}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="admin-empty">No fonts found</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── SectionReorder Sub-component ───────────────────────────────────

interface SectionReorderProps {
  sections: string[]
  onChange: (sections: string[]) => void
}

function SectionReorder({ sections, onChange }: SectionReorderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }

    const updated = [...sections]
    const [removed] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, removed)
    onChange(updated)
    setDragIndex(null)
    setOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <ul className="admin-list">
      {sections.map((section, index) => (
        <li
          key={section}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className="admin-list-row cursor-grab active:cursor-grabbing"
          data-selected={dragIndex === index || overIndex === index}
        >
          <GripIcon />
          <span className="admin-list-title">{SECTION_LABELS[section] ?? section}</span>
          <span className="admin-list-time ml-auto">{index + 1}</span>
        </li>
      ))}
    </ul>
  )
}

// ─── Icons ──────────────────────────────────────────────────────────

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="6" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="18" r="1" />
    </svg>
  )
}
