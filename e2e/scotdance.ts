import { createHmac, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

// where the app loads embed.js from in dev (see src/lib/scotdance.ts)
const SCOTDANCE = 'http://localhost:5279'

/** The secret the Functions emulator verifies passes with */
export const secret = readFileSync(new URL('../functions/.secret.local', import.meta.url), 'utf8')
  .match(/^TOOL_PASS_SECRET=(.*)$/m)![1]!
  .trim()

export interface Account {
  sub: string
  email: string
  name: string | null
}

export function newAccount(name: string | null = 'Test Dancer'): Account {
  const sub = randomUUID().replaceAll('-', '').slice(0, 20)
  return { sub, email: `${sub}@example.com`, name }
}

/** A pass as ScotDance.app would sign it */
export function signPass(account: Account, signingSecret = secret) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const iat = Math.floor(Date.now() / 1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({
    iss: 'https://scotdance.app',
    aud: 'challenge',
    sub: account.sub,
    email: account.email,
    name: account.name,
    iat,
    exp: iat + 120,
    jti: randomUUID(),
  })
  const signature = createHmac('sha256', signingSecret)
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${signature}`
}

/** Stand in for ScotDance.app's embed.js: its sheet "signs in" as the account, or is closed */
export async function stubEmbed(
  page: Page,
  account: Account | null,
  { signingSecret = secret } = {},
) {
  await page.unroute(`${SCOTDANCE}/embed.js`)
  await page.route(`${SCOTDANCE}/embed.js`, (route) => {
    const result = account
      ? {
          signedIn: true,
          pass: signPass(account, signingSecret),
          uid: account.sub,
          email: account.email,
          name: account.name,
        }
      : { signedIn: false }
    return route.fulfill({
      contentType: 'text/javascript',
      body: `window.ScotDance = { signIn: async () => (${JSON.stringify(result)}) }`,
    })
  })
}

/** Open the account menu in the top bar */
export async function openAccount(page: Page) {
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  return page.locator('.ScotDanceAccount')
}

export async function signIn(page: Page) {
  const menu = await openAccount(page)
  await menu.getByRole('button', { name: 'Sign in with ScotDance.app' }).click()
}
