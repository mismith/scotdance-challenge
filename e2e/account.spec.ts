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
  const menu = await openAccount(page)
  await expect(menu).toContainText('Signed in as Jane Dancer')
  // names can be shared, so the email shows which account it is
  await expect(menu).toContainText(account.email)
  await page.keyboard.press('Escape')

  // still yours: the challenge and the entry can be edited
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Activity' }).click()
  const entry = page.locator('.ActivityItem').filter({ hasText: 'Ada' })
  await entry.getByRole('button').click()
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
  await entry.getByRole('button').click()
  await expect(page.getByRole('menuitem', { name: 'Flag' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toHaveCount(0)
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
  await entry.getByRole('button').click()
  await expect(other.getByRole('menuitem', { name: 'Edit' })).toBeVisible()
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

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true })

  test('a tap outside the account menu only closes it', async ({ page }) => {
    await addChallenge(page, unique('Tap away'))
    const tapOn = async (box: { x: number; y: number; width: number; height: number } | null) =>
      page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2)

    // on a tab: the menu closes, and the tab isn't pressed
    const menu = await openAccount(page)
    await tapOn(await page.getByRole('link', { name: 'Activity' }).boundingBox())
    await expect(menu).toBeHidden()
    await expect(page).toHaveURL(/\/log$/)

    // on plain page, too
    await openAccount(page)
    await tapOn(await page.locator('main').boundingBox())
    await expect(menu).toBeHidden()
  })
})
