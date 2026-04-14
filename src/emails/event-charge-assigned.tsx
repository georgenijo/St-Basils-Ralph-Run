import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/email-layout'

interface EventChargeAssignedProps {
  eventTitle: string
  amount: string
  siteUrl?: string
}

export function EventChargeAssigned({
  eventTitle,
  amount,
  siteUrl = 'https://stbasilsboston.org',
}: EventChargeAssignedProps) {
  const portalUrl = `${siteUrl}/member/payments`

  return (
    <EmailLayout
      previewText={`You've been charged ${amount} for ${eventTitle}`}
      heading="Event Charge Assigned"
      portalUrl={portalUrl}
      portalLabel="View payments"
      siteUrl={siteUrl}
    >
      <Text style={emailStyles.paragraph}>
        A charge of {amount} has been assigned to your family for <strong>{eventTitle}</strong>.
      </Text>
      <Text style={emailStyles.paragraph}>
        Please submit payment at your earliest convenience.
      </Text>
      <Section style={emailStyles.ctaSection}>
        <Link href={portalUrl} style={emailStyles.ctaButton}>
          View payments
        </Link>
      </Section>
    </EmailLayout>
  )
}

export default EventChargeAssigned
