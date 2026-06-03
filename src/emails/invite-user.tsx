import { Link, Section, Text } from '@react-email/components'

import { EmailLayout, emailStyles } from './components/email-layout'

interface InviteUserProps {
  inviteeName: string
  inviterName: string
  role: 'admin' | 'member'
  actionUrl: string
  supportEmail?: string
  siteUrl?: string
  expiresInHours?: number
}

const ROLE_LABELS: Record<InviteUserProps['role'], string> = {
  admin: 'an Administrator',
  member: 'a Member',
}

const ROLE_ACCESS: Record<InviteUserProps['role'], string> = {
  admin: 'manage events, announcements, members, and the rest of the parish admin portal',
  member: 'view parish announcements, events, and member resources',
}

export function InviteUser({
  inviteeName = 'friend',
  inviterName = "St. Basil's Boston",
  role = 'member',
  actionUrl = 'https://stbasilsboston.org/api/auth/callback',
  supportEmail = 'contact@stbasilsboston.org',
  siteUrl = 'https://stbasilsboston.org',
  expiresInHours = 24,
}: InviteUserProps) {
  return (
    <EmailLayout
      previewText={`${inviterName} invited you to St. Basil's Boston`}
      heading="You're invited"
      siteUrl={siteUrl}
    >
      <Text style={emailStyles.paragraph}>Dear {inviteeName},</Text>
      <Text style={emailStyles.paragraph}>
        {inviterName} has invited you to join the St. Basil&apos;s Syriac Orthodox Church portal as{' '}
        {ROLE_LABELS[role]}. Your account lets you {ROLE_ACCESS[role]}.
      </Text>
      <Text style={emailStyles.paragraph}>
        To accept, click the button below and set your password.
      </Text>
      <Section style={emailStyles.ctaSection}>
        <Link href={actionUrl} style={emailStyles.ctaButton}>
          Accept invitation
        </Link>
      </Section>
      <Text style={smallText}>
        This invitation link expires in {expiresInHours} hours. If it has expired, ask {inviterName}{' '}
        to send a new one.
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

export default InviteUser

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
