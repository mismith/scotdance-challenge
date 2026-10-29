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

/** The whole picker field, which shows the selection apart from its (search) input */
export function picker(page: Page, label: string) {
  return page.locator('.v-autocomplete', { has: page.getByRole('combobox', { name: label }) })
}

/** Type a new name into a picker and pick its `Add "…"` option */
async function addViaPicker(page: Page, label: string, name: string) {
  const picker = page.getByRole('combobox', { name: label })
  await picker.click()
  await picker.fill(name)
  await page.getByRole('option', { name: `Add "${name}"` }).click()
}

export async function addChallenge(page: Page, name: string) {
  await page.goto('/new')
  await addViaPicker(page, 'Challenge', name)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Add Challenge')).toBeVisible()
  await expect(dialog.getByLabel('Name *')).toHaveValue(name)
  await dialog.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByRole('combobox', { name: 'Group' })).toBeEnabled()
}

/** Pick an existing option by name, or add it; returns whether it was added */
async function pick(page: Page, label: string, name: string) {
  const field = page.getByRole('combobox', { name: label })
  await field.click()
  await field.fill(name)
  const option = page.getByRole('option', { name: new RegExp(`^(Add "${name}"|${name})$`) })
  await expect(option).toBeVisible()
  const isNew = (await option.innerText()).startsWith('Add "')
  await option.click()
  return isNew
}

export async function addEntry(page: Page, group: string, participant: string, amount: number) {
  await page.goto('/new')

  if (await pick(page, 'Group', group)) {
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Add Group')).toBeVisible()
    await dialog.getByRole('button', { name: 'Add' }).click()
  }
  await expect(picker(page, 'Group')).toContainText(group)

  await pick(page, 'Participant', participant)
  await expect(picker(page, 'Participant')).toContainText(participant)

  await page.getByLabel('Amount').fill(String(amount))
  await page.getByRole('button', { name: 'Submit' }).click()
  // a compliment pops up once the entry is saved
  await expect(page.locator('.v-snackbar')).toContainText('!')
  await expect(page.getByLabel('Amount')).toHaveValue('')
}
