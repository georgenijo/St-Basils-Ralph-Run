import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/email-layout'

interface MembershipExpiredProps {
  familyName: string
  expiryDate: string
  siteUrl?: string
}

export function MembershipExpired({
  familyName,
  expiryDate,
  siteUrl = 'https://stbasilsboston.org',
}: MembershipExpiredProps) {
  const portalUrl = `${siteUrl}/member/membership`

  return (
    <EmailLayout
      previewText={`Your membership expired on ${expiryDate}`}
      heading="Membership Expired"
      portalUrl={portalUrl}
      portalLabel="Renew membership"
      siteUrl={siteUrl}
    >
      <Text style={emailStyles.paragraph}>
        Dear {familyName} family,
      </Text>
      <Text style={emailStyles.paragraph}>
        Your family&apos;s membership expired on <strong>{expiryDate}</strong>. Renew now to
        restore your active status.
      </Text>
      <Section style={emailStyles.ctaSection}>
        <Link href={portalUrl} style={emailStyles.ctaButton}>
          Renew membership
        </Link>
      </Section>
    </EmailLayout>
  )
}

export default MembershipExpired
