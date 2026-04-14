import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/email-layout'

interface MembershipRenewedProps {
  familyName: string
  newExpiryDate: string
  siteUrl?: string
}

export function MembershipRenewed({
  familyName,
  newExpiryDate,
  siteUrl = 'https://stbasilsboston.org',
}: MembershipRenewedProps) {
  const portalUrl = `${siteUrl}/member/membership`

  return (
    <EmailLayout
      previewText={`Membership extended through ${newExpiryDate}`}
      heading="Membership Renewed"
      portalUrl={portalUrl}
      portalLabel="View membership"
      siteUrl={siteUrl}
    >
      <Text style={emailStyles.paragraph}>
        Dear {familyName} family,
      </Text>
      <Text style={emailStyles.paragraph}>
        Your membership has been renewed and is active through <strong>{newExpiryDate}</strong>.
        Thank you for your continued support of St. Basil&apos;s.
      </Text>
      <Section style={emailStyles.ctaSection}>
        <Link href={portalUrl} style={emailStyles.ctaButton}>
          View membership
        </Link>
      </Section>
    </EmailLayout>
  )
}

export default MembershipRenewed
