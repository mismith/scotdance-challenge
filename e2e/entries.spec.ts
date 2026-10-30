import { addChallenge, addEntry, expect, test, total, unique } from './helpers'

test('adds and deletes an entry', async ({ page }) => {
  await addChallenge(page, unique('Entries'))
  await addEntry(page, 'Red Team', 'Ada', 42)

  await page.getByRole('link', { name: 'Activity' }).click()
  const entry = page.locator('.ActivityItem').filter({ hasText: '+42' })
  await expect(entry).toContainText('Ada · Red Team')
  // the total is aggregated by the Cloud Function
  await expect(total(page)).toHaveText('42', { timeout: 15_000 })

  // your own rows keep Edit and Delete in a menu
  await entry.getByRole('button', { name: 'Edit or delete' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Delete entry')).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('No entries yet')).toBeVisible()
})

test('edits a challenge', async ({ page }) => {
  const name = unique('Edit Me')
  await addChallenge(page, name)

  await page.getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Edit challenge')).toBeVisible()
  await dialog.getByLabel('Name').fill(`${name} renamed`)
  await dialog.getByRole('button', { name: '+ Description' }).click()
  await dialog.getByLabel('Description').fill('Dance every day')
  await dialog.getByRole('button', { name: '+ Rename labels' }).click()
  await dialog.getByRole('textbox', { name: 'Amount' }).fill('Minutes')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toBeHidden()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${name} renamed`)
  await expect(page.getByLabel('Minutes')).toBeVisible()

  // changes persist across a reload
  await page.reload()
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('dialog').getByLabel('Description')).toHaveValue('Dance every day')
})

test("can't delete someone else's entry", async ({ page, browser }) => {
  await addChallenge(page, unique('Shared'))
  await addEntry(page, 'Blue Team', 'Bea', 7)

  // open the same challenge as another (anonymous) person via its share link
  await page.getByRole('button', { name: 'Share' }).click()
  const link = await page.getByLabel('Access Link').inputValue()
  const other = await browser.newPage()
  await other.goto(link)
  await other.getByRole('link', { name: 'Activity' }).click()
  const entry = other.locator('.ActivityItem').filter({ hasText: '+7' })
  await expect(entry.getByRole('button', { name: 'Flag' })).toBeVisible()
  await expect(entry.getByRole('button', { name: 'Edit or delete' })).toHaveCount(0)
  await other.close()
})
