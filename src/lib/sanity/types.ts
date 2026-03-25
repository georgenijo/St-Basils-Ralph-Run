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

export type ClergyCategory = 'current' | 'previous' | 'in-memoriam'

export interface ClergyMember {
  _id: string
  name: string
  role: string
  category: ClergyCategory
  photo?: SanityImageSource
  yearsOfService?: string
  bio?: string
}
