import { devices } from '@playwright/test'
import { expect, test } from './helpers'

test('an iPhone gets the steps to add it to the Home Screen', async ({ browser }) => {
  const context = await browser.newContext(devices['iPhone 15'])
  const page = await context.newPage()
  await page.route(/client\.crisp\.chat|api\.ipdata\.co|gravatar\.com/, (route) => route.abort())
  await page.goto('/')

  // Explore's card opens the steps
  const card = page.getByRole('button', { name: /^add to home screen/ })
  await card.click()
  const sheet = page.getByRole('dialog', { name: 'add to home screen' })
  await expect(sheet).toContainText('Add to Home Screen')
  await sheet.getByRole('button', { name: 'got it!' }).click()
  await expect(sheet).toBeHidden()

  // then it's put away for good, but the account menu still has it
  await page.reload()
  await expect(page.getByRole('button', { name: /start your own challenge/ })).toBeVisible()
  await expect(card).toBeHidden()
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('button', { name: 'Add to Home Screen' }).click()
  await expect(sheet).toBeVisible()
  await context.close()
})

test("a computer doesn't offer it", async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /start your own challenge/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^add to home screen/ })).toHaveCount(0)
})
