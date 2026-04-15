import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/email-layout'

interface WelcomeMemberProps {
  fullName: string
  siteUrl?: string
}

export function WelcomeMember({
  fullName,
  siteUrl = 'https://stbasilsboston.org',
}: WelcomeMemberProps) {
  const portalUrl = `${siteUrl}/member`

  return (
    <EmailLayout
      previewText="Welcome to St. Basil's"
      heading="Welcome to St. Basil's"
      portalUrl={portalUrl}
      portalLabel="Visit your portal"
      siteUrl={siteUrl}
    >
      <Text style={emailStyles.paragraph}>Dear {fullName},</Text>
      <Text style={emailStyles.paragraph}>
        Welcome to the St. Basil&apos;s Syriac Orthodox Church community. Your member account is now
        active.
      </Text>
      <Text style={emailStyles.paragraph}>
        Join us on Sundays for Morning Prayer at 8:30 AM and Holy Qurbono at 9:15 AM.
      </Text>
      <Section style={emailStyles.ctaSection}>
        <Link href={portalUrl} style={emailStyles.ctaButton}>
          Visit your portal
        </Link>
      </Section>
    </EmailLayout>
  )
}

export default WelcomeMember
