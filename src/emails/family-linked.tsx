import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/email-layout'

interface FamilyLinkedProps {
  fullName: string
  familyName: string
  siteUrl?: string
}

export function FamilyLinked({
  fullName,
  familyName,
  siteUrl = 'https://stbasilsboston.org',
}: FamilyLinkedProps) {
  const portalUrl = `${siteUrl}/member/family`

  return (
    <EmailLayout
      previewText={`You've been linked to the ${familyName} family`}
      heading="Family Linked"
      portalUrl={portalUrl}
      portalLabel="View your family"
      siteUrl={siteUrl}
    >
      <Text style={emailStyles.paragraph}>Hello {fullName},</Text>
      <Text style={emailStyles.paragraph}>
        Your account has been linked to the <strong>{familyName}</strong> family.
      </Text>
      <Section style={emailStyles.ctaSection}>
        <Link href={portalUrl} style={emailStyles.ctaButton}>
          View your family
        </Link>
      </Section>
    </EmailLayout>
  )
}

export default FamilyLinked
