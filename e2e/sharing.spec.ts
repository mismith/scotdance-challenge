import { addChallenge, addEntry, expect, test, unique } from './helpers'

test('a private challenge only shows to people with its link', async ({ page, browser }) => {
  // a listed challenge shows to everyone
  const listed = unique('Listed')
  await addChallenge(page, listed)

  const name = unique('Secret')
  await addChallenge(page, name, { isPrivate: true })
  await addEntry(page, 'Red Team', 'Ada', 12)
  await page.getByRole('button', { name: 'Private' }).click()
  const link = await page.getByLabel('Access Link').inputValue()
  expect(link).toMatch(/\/private\/\w+$/)

  // its creator finds it under Yours
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Yours' })).toContainText(name)

  // someone without the link can't find it
  const other = await browser.newPage()
  await other.goto('/')
  // the featured section lists what's live (and just ended), a few at a time
  const featured = other.getByRole('region', { name: 'Featured' })
  await expect(featured).toBeVisible()
  const more = other.getByRole('button', { name: /more challenges?$/ })
  if (await more.isVisible()) await more.click()
  await expect(featured).toContainText(listed)
  await expect(other.getByText(name)).toHaveCount(0)

  // the link unlocks and selects it, along with its entries
  await other.goto(link)
  await expect(other).toHaveURL(/\/new$/)
  await expect(other.getByText('Private Challenge')).toBeVisible()
  await other.getByRole('button', { name: 'Got It' }).click()
  await expect(other.getByRole('heading', { level: 1 })).toHaveText(name)
  await other.getByRole('link', { name: 'Activity' }).click()
  await expect(other.locator('.ActivityItem')).toContainText('Ada · Red Team')

  // and it stays unlocked
  await other.reload()
  await expect(other.locator('.ActivityItem')).toContainText('Ada · Red Team')
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
  await expect(other.getByRole('heading', { level: 1 })).toHaveText(name)
  await other.close()
})
