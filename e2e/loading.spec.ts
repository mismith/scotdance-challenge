import { addChallenge, addEntry, expect, test, unique } from './helpers'

test('another challenge loads behind a skeleton, never empty or the last one', async ({
  page,
  browser,
}) => {
  await addChallenge(page, unique('First'))
  await addEntry(page, 'Red Team', 'Ada', 5)
  await page.getByRole('link', { name: 'Stats' }).click()
  await expect(page.locator('.StatsDancer')).toContainText('Ada')

  // one this device hasn't opened yet (or its items would come straight from Firestore's cache)
  const second = unique('Second')
  const organiser = await browser.newPage()
  await addChallenge(organiser, second)
  await addEntry(organiser, 'Blue Team', 'Bea', 3)
  await organiser.close()

  await page.getByRole('link', { name: 'All challenges' }).click()
  const more = page.getByRole('button', { name: /more challenges?$/ })
  if (await more.isVisible()) await more.click()

  // from here, note anything shown that shouldn't be: the empty state, or the first one's dancer
  await page.evaluate(() => {
    const seen: string[] = ((window as unknown as { seen: string[] }).seen = [])
    new MutationObserver(() => {
      if (document.body.innerText.includes('no entries yet')) seen.push('empty')
      const items = [...document.querySelectorAll('.StatsDancer, .ActivityItem')]
      if (items.some((item) => item.textContent?.includes('Ada'))) seen.push('Ada')
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
  // and Firestore's answers take a second
  await page.route(/google\.firestore\.v1\.Firestore/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await route.continue()
  })

  await page
    .getByRole('region', { name: 'Featured' })
    .getByRole('button', { name: new RegExp(second) })
    .click()
  await page.getByRole('link', { name: 'Stats' }).click()
  await expect(page.getByRole('status').getByText('Loading…')).toBeAttached()
  await expect(page.locator('.StatsDancer')).toContainText('Bea', { timeout: 15_000 })
  await page.getByRole('link', { name: 'Activity' }).click()
  await expect(page.locator('.ActivityItem')).toContainText('Bea', { timeout: 15_000 })

  expect(await page.evaluate(() => (window as unknown as { seen: string[] }).seen)).toEqual([])
})

test('a connection that died in the background comes back by itself', async ({ page, browser }) => {
  await addChallenge(page, unique('First'))
  await addEntry(page, 'Red Team', 'Ada', 5)
  await page.getByRole('link', { name: 'Stats' }).click()
  await expect(page.locator('.StatsDancer')).toContainText('Ada')

  const second = unique('Second')
  const organiser = await browser.newPage()
  await addChallenge(organiser, second)
  await addEntry(organiser, 'Blue Team', 'Bea', 3)
  await organiser.close()

  await page.getByRole('link', { name: 'All challenges' }).click()
  const more = page.getByRole('button', { name: /more challenges?$/ })
  if (await more.isVisible()) await more.click()

  // like iOS waking an app: whatever Firestore sends for a moment goes nowhere, and never answers
  let isDead = true
  await page.route(/google\.firestore\.v1\.Firestore\/Listen/, async (route) => {
    if (isDead) return new Promise(() => {})
    await route.continue()
  })
  setTimeout(() => (isDead = false), 1500)

  await page
    .getByRole('region', { name: 'Featured' })
    .getByRole('button', { name: new RegExp(second) })
    .click()
  await page.getByRole('link', { name: 'Stats' }).click()
  await expect(page.locator('.StatsDancer')).toContainText('Bea', { timeout: 15_000 })
})
