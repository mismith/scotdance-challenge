import { type KeyObject, randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { signPass as signWith } from '../functions/src/pass'
import { emulatorKey } from '../functions/src/passKeys'

// where the app loads embed.js from in dev (see src/lib/scotdance.ts)
const SCOTDANCE = 'http://localhost:5279'

export interface Account {
  sub: string
  email: string
  name: string | null
}

export function newAccount(name: string | null = 'Test Dancer'): Account {
  const sub = randomUUID().replaceAll('-', '').slice(0, 20)
  return { sub, email: `${sub}@example.com`, name }
}

/** A pass as ScotDance.app would sign it (the emulator trusts its fixed test key) */
export function signPass(account: Account, signingKey: KeyObject = emulatorKey().privateKey) {
  return signWith(
    { aud: 'challenge', sub: account.sub, email: account.email, emailVerified: true, name: account.name },
    signingKey,
  )
}

/** Stand in for ScotDance.app's embed.js: its sheet "signs in" as the account, or is closed */
export async function stubEmbed(
  page: Page,
  account: Account | null,
  { signingKey }: { signingKey?: KeyObject } = {},
) {
  await page.unroute(`${SCOTDANCE}/embed.js`)
  await page.route(`${SCOTDANCE}/embed.js`, (route) => {
    const result = account
      ? {
          signedIn: true,
          pass: signPass(account, signingKey),
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
