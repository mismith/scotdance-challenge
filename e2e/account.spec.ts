import { addChallenge, addEntry, expect, test, total, unique } from './helpers'
import { newAccount, openAccount, signIn, stubEmbed } from './scotdance'

test('moves anonymous entries to the account, then signs out', async ({ page }) => {
  await addChallenge(page, unique('Account'))
  await addEntry(page, 'Red Team', 'Ada', 12)

  const account = newAccount('Jane Dancer')
  await stubEmbed(page, account)
  await signIn(page)
  await expect(
    page.getByText('Signed in as Jane Dancer. 1 entry moved to your account.'),
  ).toBeVisible()
  await expect(await openAccount(page)).toContainText('Signed in as Jane Dancer')
  await page.keyboard.press('Escape')

  // still yours: the challenge and the entry can be edited
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Activity' }).click()
  const entry = page.locator('.ActivityItem').filter({ hasText: 'Ada' })
  await entry.getByRole('button', { name: 'Edit or delete' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Amount').fill('15')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(entry).toContainText('+15')
  await expect(total(page)).toHaveText('15', { timeout: 15_000 })

  // signed out, you're a new anonymous user: the entry is the account's now
  await (await openAccount(page)).getByRole('button', { name: 'Sign out' }).click()
  await expect(await openAccount(page)).toContainText('only on this device')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Info' })).toBeVisible()
  await expect(entry.getByRole('button', { name: 'Flag' })).toBeVisible()
  await expect(entry.getByRole('button', { name: 'Edit or delete' })).toHaveCount(0)
})

test('keeps your entries across devices', async ({ page, browser }) => {
  const account = newAccount()
  await addChallenge(page, unique('Devices'))
  await stubEmbed(page, account)
  await signIn(page)
  await expect(page.getByText('Signed in as Test Dancer')).toBeVisible()
  await addEntry(page, 'Blue Team', 'Bea', 8)

  await page.getByRole('button', { name: 'Share' }).click()
  const link = await page.getByLabel('Access Link').inputValue()

  // another device: anonymous until it signs in to the same account
  const other = await browser.newPage()
  await stubEmbed(other, account)
  await other.goto(link)
  await signIn(other)
  await expect(other.getByText('Signed in as Test Dancer')).toBeVisible()
  await other.getByRole('link', { name: 'Activity' }).click()
  const entry = other.locator('.ActivityItem').filter({ hasText: '+8' })
  await expect(entry.getByRole('button', { name: 'Edit or delete' })).toBeVisible()
  await other.close()
})

test('signs in an account with no name', async ({ page }) => {
  // most ScotDance.app accounts are just an email and password
  const account = newAccount(null)
  await addChallenge(page, unique('Nameless'))
  await stubEmbed(page, account)
  await signIn(page)
  await expect(page.getByText(`Signed in as ${account.email}`)).toBeVisible()
})

test('stays anonymous when the sheet is closed', async ({ page }) => {
  await addChallenge(page, unique('Closed'))
  await stubEmbed(page, null)
  await signIn(page)
  await expect(page.getByRole('button', { name: 'Account', exact: true })).toBeEnabled()
  await expect(await openAccount(page)).toContainText('only on this device')
})

test('refuses a pass signed with the wrong secret', async ({ page }) => {
  await addChallenge(page, unique('Forged'))
  await stubEmbed(page, newAccount(), { signingSecret: 'not-the-secret' })
  await signIn(page)
  await expect(page.getByText("Couldn't sign in")).toBeVisible()
  await expect(await openAccount(page)).toContainText('only on this device')
})
