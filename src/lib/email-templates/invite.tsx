import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface InviteEmailProps {
  name?: string
  inviteKey?: string
  joinUrl?: string
  note?: string
}

const INK = '#2a2723'
const GOLD = '#a8894f'
const CARD = '#f4f1ea'
const MUTED = '#6f6a60'

export function InviteEmail({ name, inviteKey, joinUrl, note }: InviteEmailProps) {
  const greeting = name ? `Dear ${name},` : 'Dear friend,'
  return (
    <Html>
      <Head />
      <Preview>You have been invited to The Circle</Preview>
      <Body style={{ backgroundColor: '#ece9e2', margin: 0, padding: '32px 0' }}>
        <Container
          style={{
            backgroundColor: CARD,
            maxWidth: '560px',
            margin: '0 auto',
            padding: '48px 40px',
            border: '1px solid #ddd8cc',
          }}
        >
          <Text
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '13px',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: GOLD,
              textAlign: 'center',
              margin: '0 0 8px',
            }}
          >
            The Circle
          </Text>
          <Heading
            style={{
              fontFamily: 'Georgia, serif',
              fontWeight: 400,
              fontSize: '30px',
              lineHeight: '38px',
              color: INK,
              textAlign: 'center',
              margin: '16px 0 24px',
            }}
          >
            You have been invited.
          </Heading>
          <Text style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '15px', lineHeight: '24px', color: INK }}>
            {greeting}
          </Text>
          <Text style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '15px', lineHeight: '24px', color: INK }}>
            The Circle is a private, members-only club of friends of friends. Inside you will find
            by-invitation gatherings and a discreet directory where members find one another by
            expertise, location and the projects they are working on.
          </Text>
          {note ? (
            <Text
              style={{
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                fontSize: '15px',
                lineHeight: '24px',
                color: MUTED,
                borderLeft: `2px solid ${GOLD}`,
                paddingLeft: '16px',
              }}
            >
              {note}
            </Text>
          ) : null}
          <Section
            style={{
              backgroundColor: '#ece9e2',
              border: `1px solid ${GOLD}`,
              textAlign: 'center',
              padding: '20px',
              margin: '28px 0',
            }}
          >
            <Text
              style={{
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontSize: '11px',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: MUTED,
                margin: '0 0 6px',
              }}
            >
              Your personal key
            </Text>
            <Text
              style={{
                fontFamily: 'Courier, monospace',
                fontSize: '20px',
                letterSpacing: '2px',
                color: INK,
                margin: 0,
              }}
            >
              {inviteKey}
            </Text>
          </Section>
          <Section style={{ textAlign: 'center', margin: '8px 0 28px' }}>
            <Button
              href={joinUrl}
              style={{
                backgroundColor: INK,
                color: '#f4f1ea',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontSize: '13px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                padding: '14px 36px',
                textDecoration: 'none',
              }}
            >
              Accept your invitation
            </Button>
          </Section>
          <Text
            style={{
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontSize: '13px',
              lineHeight: '20px',
              color: MUTED,
              textAlign: 'center',
            }}
          >
            One key, one person. Please keep it to yourself.
          </Text>
          <Hr style={{ borderColor: '#ddd8cc', margin: '32px 0 16px' }} />
          <Text
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              color: INK,
              textAlign: 'center',
              margin: 0,
            }}
          >
            Warmly, The Circle
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: InviteEmail,
  subject: 'An invitation to The Circle',
  displayName: 'Member invitation',
  previewData: {
    name: 'Elena',
    inviteKey: 'CIRCLE-4K2M-9QXT',
    joinUrl: 'https://example.com/join?key=CIRCLE-4K2M-9QXT',
    note: 'Yulia and I would love to have you with us.',
  },
} satisfies TemplateEntry
