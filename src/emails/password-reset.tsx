import { Link, Section, Text } from '@react-email/components'

import { EmailLayout, emailStyles } from './components/email-layout'

interface PasswordResetProps {
  recipientName?: string
  actionUrl: string
  supportEmail?: string
  siteUrl?: string
  expiresInHours?: number
}

export function PasswordReset({
  recipientName = 'there',
  actionUrl = 'https://stbasilsboston.org/api/auth/callback',
  supportEmail = 'contact@stbasilsboston.org',
  siteUrl = 'https://stbasilsboston.org',
  expiresInHours = 1,
}: PasswordResetProps) {
  const expiryLabel = expiresInHours === 1 ? 'one hour' : `${expiresInHours} hours`

  return (
    <EmailLayout
      previewText="Reset your St. Basil's Boston password"
      heading="Reset your password"
      siteUrl={siteUrl}
    >
      <Text style={emailStyles.paragraph}>Dear {recipientName},</Text>
      <Text style={emailStyles.paragraph}>
        We received a request to reset the password for your St. Basil&apos;s Syriac Orthodox Church
        portal account. Click the button below to choose a new password.
      </Text>
      <Section style={emailStyles.ctaSection}>
        <Link href={actionUrl} style={emailStyles.ctaButton}>
          Reset password
        </Link>
      </Section>
      <Text style={smallText}>
        This link expires in {expiryLabel}. If it has expired, ask an administrator to send a new
        one.
      </Text>
      <Text style={smallText}>
        If you didn&apos;t request a password reset, you can safely ignore this email — your password
        will not change.
      </Text>
      <Text style={smallText}>
        Questions? Contact us at{' '}
        <Link href={`mailto:${supportEmail}`} style={supportLink}>
          {supportEmail}
        </Link>
        .
      </Text>
    </EmailLayout>
  )
}

export default PasswordReset

const smallText = {
  fontSize: '12px',
  color: '#9ca3af',
  lineHeight: '1.5',
  margin: '16px 0 0',
}

const supportLink = {
  color: '#9B1B3D',
  textDecoration: 'underline',
}
