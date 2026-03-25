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

export const clergyQuery = groq`
  *[_type == "clergy"] | order(order asc) {
    _id,
    name,
    role,
    category,
    photo,
    yearsOfService,
    bio
  }
`
