import { addChallenge, addEntry, expect, test, unique } from './helpers'

test('the top bar sits in the same spot on every page', async ({ page }) => {
  const spot = (name: string) => page.getByRole('button', { name, exact: true }).boundingBox()
  const spots = () => Promise.all(['Help and feedback', 'Account'].map(spot))
  const back = () => page.getByRole('link', { name: /^(All challenges|Back)$/ }).boundingBox()

  await addChallenge(page, unique('Steady'))
  await addEntry(page, 'Red Team', 'Ada', 5)
  const onChallenge = await spots()
  const backOnChallenge = await back()

  // Explore: help and account stay put
  await page.getByRole('link', { name: 'All challenges' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'challenge' })).toBeVisible()
  expect(await spots()).toEqual(onChallenge)

  // certificates: back stays put (on a phone: a computer's page is wider, for the certificate)
  if (page.viewportSize()!.width > 640) return
  await page.goBack()
  await page.getByRole('link', { name: 'Stats' }).click()
  await page.getByRole('link', { name: 'certificates' }).click()
  await expect(page.getByRole('button', { name: 'print' })).toBeVisible()
  expect(await back()).toEqual(backOnChallenge)
})

test('search takes the whole bar while typing', async ({ page }) => {
  await addChallenge(page, unique('Searchable'))
  await addEntry(page, 'Red Team', 'Ada', 5)
  await addEntry(page, 'Blue Team', 'Bea', 3)
  await page.getByRole('link', { name: 'Stats' }).click()
  const search = page.getByRole('searchbox', { name: 'Search dancers' })
  await search.click()
  // once it's done growing, it's as wide as the bar
  await expect(async () => {
    const bar = await page.locator('.stats-toolbar').boundingBox()
    const box = await search.locator('..').boundingBox()
    expect(Math.round(box!.width)).toBe(Math.round(bar!.width))
  }).toPass()

  // and leaving it brings the rest back
  await search.blur()
  await expect(page.getByRole('button', { name: 'groups' })).toBeVisible()
})
