import { groq } from 'next-sanity'

export const pageContentBySlugQuery = groq`
  *[_type == "pageContent" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    heroStyle,
    heroImage,
    body,
    metaDescription,
    effectiveDate,
    lastUpdated
  }
`

export const organizationsQuery = groq`
  *[_type == "organization"] | order(order asc) {
    _id,
    name,
    slug,
    description,
    image {
      ...,
      asset-> {
        metadata {
          lqip
        }
      }
    },
    scriptureQuote,
    scriptureReference,
    links,
    order
  }
`
