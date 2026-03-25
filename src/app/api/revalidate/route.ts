import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

// Maps Sanity document types to the Next.js routes they affect.
// When a document is created/updated/deleted in Sanity, the webhook
// fires and we revalidate the corresponding pages.
const TYPE_TO_PATHS: Record<string, string[]> = {
  spiritualLeader: ['/spiritual-leaders'],
  clergy: ['/our-clergy'],
  officeBearer: ['/office-bearers'],
  organization: ['/our-organizations'],
  usefulLink: ['/useful-links'],
  pageContent: ['/privacy-policy', '/terms-of-use'],
  acolytesChoirPage: ['/acolytes-choir'],
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { _type } = body
  const paths = TYPE_TO_PATHS[_type] || []
  paths.forEach((path) => revalidatePath(path))

  return NextResponse.json({ revalidated: paths })
}
