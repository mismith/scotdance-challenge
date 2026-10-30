import { addChallenge, addEntry, expect, picker, test, unique } from './helpers'

// what the Vue 2 app left in people's browsers: vuex-persist state, then vue-localstorage prefs
test('picks up where the old app left off', async ({ page, browser, baseURL }) => {
  const name = unique('Legacy')
  await addChallenge(page, name, { isPrivate: true })
  await addEntry(page, 'Red Team', 'Ada', 30)
  await addEntry(page, 'Blue Team', 'Ben', 10)
  const { challengeId, groupId, participantId } = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('scotdance-challenge')!),
  )

  const context = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseURL!,
          localStorage: [
            {
              name: 'scotdance-challenge',
              value: JSON.stringify({
                privateIds: [challengeId],
                challengeId,
                groupId,
                participantId,
              }),
            },
            { name: 'scotdance-challenge.currentSlideIndex', value: '3' },
            { name: 'scotdance-challenge.filterDataBySearch', value: '"ben"' },
            { name: 'scotdance-challenge.filterDataByGroupIds', value: '[]' },
            { name: 'scotdance-challenge.orderDataById', value: 'name' },
          ],
        },
      ],
    },
  })
  const other = await context.newPage()

  // the private challenge is still unlocked, with the same selections
  await other.goto('/new')
  await expect(picker(other, 'Challenge')).toContainText(name)
  await expect(picker(other, 'Group')).toContainText('Blue Team')
  await expect(picker(other, 'Participant')).toContainText('Ben')

  // stats open on the same slide, filtered the same way
  await other.getByRole('link', { name: /Stats/ }).click()
  const rows = other.locator('.v-window-item--active tbody tr')
  await expect(rows).toHaveCount(1, { timeout: 15_000 })
  await expect(rows.nth(0)).toContainText('Ben')
  await context.close()
})
