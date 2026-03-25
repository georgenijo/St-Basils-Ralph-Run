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

export const usefulLinksQuery = groq`
  *[_type == "usefulLink"] | order(order asc) {
    _id,
    title,
    description,
    "fileUrl": file.asset->url,
    category,
    order
  }
`
