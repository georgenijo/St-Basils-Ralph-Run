import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'

interface EmailLayoutProps {
  previewText: string
  heading: string
  portalUrl?: string
  portalLabel?: string
  siteUrl?: string
  children: ReactNode
}

const CHURCH_NAME = "St. Basil's Syriac Orthodox Church"
const CHURCH_ADDRESS = '73 Ellis Street, Newton, MA 02464'

export function EmailLayout({
  previewText,
  heading,
  portalUrl,
  portalLabel = 'View in portal',
  siteUrl = 'https://stbasilsboston.org',
  children,
}: EmailLayoutProps) {
  const settingsUrl = `${siteUrl}/member/settings`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerText}>{CHURCH_NAME}</Text>
          </Section>
          <Section style={content}>
            <Heading style={headingStyle}>{heading}</Heading>
            <Hr style={goldDivider} />
            {children}
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>
              {CHURCH_NAME}
              {'\n'}
              {CHURCH_ADDRESS}
            </Text>
            <Text style={footerText}>
              {portalUrl ? (
                <>
                  <Link href={portalUrl} style={footerLink}>
                    {portalLabel}
                  </Link>
                  {' · '}
                </>
              ) : null}
              <Link href={settingsUrl} style={footerLink}>
                Manage notification preferences
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default EmailLayout

const body = {
  backgroundColor: '#f6f6f6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: '0',
  padding: '0',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  borderRadius: '8px',
  maxWidth: '560px',
  overflow: 'hidden' as const,
}

const header = {
  backgroundColor: '#253341',
  padding: '24px 32px',
  textAlign: 'center' as const,
}

const headerText = {
  fontSize: '18px',
  fontWeight: '600' as const,
  color: '#FFFDF8',
  letterSpacing: '0.02em',
  margin: '0',
}

const content = {
  padding: '32px',
}

const headingStyle = {
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#352618',
  lineHeight: '1.3',
  margin: '0 0 16px',
}

const goldDivider = {
  borderColor: '#D4A017',
  borderWidth: '2px',
  borderStyle: 'solid' as const,
  width: '60px',
  margin: '0 0 24px',
}

const footerSection = {
  padding: '24px 32px',
  borderTop: '1px solid #e5e5e5',
}

const footerText = {
  fontSize: '12px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  margin: '0 0 8px',
  lineHeight: '1.5',
  whiteSpace: 'pre-line' as const,
}

const footerLink = {
  color: '#9ca3af',
  textDecoration: 'underline',
}
