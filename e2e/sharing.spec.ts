import { addChallenge, addEntry, expect, picker, test, unique } from './helpers'

test('a private challenge only shows to people with its link', async ({ page, browser }) => {
  const name = unique('Secret')
  await addChallenge(page, name, { isPrivate: true })
  await addEntry(page, 'Red Team', 'Ada', 12)
  await page.getByRole('button', { name: 'Private' }).click()
  const link = await page.getByLabel('Access Link').inputValue()
  expect(link).toMatch(/\/private\/\w+$/)

  // someone without the link can't find it
  const other = await browser.newPage()
  await other.goto('/new')
  const challenges = other.getByRole('combobox', { name: 'Challenge' })
  await challenges.click()
  await challenges.fill(name)
  await expect(other.getByRole('option', { name: `Add "${name}"` })).toBeVisible()
  await expect(other.getByRole('option', { name, exact: true })).toHaveCount(0)

  // the link unlocks and selects it, along with its entries
  await other.goto(link)
  await expect(other).toHaveURL(/\/new$/)
  await expect(other.getByText(`Private Challenge`)).toBeVisible()
  await other.getByRole('button', { name: 'Got It' }).click()
  await expect(picker(other, 'Challenge')).toContainText(name)
  await other.getByRole('link', { name: /Activity/ }).click()
  await expect(other.locator('.ActivityTimelineItem')).toContainText('by Ada of Red Team')

  // and it stays unlocked
  await other.reload()
  await expect(other.locator('.ActivityTimelineItem')).toContainText('by Ada of Red Team')
  await other.close()
})

test('a public link selects its challenge', async ({ page, browser }) => {
  const name = unique('Open')
  await addChallenge(page, name)
  await page.getByRole('button', { name: 'Share' }).click()
  const link = await page.getByLabel('Access Link').inputValue()
  expect(link).toMatch(/\/public\/\w+$/)

  const other = await browser.newPage()
  await other.goto(link)
  await expect(other).toHaveURL(/\/new$/)
  await expect(picker(other, 'Challenge')).toContainText(name)
  await other.close()
})
