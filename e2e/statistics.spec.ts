import { addChallenge, addEntry, expect, test, unique } from './helpers'

test('shows group and participant stats', async ({ page }) => {
  await addChallenge(page, unique('Stats'))
  await addEntry(page, 'Red Team', 'Ada', 30)
  await addEntry(page, 'Red Team', 'Ada', 20)
  await addEntry(page, 'Red Team', 'Ben', 10)
  await addEntry(page, 'Blue Team', 'Cal', 100)

  await page.getByRole('link', { name: /Stats/ }).click()

  // group averages, then totals, as bar charts
  const slides = page.locator('.v-window-item--active')
  await expect(slides.getByRole('heading', { name: 'Group Averages' })).toBeVisible()
  await expect(slides.locator('canvas')).toBeVisible()
  await page.getByRole('button', { name: /Carousel slide 2/ }).click()
  await expect(slides.getByRole('heading', { name: 'Group Totals' })).toBeVisible()
  await expect(slides.locator('canvas')).toBeVisible()

  // participant chart
  await page.getByRole('button', { name: /Carousel slide 3/ }).click()
  await expect(slides.getByRole('heading', { name: 'Participant Totals' })).toBeVisible()
  await expect(slides.locator('canvas')).toBeVisible()

  // participant table, ranked by total (waits for the Cloud Function to aggregate)
  await page.getByRole('button', { name: /Carousel slide 4/ }).click()
  const rows = slides.locator('tbody tr')
  await expect(rows).toHaveCount(3, { timeout: 15_000 })
  await expect(rows.nth(0)).toContainText('1Cal')
  await expect(rows.nth(0)).toContainText('100')
  await expect(rows.nth(1)).toContainText('2Ada')
  await expect(rows.nth(1)).toContainText('50')
  await expect(rows.nth(2)).toContainText('3Ben')

  // filter by search
  await slides.getByRole('button', { name: 'Filter by' }).click()
  await page.getByRole('searchbox', { name: 'Participant' }).fill('ben')
  await page.keyboard.press('Escape')
  await expect(rows).toHaveCount(1)
  await expect(rows.nth(0)).toContainText('Ben')
})
