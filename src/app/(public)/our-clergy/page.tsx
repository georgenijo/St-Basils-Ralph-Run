import type { Metadata } from 'next'

import { sanityFetch } from '@/lib/sanity/client'
import { SanityImage } from '@/lib/sanity/image'
import { clergyQuery } from '@/lib/sanity/queries'
import { SectionHeader, ScrollReveal, Card } from '@/components/ui'

import type { ClergyMember, ClergyCategory } from '@/lib/sanity/types'

export const metadata: Metadata = {
  title: 'Our Clergy',
  description:
    "Meet the clergy of St. Basil's Syriac Orthodox Church in Boston — our current spiritual shepherds, previous clergy, and those remembered in memoriam.",
  openGraph: {
    title: "Our Clergy | St. Basil's Syriac Orthodox Church",
    description:
      "Meet the clergy of St. Basil's Syriac Orthodox Church in Boston.",
  },
}

export const revalidate = 60

function groupByCategory(members: ClergyMember[]) {
  const groups: Record<ClergyCategory, ClergyMember[]> = {
    current: [],
    previous: [],
    'in-memoriam': [],
  }

  for (const member of members) {
    if (groups[member.category]) {
      groups[member.category].push(member)
    }
  }

  return groups
}

export default async function OurClergyPage() {
  const allClergy = await sanityFetch<ClergyMember[]>({
    query: clergyQuery,
    tags: ['clergy'],
  })

  const groups = groupByCategory(allClergy)

  return (
    <>
      {/* Hero — fixed background for parallax effect */}
      <section className="relative flex h-[40vh] items-center justify-center overflow-hidden md:h-[60vh]">
        <div
          className="absolute inset-0 bg-cover bg-fixed bg-center"
          style={{ backgroundImage: "url('/images/about/church-exterior.jpg')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
        <h1 className="relative z-10 animate-drop-in px-4 text-center font-heading text-[2.5rem] font-light leading-[1.1] text-cream-50 md:text-[4rem]">
          Our Clergy
        </h1>
      </section>

      {/* Current Clergy */}
      {groups.current.length > 0 && (
        <section className="py-16 md:py-22 lg:py-28">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <SectionHeader
                title="Our Spiritual Shepherds"
                subtitle="The clergy who guide our parish in faith and worship"
                as="h2"
              />
            </ScrollReveal>

            <div className="mt-12 flex flex-wrap justify-center gap-10 md:mt-16 md:gap-14 lg:gap-16">
              {groups.current.map((member, index) => (
                <ScrollReveal key={member._id} delay={index * 0.12}>
                  <div className="flex w-[240px] flex-col items-center text-center sm:w-[280px]">
                    {/* Circular photo */}
                    <div className="relative h-[200px] w-[200px] overflow-hidden rounded-full border-4 border-gold-500/30 shadow-lg sm:h-[240px] sm:w-[240px]">
                      {member.photo ? (
                        <SanityImage
                          image={member.photo}
                          alt={`Portrait of ${member.name}`}
                          fill
                          sizes="240px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-sand">
                          <span className="font-heading text-4xl text-wood-800/30">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name and role */}
                    <h3 className="mt-6 font-heading text-[1.25rem] font-semibold leading-[1.4] text-wood-900 md:text-[1.5rem]">
                      {member.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-burgundy-700">
                      {member.role}
                    </p>
                    {member.yearsOfService && (
                      <p className="mt-1 text-sm text-wood-800/60">
                        {member.yearsOfService}
                      </p>
                    )}
                    {member.bio && (
                      <p className="mt-3 text-sm leading-relaxed text-wood-800">
                        {member.bio}
                      </p>
                    )}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Previous Clergy */}
      {groups.previous.length > 0 && (
        <section className="bg-sand py-16 md:py-22 lg:py-28">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <SectionHeader
                title="Previous Clergy"
                subtitle="Those who faithfully served our parish"
                as="h2"
              />
            </ScrollReveal>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
              {groups.previous.map((member, index) => (
                <ScrollReveal key={member._id} delay={index * 0.12}>
                  <Card variant="outlined" className="p-6 transition-shadow hover:shadow-md">
                    <div className="flex items-start gap-4">
                      {/* Smaller circular photo */}
                      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full">
                        {member.photo ? (
                          <SanityImage
                            image={member.photo}
                            alt={`Portrait of ${member.name}`}
                            fill
                            sizes="72px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-cream-100">
                            <span className="font-heading text-xl text-wood-800/30">
                              {member.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-heading text-[1.25rem] font-semibold leading-[1.4] text-wood-900">
                          {member.name}
                        </h3>
                        <p className="mt-0.5 text-sm font-medium text-burgundy-700">
                          {member.role}
                        </p>
                        {member.yearsOfService && (
                          <p className="mt-0.5 text-sm text-wood-800/60">
                            {member.yearsOfService}
                          </p>
                        )}
                      </div>
                    </div>

                    {member.bio && (
                      <p className="mt-4 text-sm leading-relaxed text-wood-800">
                        {member.bio}
                      </p>
                    )}
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* In Memoriam */}
      {groups['in-memoriam'].length > 0 && (
        <section className="bg-charcoal py-16 md:py-22 lg:py-28">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <ScrollReveal>
              <div className="text-center">
                <h2 className="font-heading text-[1.75rem] font-semibold leading-[1.3] text-cream-50 md:text-[2.25rem]">
                  In Memoriam
                </h2>
                <p className="mt-4 text-base text-cream-50/70">
                  Remembering the faithful servants who have entered eternal rest
                </p>
              </div>
            </ScrollReveal>

            <div className="mt-12 flex flex-wrap justify-center gap-10 md:mt-16 md:gap-14">
              {groups['in-memoriam'].map((member, index) => (
                <ScrollReveal key={member._id} delay={index * 0.15}>
                  <div className="flex w-[200px] flex-col items-center text-center sm:w-[220px]">
                    {/* Candle flame */}
                    <div className="mb-4 flex flex-col items-center" aria-hidden="true">
                      <div className="candle-flame" />
                      <div className="mt-0.5 h-8 w-[6px] rounded-b bg-gradient-to-b from-cream-100 to-cream-100/60" />
                    </div>

                    {/* Photo */}
                    <div className="relative h-[120px] w-[120px] overflow-hidden rounded-full border-2 border-cream-50/20 sm:h-[140px] sm:w-[140px]">
                      {member.photo ? (
                        <SanityImage
                          image={member.photo}
                          alt={`Portrait of ${member.name}`}
                          fill
                          sizes="140px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-charcoal">
                          <span className="font-heading text-2xl text-cream-50/30">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name and details */}
                    <h3 className="mt-4 font-heading text-[1.25rem] font-semibold leading-[1.4] text-cream-50">
                      {member.name}
                    </h3>
                    <p className="mt-1 text-sm text-cream-50/70">
                      {member.role}
                    </p>
                    {member.yearsOfService && (
                      <p className="mt-1 text-sm text-cream-50/50">
                        {member.yearsOfService}
                      </p>
                    )}
                    {member.bio && (
                      <p className="mt-3 text-sm leading-relaxed text-cream-50/70">
                        {member.bio}
                      </p>
                    )}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {allClergy.length === 0 && (
        <section className="py-16 md:py-22 lg:py-28">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-heading text-[1.75rem] font-semibold leading-[1.3] text-wood-900 md:text-[2.25rem]">
                Our Clergy
              </h2>
              <p className="mt-4 text-base text-wood-800/60">
                Clergy information is being updated. Please check back soon.
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
