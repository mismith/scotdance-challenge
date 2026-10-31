// The Functions emulator reads secrets from functions/.secret.local (git-ignored).
// Give each one a test-only value unless one is already set there.
import { appendFileSync, existsSync, readFileSync } from 'node:fs'

const file = new URL('../functions/.secret.local', import.meta.url)
const testValues = {
  TOOL_PASS_SECRET: 'e2e-test-secret',
  // e2e/scotdance.ts signs in as this account to test admin powers
  ADMIN_EMAILS: 'admin@example.com',
  // the emulator only logs emails (see functions/src/email.ts)
  POSTMARK_SERVER_TOKEN: 'e2e-test-token',
}
for (const [name, value] of Object.entries(testValues)) {
  const contents = existsSync(file) ? readFileSync(file, 'utf8') : ''
  if (!new RegExp(`^${name}=`, 'm').test(contents)) {
    appendFileSync(file, `${contents && !contents.endsWith('\n') ? '\n' : ''}${name}=${value}\n`)
  }
}
