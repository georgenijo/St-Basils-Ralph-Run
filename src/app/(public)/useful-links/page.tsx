import type { Metadata } from 'next'

import { sanityFetch } from '@/lib/sanity/client'
import { urlFor } from '@/lib/sanity/image'
import { pageContentBySlugQuery, usefulLinksQuery } from '@/lib/sanity/queries'
import { ParallaxHero, SectionHeader, ScrollReveal } from '@/components/ui'

import type { PageContent, UsefulLink } from '@/lib/sanity/types'

const FALLBACK_HERO = '/images/about/church-exterior.jpg'

export async function generateMetadata(): Promise<Metadata> {
  const page = await sanityFetch<PageContent | null>({
    query: pageContentBySlugQuery,
    params: { slug: 'useful-links' },
    tags: ['pageContent'],
  })

  return {
    title: 'Useful Links',
    description:
      page?.metaDescription ??
      "Download liturgical texts, prayer books, and other resources from St. Basil's Syriac Orthodox Church.",
    openGraph: {
      title: "Useful Links | St. Basil's Syriac Orthodox Church",
      description:
        "Download liturgical texts, prayer books, and other resources from St. Basil's Syriac Orthodox Church.",
    },
  }
}

export default async function UsefulLinksPage() {
  const [page, links] = await Promise.all([
    sanityFetch<PageContent | null>({
      query: pageContentBySlugQuery,
      params: { slug: 'useful-links' },
      tags: ['pageContent'],
    }),
    sanityFetch<UsefulLink[]>({
      query: usefulLinksQuery,
      tags: ['usefulLink'],
    }),
  ])

  const heroImage =
    page?.heroImage && page.heroStyle === 'parallax-image'
      ? urlFor(page.heroImage).width(1920).quality(80).auto('format').url()
      : FALLBACK_HERO

  const grouped = groupByCategory(links ?? [])

  return (
    <>
      <ParallaxHero title={page?.title ?? 'Useful Links'} backgroundImage={heroImage} />

      <section className="py-16 md:py-22 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeader
              title="Liturgical Resources"
              subtitle="Download prayer texts, liturgical guides, and other materials for personal devotion and study."
            />
          </ScrollReveal>

          {links.length === 0 ? (
            <ScrollReveal>
              <p className="mt-12 text-center font-body text-base text-wood-800/60">
                Resources are being prepared. Please check back soon.
              </p>
            </ScrollReveal>
          ) : grouped.length === 1 && !grouped[0].category ? (
            <div className="mt-12 space-y-4">
              {links.map((link, i) => (
                <ScrollReveal key={link._id} delay={i * 0.08}>
                  <LinkCard link={link} />
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="mt-12 space-y-12">
              {grouped.map((group) => (
                <div key={group.category ?? 'uncategorized'}>
                  {group.category && (
                    <ScrollReveal>
                      <h3 className="mb-6 font-heading text-[1.25rem] font-semibold leading-[1.4] text-wood-900 md:text-[1.5rem]">
                        {group.category}
                      </h3>
                    </ScrollReveal>
                  )}
                  <div className="space-y-4">
                    {group.links.map((link, i) => (
                      <ScrollReveal key={link._id} delay={i * 0.08}>
                        <LinkCard link={link} />
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function LinkCard({ link }: { link: UsefulLink }) {
  return (
    <a
      href={link.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="group block rounded-2xl border-l-4 border-burgundy-700 bg-sand p-6 shadow-sm transition-all duration-300 hover:translate-x-[5px] hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-heading text-lg font-semibold text-wood-900 group-hover:text-burgundy-700 md:text-xl">
            {link.title}
          </h3>
          {link.description && (
            <p className="mt-1 font-body text-sm leading-relaxed text-wood-800/60">
              {link.description}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 text-burgundy-700/60 transition-colors group-hover:text-burgundy-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="sr-only">Download PDF</span>
        </div>
      </div>
    </a>
  )
}

function groupByCategory(links: UsefulLink[]): { category: string | null; links: UsefulLink[] }[] {
  if (links.length === 0) return []

  const map = new Map<string | null, UsefulLink[]>()

  for (const link of links) {
    const key = link.category ?? null
    const existing = map.get(key)
    if (existing) {
      existing.push(link)
    } else {
      map.set(key, [link])
    }
  }

  return Array.from(map.entries()).map(([category, links]) => ({ category, links }))
}
