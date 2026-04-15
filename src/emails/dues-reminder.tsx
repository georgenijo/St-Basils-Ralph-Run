import { Link, Section, Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './components/email-layout'

interface DuesReminderProps {
  familyName: string
  daysUntilExpiry: number
  expiryDate: string
  siteUrl?: string
}

export function DuesReminder({
  familyName,
  daysUntilExpiry,
  expiryDate,
  siteUrl = 'https://stbasilsboston.org',
}: DuesReminderProps) {
  const portalUrl = `${siteUrl}/member/membership`
  const dayWord = daysUntilExpiry === 1 ? 'day' : 'days'

  return (
    <EmailLayout
      previewText={`Your membership expires in ${daysUntilExpiry} ${dayWord}`}
      heading="Membership Renewal Reminder"
      portalUrl={portalUrl}
      portalLabel="Renew membership"
      siteUrl={siteUrl}
    >
      <Text style={emailStyles.paragraph}>Dear {familyName} family,</Text>
      <Text style={emailStyles.paragraph}>
        Your family&apos;s membership expires on <strong>{expiryDate}</strong> ({daysUntilExpiry}{' '}
        {dayWord} from today). Please renew to maintain active status.
      </Text>
      <Section style={emailStyles.ctaSection}>
        <Link href={portalUrl} style={emailStyles.ctaButton}>
          Renew membership
        </Link>
      </Section>
    </EmailLayout>
  )
}

export default DuesReminder
