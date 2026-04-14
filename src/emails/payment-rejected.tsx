import { Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/email-layout'

interface PaymentRejectedProps {
  paymentType: string
  amount: string
  method: string
  referenceMemo: string
  reason: string
  siteUrl?: string
}

export function PaymentRejected({
  paymentType,
  amount,
  method,
  referenceMemo,
  reason,
  siteUrl = 'https://stbasilsboston.org',
}: PaymentRejectedProps) {
  const portalUrl = `${siteUrl}/member/payments`

  return (
    <EmailLayout
      previewText={`Your ${paymentType} payment of ${amount} could not be confirmed`}
      heading="Payment Not Confirmed"
      portalUrl={portalUrl}
      portalLabel="View payments"
      siteUrl={siteUrl}
    >
      <Text style={emailStyles.paragraph}>
        Your {paymentType} payment of {amount} via {method} could not be confirmed.
      </Text>
      <Text style={emailStyles.label}>Reference</Text>
      <Text style={emailStyles.value}>{referenceMemo}</Text>
      <Text style={emailStyles.label}>Reason</Text>
      <Text style={emailStyles.value}>{reason}</Text>
      <Text style={{ ...emailStyles.paragraph, fontStyle: 'italic', color: '#6b7280', fontSize: '13px' }}>
        If you believe this is an error, please contact the church treasurer.
      </Text>
    </EmailLayout>
  )
}

export default PaymentRejected
