import { addChallenge, addEntry, expect, test, unique } from './helpers'

test('shows participant and group stats', async ({ page }) => {
  await addChallenge(page, unique('Stats'))
  await addEntry(page, 'Red Team', 'Ada', 30)
  await addEntry(page, 'Red Team', 'Ada', 20)
  await addEntry(page, 'Red Team', 'Ben', 10)
  await addEntry(page, 'Blue Team', 'Cal', 100)

  await page.getByRole('link', { name: 'Stats' }).click()

  // participants on a podium, ranked by total (waits for the Cloud Function to aggregate)
  const rank = (n: number) => page.locator(`.StatsDancer[data-rank="${n}"]`)
  await expect(rank(1)).toContainText('Cal', { timeout: 15_000 })
  await expect(rank(1)).toContainText('100')
  await expect(rank(2)).toContainText('Ada')
  await expect(rank(2)).toContainText('50')
  await expect(rank(3)).toContainText('Ben')

  // the participant last picked here gets a shout-out
  const note = page.getByRole('paragraph').filter({ hasText: 'Cal is #1' })
  await expect(note).toBeVisible()
  await expect(note).toContainText('leading the way!')

  // search narrows the list
  await page.getByRole('searchbox', { name: 'Search dancers' }).fill('ben')
  await expect(page.locator('.StatsDancer')).toHaveCount(1)
  await expect(page.locator('.StatsDancer')).toContainText('Ben')
  await page.getByRole('searchbox', { name: 'Search dancers' }).fill('')
  // search takes the whole bar while it has focus; leaving it brings the rest back
  await page.getByRole('searchbox', { name: 'Search dancers' }).blur()

  // groups by total, then by average
  await page.getByRole('button', { name: 'Groups' }).click()
  const groups = page.locator('.StatsGroup')
  await expect(groups.nth(0)).toContainText('Blue Team')
  await expect(groups.nth(0)).toContainText('100')
  await expect(groups.nth(1)).toContainText('Red Team')
  await expect(groups.nth(1)).toContainText('60')
  await page.getByRole('combobox', { name: 'Measure' }).selectOption('average')
  await expect(groups.nth(1)).toContainText('30')
})

test('groups get a podium once there are three', async ({ page }) => {
  await addChallenge(page, unique('Podium'))
  await addEntry(page, 'Red Team', 'Ada', 30)
  await addEntry(page, 'Red Team', 'Ben', 10)
  await addEntry(page, 'Blue Team', 'Cal', 100)
  await addEntry(page, 'Green Team', 'Dot', 26)

  await page.getByRole('link', { name: 'Stats' }).click()
  await expect(page.locator('.StatsDancer[data-rank="1"]')).toContainText('Cal', {
    timeout: 15_000,
  })
  await page.getByRole('button', { name: 'Groups' }).click()
  const podium = page.getByRole('list', { name: 'Top three' })
  const rank = (n: number) => podium.locator(`.StatsGroup[data-rank="${n}"]`)
  await expect(rank(1)).toContainText('Blue Team')
  await expect(rank(1)).toContainText('1 dancer')
  await expect(rank(2)).toContainText('Red Team')
  await expect(rank(2)).toContainText('2 dancers')
  await expect(rank(3)).toContainText('Green Team')

  // per dancer reorders it
  await page.getByRole('combobox', { name: 'Measure' }).selectOption('average')
  await expect(rank(2)).toContainText('Green Team')
  await expect(rank(3)).toContainText('Red Team')
  await expect(rank(3)).toContainText('20')
})
