import { type Page, expect, test as base } from '@playwright/test'

// every test gets its own browser context, so its own anonymous user
export const test = base.extend({
  page: async ({ page }, use) => {
    // keep live chat and IP lookups out of test runs
    await page.route(/client\.crisp\.chat|api\.ipdata\.co/, (route) => route.abort())
    await use(page)
  },
})
export { expect }

// names are Title Case, as the app capitalizes new names
export const unique = (name: string) => `${name} ${Math.floor(Math.random() * 1e6)}`

/** `yyyy-MM-dd`, as date inputs take it, some days from today */
export function dateFromToday(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The open challenge's total, as the Cloud Function aggregates it */
export function total(page: Page) {
  return page.getByTestId('challenge-total')
}

/** Start a challenge from Explore; listed ones (`isPrivate: false`) need an end date */
export async function addChallenge(page: Page, name: string, { isPrivate = false } = {}) {
  await page.goto('/')
  await page.getByRole('button', { name: /start your own challenge/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('New challenge')).toBeVisible()
  await dialog.getByLabel('Name').fill(name)
  if (!isPrivate) {
    await dialog.getByRole('radio', { name: /^Everyone/ }).check()
    await dialog.getByLabel(/^Ends/).fill(dateFromToday(30))
  }
  await dialog.getByRole('button', { name: 'Create + get the link' }).click()
  // a new challenge shows its Access Link straight away
  await page.getByRole('button', { name: 'Got It' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Group' })).toBeEnabled()
}

/** Pick an existing option by name, or add it; returns whether it was added */
async function pick(page: Page, label: string, name: string) {
  const field = page.getByRole('combobox', { name: label })
  await field.click()
  await field.fill(name)
  const option = page.getByRole('option', {
    name: new RegExp(`^(add “${name}”( to .+)?|${name})$`),
  })
  await expect(option).toBeVisible()
  const isNew = (await option.innerText()).startsWith('add “')
  await option.click()
  return isNew
}

export async function addEntry(page: Page, group: string, participant: string, amount: number) {
  await page.goto('/new')

  if (await pick(page, 'Group', group)) {
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Add group')).toBeVisible()
    await dialog.getByRole('button', { name: 'Add', exact: true }).click()
  }
  await expect(page.getByRole('combobox', { name: 'Group' })).toHaveValue(group)

  await pick(page, 'Dancer', participant)
  await expect(page.getByRole('combobox', { name: 'Dancer' })).toHaveValue(participant)

  await page.getByLabel('Amount').fill(String(amount))
  await page
    .getByRole('button', { name: `Log ${amount.toLocaleString()} for ${participant}` })
    .click()
  // the amount and a compliment take over the screen once the entry is saved
  const moment = page.locator('.LoggedMoment')
  await expect(moment).toContainText(`+${amount.toLocaleString()}`)
  await expect(moment).toContainText(`${participant} just logged`)
  await moment.click()
  await expect(page.getByLabel('Amount')).toHaveValue('')
}
