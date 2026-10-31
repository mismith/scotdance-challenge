import { addChallenge, addEntry, expect, test, unique } from './helpers'
import { newAccount, signIn, stubEmbed } from './scotdance'

test("a challenge's owner fixes anyone's entry, but never sees flags", async ({
  page,
  browser,
}) => {
  await addChallenge(page, unique('Owned'))
  await page.getByRole('button', { name: 'Share' }).click()
  const link = await page.getByLabel('Access Link').inputValue()
  await page.getByRole('button', { name: 'Got It' }).click()

  // a dancer logs 40 instead of 4
  const dancer = await browser.newPage()
  await dancer.goto(link)
  await addEntry(dancer, 'Blue Team', 'Bea', 40)
  await dancer.close()

  // someone else flags it
  const parent = await browser.newPage()
  await parent.goto(link)
  await parent.getByRole('link', { name: 'Activity' }).click()
  await parent.locator('.ActivityItem').filter({ hasText: '+40' }).getByRole('button').click()
  await expect(parent.getByRole('menuitem', { name: 'Edit' })).toHaveCount(0)
  await parent.getByRole('menuitem', { name: 'Flag' }).click()
  await parent.getByLabel("What's wrong?").fill('Bea meant 4')
  await parent.getByRole('dialog').getByRole('button', { name: 'Flag' }).click()
  await expect(parent.getByText("Thanks! We'll take a look.")).toBeVisible()
  await parent.close()

  // the owner can fix the entry, but the flag (and its message) only goes to admins
  await page.getByRole('link', { name: 'Activity' }).click()
  const entry = page.locator('.ActivityItem').filter({ hasText: 'Bea' })
  await expect(entry).toContainText('+40')
  await expect(entry).not.toContainText('Bea meant 4')
  await entry.getByRole('button').first().click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Amount').fill('4')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(entry).toContainText('+4')
  await expect(entry).not.toContainText('+40')
})

test('an admin sees private challenges, flags and who logged what', async ({ page, browser }) => {
  const name = unique('Hidden')
  const owner = await browser.newPage()
  await addChallenge(owner, name, { isPrivate: true })
  await addEntry(owner, 'Red Team', 'Ada', 3)
  await owner.getByRole('button', { name: 'Private' }).click()
  const link = await owner.getByLabel('Access Link').inputValue()
  await owner.close()

  const parent = await browser.newPage()
  await parent.goto(link)
  await parent.getByRole('button', { name: 'Got It' }).click()
  await parent.getByRole('link', { name: 'Activity' }).click()
  await parent.locator('.ActivityItem').getByRole('button').click()
  await parent.getByRole('menuitem', { name: 'Flag' }).click()
  await parent.getByLabel("What's wrong?").fill('Ada meant 30')
  await parent.getByRole('dialog').getByRole('button', { name: 'Flag' }).click()
  await expect(parent.getByText("Thanks! We'll take a look.")).toBeVisible()
  await parent.close()

  // see ADMIN_EMAILS in e2e/ensure-secret.mjs
  await page.goto('/')
  await stubEmbed(page, { ...newAccount('Admin'), email: 'admin@example.com' })
  await signIn(page)
  await expect(page.getByText('Signed in as Admin')).toBeVisible()

  const privates = page.getByRole('region', { name: 'Private challenges' })
  await privates.getByLabel('Search private challenges').fill(name)
  await privates.getByRole('button', { name }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
  await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()

  await page.getByRole('link', { name: 'Activity' }).click()
  const entry = page.locator('.ActivityItem').filter({ hasText: 'Ada' })
  await expect(entry).toContainText('logged by Anonymous')
  await expect(entry).toContainText('Ada meant 30')
  await entry.getByRole('button', { name: 'Dismiss' }).click()
  await expect(entry).not.toContainText('Ada meant 30')

  await entry.getByRole('button').first().click()
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible()
})
