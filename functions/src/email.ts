import { defineSecret } from 'firebase-functions/params'

export const APP_URL = 'https://challenge.scotdance.app'

/** Comma-separated emails of ScotDance.app accounts that are admins here, and get every alert */
export const adminEmailsSecret = defineSecret('ADMIN_EMAILS')
export const postmarkTokenSecret = defineSecret('POSTMARK_SERVER_TOKEN')
// sent through Postmark, where the scotdance.app domain is verified
const EMAIL_FROM = 'ScotDance Challenge <challenge@scotdance.app>'

export function getAdminEmails() {
  return adminEmailsSecret
    .value()
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

export async function sendEmail(to: string[], subject: string, html: string) {
  const recipients = [...new Set(to.filter(Boolean))]
  if (!recipients.length) return
  // the emulators (and e2e) only log what would be sent
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    console.log('Email', { to: recipients, subject })
    return
  }
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': postmarkTokenSecret.value(),
    },
    body: JSON.stringify({
      From: EMAIL_FROM,
      To: recipients.join(','),
      Subject: subject,
      HtmlBody: html,
      MessageStream: 'outbound',
    }),
  })
  if (!response.ok) throw new Error(`Postmark: ${response.status} ${await response.text()}`)
}
