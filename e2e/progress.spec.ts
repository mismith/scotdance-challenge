import { addChallenge, addEntry, expect, test, total, unique } from './helpers'

test('undoes the entry you just added', async ({ page }) => {
  await addChallenge(page, unique('Undo'))
  await addEntry(page, 'Red Team', 'Ada', 12)

  await page.getByRole('button', { name: 'undo' }).click()
  // back in the field, ready to fix
  await expect(page.getByLabel('Amount')).toHaveValue('12')
  await page.getByRole('link', { name: 'Activity' }).click()
  await expect(page.getByText('No entries yet')).toBeVisible()
})

test('checks an unusually big amount', async ({ page }) => {
  await addChallenge(page, unique('Typo'))
  await addEntry(page, 'Red Team', 'Ada', 3)
  // the usual amount comes from the totals the Cloud Function adds up
  await expect(total(page)).toHaveText('3', { timeout: 15_000 })

  const amount = page.getByLabel('Amount')
  await amount.fill('40')
  await page.getByRole('button', { name: 'Log 40 for Ada' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText("40? that's loads!")
  await dialog.getByRole('button', { name: 'oops, fix it' }).click()
  await expect(dialog).toBeHidden()
  await expect(amount).toHaveValue('40')

  await page.getByRole('button', { name: 'Log 40 for Ada' }).click()
  await dialog.getByRole('button', { name: 'yes, 40!' }).click()
  await expect(page.locator('.LoggedMoment')).toContainText('+40')
})

test('sets a goal and celebrates reaching it', async ({ page }) => {
  await addChallenge(page, unique('Goals'))
  await addEntry(page, 'Red Team', 'Ada', 6)

  await page.getByRole('button', { name: 'set a goal' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('spinbutton', { name: 'Total Amount' }).fill('10')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('6 / 10')).toBeVisible({ timeout: 15_000 })

  await page.getByLabel('Amount').fill('5')
  await page.getByRole('button', { name: 'Log 5 for Ada' }).click()
  await expect(page.locator('.LoggedMoment')).toContainText('goal reached!')
  await page.locator('.LoggedMoment').click()
  await expect(page.getByText('11 / 10')).toBeVisible({ timeout: 15_000 })
})

test('organisers download results and print certificates', async ({ page }) => {
  const name = unique('Certified')
  await addChallenge(page, name)
  await addEntry(page, 'Red Team', 'Ada', 25)
  await expect(total(page)).toHaveText('25', { timeout: 15_000 })

  await page.getByRole('link', { name: 'Stats' }).click()
  const tools = page.getByRole('region', { name: 'Organiser tools' })
  const download = page.waitForEvent('download')
  await tools.getByRole('button', { name: 'totals (csv)' }).click()
  expect((await download).suggestedFilename()).toBe(`${name} totals.csv`)

  // the dancer picked on this device has their own certificate
  await page.getByRole('link', { name: "Ada's certificate" }).click()
  const certificate = page.locator('.CertificateView')
  await expect(certificate).toContainText('Ada')
  await expect(certificate).toContainText(name)
  await expect(certificate).toContainText('with a total of 25 over 1 entry')
  await expect(certificate.getByRole('button', { name: 'print' })).toBeVisible()

  // and organisers can print everyone's
  await page.goBack()
  await tools.getByRole('link', { name: 'certificates' }).click()
  await expect(certificate.locator('article')).toHaveCount(1)
  await expect(certificate.getByRole('button', { name: 'print' })).toBeVisible()
})
