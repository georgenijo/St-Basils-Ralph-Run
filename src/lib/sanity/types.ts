import type { PortableTextBlock } from 'next-sanity'
import type { SanityImageSource } from '@sanity/image-url'

export type { SanityImageSource }

export interface PageContent {
  _id: string
  title: string
  slug: { current: string }
  heroStyle: 'maroon-banner' | 'parallax-image'
  heroImage?: SanityImageSource
  body: PortableTextBlock[]
  metaDescription?: string
  effectiveDate?: string
  lastUpdated?: string
}

export interface OrganizationLink {
  label: string
  url: string
}

export interface Organization {
  _id: string
  name: string
  slug: { current: string }
  description: PortableTextBlock[]
  image?: SanityImageSource & { asset?: { metadata?: { lqip?: string } } }
  scriptureQuote?: string
  scriptureReference?: string
  links?: OrganizationLink[]
  order: number
}
