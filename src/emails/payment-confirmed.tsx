import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/email-layout'

interface PaymentConfirmedProps {
  paymentType: string
  amount: string
  method: string
  siteUrl?: string
}

export function PaymentConfirmed({
  paymentType,
  amount,
  method,
  siteUrl = 'https://stbasilsboston.org',
}: PaymentConfirmedProps) {
  const portalUrl = `${siteUrl}/member/payments`

  return (
    <EmailLayout
      previewText={`Your ${paymentType} payment of ${amount} was confirmed`}
      heading="Payment Confirmed"
      portalUrl={portalUrl}
      portalLabel="View payments"
      siteUrl={siteUrl}
    >
      <Text style={emailStyles.paragraph}>
        Your {paymentType} payment of {amount} via {method} has been confirmed. Thank you.
      </Text>
      <Section style={emailStyles.ctaSection}>
        <Link href={portalUrl} style={emailStyles.ctaButton}>
          View payments
        </Link>
      </Section>
    </EmailLayout>
  )
}

export default PaymentConfirmed
