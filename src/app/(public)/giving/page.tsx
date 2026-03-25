import { Metadata } from 'next'
import Link from 'next/link'

import { PageHero, SectionHeader } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Giving',
  description:
    'Support St. Basil\'s Syriac Orthodox Church in Boston, Massachusetts through your generous offerings and donations.',
}

const charityCards = [
  {
    icon: 'house',
    title: 'Housing Ministry in India',
    description:
      'Through God\'s provision and the generosity of our congregation, we have been blessed to contribute toward building homes for families in need throughout India. These modest dwellings provide shelter, dignity, and a foundation for families to build their lives upon, reflecting Christ\'s love through practical care.',
  },
  {
    icon: 'heart',
    title: 'Caring for Our Community',
    description:
      'Our church family believes in supporting one another through life\'s most difficult moments. When members of our community face serious health challenges, we are moved by Christian love to provide assistance, reflecting our understanding that we are called to bear one another\'s burdens and show compassion.',
  },
  {
    icon: 'user',
    title: 'Clergy Housing Support',
    description:
      'Learning of a newly ordained deacon in India facing difficult living conditions, our congregation felt moved to help provide him with a proper home. This space enables him to prepare spiritually for the Divine Liturgy and serve his community with dignity.',
  },
  {
    icon: 'medical',
    title: 'Medical Emergency Relief',
    description:
      'Over the years, we have received heartfelt requests from individuals and families in India facing serious medical challenges. Through our congregation\'s compassionate giving, we have been able to provide financial assistance for life-saving treatments.',
  },
  {
    icon: 'charity',
    title: 'Partnership with Solace Charity',
    description:
      'We are honored to support Solace Charity, an organization dedicated to caring for severely ill and underprivileged children in Kerala, India. Solace provides comprehensive support\u2014from funding critical medical procedures to offering emotional support groups for families.',
  },
  {
    icon: 'accessibility',
    title: 'The Pelican Centre Ministry',
    description:
      'The Pelican Centre, in Kerala, India, serves as "an open door for the needy and mentally challenged people of our society," providing rehabilitation and care that enables individuals to lead fuller, more independent lives.',
  },
] as const

function CharityIcon({ type }: { type: string }) {
  const iconClass = 'h-10 w-10 text-burgundy-700'

  switch (type) {
    case 'house':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" />
        </svg>
      )
    case 'heart':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      )
    case 'user':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      )
    case 'medical':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )
    case 'charity':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
      )
    case 'accessibility':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082" />
        </svg>
      )
    default:
      return null
  }
}

export default function GivingPage() {
  return (
    <>
      <PageHero title="Giving" backgroundImage="/images/giving/hero.png" />

      {/* Giving Introduction */}
      <section className="bg-sand py-16 md:py-22">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-body text-lg leading-relaxed text-wood-800">
            Giving is an act of worship and a reflection of God&apos;s abundant love for us.
            As we have been blessed, we are called to bless others through our faithful
            stewardship. Your generous offerings support our church&apos;s ministry, help us
            care for our community, and enable us to share Christ&apos;s love through
            charitable works.
          </p>

          <p className="mt-6 font-body text-lg font-semibold italic leading-relaxed text-wood-800">
            For your convenience, offerings may be sent to our Zelle account:{' '}
            <span className="not-italic">stbasilsboston.trsr@gmail.com</span>
          </p>

          <p className="mt-6 font-body text-lg leading-relaxed text-wood-800">
            For questions about giving or other ways to support our ministry, please reach
            out through our{' '}
            <Link
              href="/contact"
              className="text-burgundy-700 underline underline-offset-4 hover:text-burgundy-800"
            >
              Contact Us
            </Link>{' '}
            page.
          </p>
        </div>
      </section>

      {/* Our Heart for Service */}
      <section className="bg-charcoal py-16 md:py-22">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Our Heart for Service"
            subtitle={
              'Following Christ\u2019s call to serve "the least of these," St. Basil\u2019s has been blessed to support various charitable causes and organizations over the years. Through the faithful generosity of our church family, we have been able to extend God\u2019s love beyond our parish walls, caring for those in need both locally and globally.'
            }
            className="[&_h2]:text-cream-50 [&_p]:text-cream-50/80"
          />
          <p className="mx-auto mt-4 max-w-3xl text-center font-body text-base font-semibold leading-relaxed text-cream-50/80">
            The examples below represent some of the ministries and causes we have had the
            privilege to support&mdash;contact us to learn more about our ongoing outreach
            efforts.
          </p>
        </div>
      </section>

      {/* Charity Cards */}
      <section className="bg-cream-50 py-16 md:py-22">
        <div className="mx-auto grid max-w-[1200px] gap-6 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {charityCards.map((card) => (
            <article
              key={card.title}
              className="group rounded-2xl bg-sand p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-8"
            >
              <div className="mb-4">
                <CharityIcon type={card.icon} />
              </div>
              <h3 className="font-heading text-[1.25rem] font-semibold leading-[1.4] text-wood-900 md:text-[1.5rem]">
                {card.title}
              </h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-wood-800/80">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
