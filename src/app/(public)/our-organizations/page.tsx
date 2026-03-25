import type { Metadata } from 'next'
import Link from 'next/link'

import { PortableText } from 'next-sanity'

import { sanityFetch } from '@/lib/sanity/client'
import { SanityImage } from '@/lib/sanity/image'
import { organizationsQuery } from '@/lib/sanity/queries'
import { cn } from '@/lib/utils'

import { PageHero, ScrollReveal, SectionHeader } from '@/components/ui'

import type { Organization } from '@/lib/sanity/types'

export const metadata: Metadata = {
  title: 'Our Organizations',
  description:
    "Explore the ministries and organizations of St. Basil's Syriac Orthodox Church, including Sunday School, youth fellowship, women's league, and men's fellowship.",
  openGraph: {
    title: "Our Organizations | St. Basil's Syriac Orthodox Church",
    description:
      "Explore the ministries and organizations of St. Basil's Syriac Orthodox Church in Boston.",
  },
}

export const revalidate = 60

function OrganizationSection({
  org,
  index,
}: {
  org: Organization
  index: number
}) {
  const isEven = index % 2 === 0
  const bgClass = isEven ? 'bg-cream-50' : 'bg-sand'

  return (
    <section className={cn('py-16 md:py-22 lg:py-28', bgClass)}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            'flex flex-col items-center gap-10 md:gap-14 lg:gap-16',
            isEven ? 'md:flex-row' : 'md:flex-row-reverse'
          )}
        >
          {/* Image */}
          {org.image && (
            <ScrollReveal
              direction={isEven ? 'left' : 'right'}
              className="w-full shrink-0 md:w-5/12"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-md">
                <SanityImage
                  image={org.image}
                  alt={org.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  lqip={org.image.asset?.metadata?.lqip}
                />
              </div>
            </ScrollReveal>
          )}

          {/* Content */}
          <ScrollReveal
            direction={isEven ? 'right' : 'left'}
            className={cn('w-full', org.image && 'md:w-7/12')}
          >
            <div className="space-y-6">
              <SectionHeader title={org.name} align="left" as="h2" />

              <div className="prose-wood max-w-none space-y-4 text-base leading-relaxed text-wood-800">
                <PortableText value={org.description} />
              </div>

              {/* Scripture Quote */}
              {org.scriptureQuote && (
                <blockquote className="border-l-4 border-burgundy-700 py-2 pl-6">
                  <p className="font-heading text-lg leading-relaxed text-wood-800/80 italic">
                    &ldquo;{org.scriptureQuote}&rdquo;
                  </p>
                  {org.scriptureReference && (
                    <cite className="mt-2 block text-sm font-medium not-italic text-burgundy-700">
                      &mdash; {org.scriptureReference}
                    </cite>
                  )}
                </blockquote>
              )}

              {/* External Links */}
              {org.links && org.links.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {org.links.map((link) => (
                    <Link
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-burgundy-700 px-4 py-2 text-sm font-medium text-burgundy-700 transition-colors hover:bg-burgundy-700 hover:text-cream-50"
                    >
                      {link.label}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm7.25-.75a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V6.31l-5.47 5.47a.75.75 0 01-1.06-1.06l5.47-5.47H12.25a.75.75 0 01-.75-.75z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

export default async function OurOrganizationsPage() {
  const organizations = await sanityFetch<Organization[]>({
    query: organizationsQuery,
    tags: ['organization'],
  })

  return (
    <>
      <PageHero
        title="Our Organizations"
        backgroundImage="/images/organizations/hero.jpg"
      />

      {/* Intro */}
      <section className="py-16 md:py-22 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeader
              title="Serving Together in Christ"
              subtitle="Our church is blessed with vibrant organizations that nurture faith, build community, and serve others across all ages and walks of life."
            />
          </ScrollReveal>
        </div>
      </section>

      {/* Organization Sections */}
      {organizations.map((org, index) => (
        <OrganizationSection key={org._id} org={org} index={index} />
      ))}

      {/* Closing CTA */}
      {organizations.length > 0 && (
        <section className="bg-burgundy-700 py-16 md:py-22 lg:py-28">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="font-heading text-[1.75rem] font-semibold leading-[1.3] text-cream-50 md:text-[2.25rem]">
                  Get Involved
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-cream-50/90">
                  Whether you are young or old, new to the faith or deeply rooted in it, there is a
                  place for you in our church family. Reach out to learn more about how you can
                  participate in our organizations and grow in fellowship.
                </p>
                <Link
                  href="/contact-us"
                  className="mt-8 inline-flex items-center rounded-lg bg-cream-50 px-6 py-3 text-sm font-medium text-burgundy-700 transition-colors hover:bg-cream-100"
                >
                  Contact Us
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}
    </>
  )
}
