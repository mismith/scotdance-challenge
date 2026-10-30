import { addChallenge, addEntry, expect, picker, test, unique } from './helpers'

test('adds and deletes an entry', async ({ page }) => {
  await addChallenge(page, unique('Entries'))
  await addEntry(page, 'Red Team', 'Ada', 42)

  await page.getByRole('link', { name: /Activity/ }).click()
  const entry = page.locator('.ActivityTimelineItem').filter({ hasText: '+42' })
  await expect(entry).toContainText('by Ada of Red Team')
  // the total is aggregated by the Cloud Function
  await expect(page.getByText(/^42$/)).toBeVisible({ timeout: 15_000 })

  await entry.getByRole('button', { name: 'Delete' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Delete Item')).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('No entries yet')).toBeVisible()
})

test('edits a challenge', async ({ page }) => {
  const name = unique('Edit Me')
  await addChallenge(page, name)

  await page.getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Edit Challenge')).toBeVisible()
  await dialog.getByLabel('Name *').fill(`${name} renamed`)
  await dialog.getByText('Description').click()
  await dialog.getByLabel('Description').fill('Dance every day')
  await dialog.getByText('Labels').click()
  await dialog.getByRole('textbox', { name: 'Amount' }).fill('Minutes')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toBeHidden()

  await expect(picker(page, 'Challenge')).toContainText(`${name} renamed`)
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
  await other.getByRole('link', { name: /Activity/ }).click()
  const entry = other.locator('.ActivityTimelineItem').filter({ hasText: '+7' })
  await expect(entry.getByRole('button', { name: 'Flag' })).toBeVisible()
  await expect(entry.getByRole('button', { name: 'Delete' })).toHaveCount(0)
  await other.close()
})
