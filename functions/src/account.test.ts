import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DELETE_ACCOUNT_AUDIENCE,
  deleteAccountRequest,
  deleteChallengeAccount,
  isDeleted,
} from './account'
import { SERVICES, serviceToken } from './service'
import { firestore } from './testStore'

const ME = 'sd_abc'
const world = () => ({
  'challenges/c1': { name: 'Mine', createdBy: ME, updatedBy: 'sd_other' },
  'challenges/c2': { name: 'Theirs', createdBy: 'sd_other', updatedBy: ME },
  'groups/g1': { name: 'G', createdBy: ME, updatedBy: ME },
  'participants/p1': { name: 'Kid', createdBy: ME },
  'participants/p2': { name: 'Other kid', createdBy: 'sd_other' },
  'entries/e1': { value: 5, createdBy: ME },
  'entries/e2': { value: 7, createdBy: 'sd_other', updatedBy: 'sd_other' },
  'flags/f1': { status: 'open', createdBy: ME },
  'complimentsSubmitted/s1': { text: 'pending', status: 'pending', createdBy: ME },
  'complimentsSubmitted/s2': { text: 'fresh', createdBy: ME },
  'complimentsSubmitted/s3': { text: 'approved', status: 'approved', createdBy: ME },
  'complimentsSubmitted/s4': { text: 'someone elses', status: 'pending', createdBy: 'sd_other' },
  'compliments/approved': { texts: ['approved'] },
})
const auth = () => {
  const deleted: string[] = []
  return { deleted, deleteUser: async (uid: string) => void deleted.push(uid) }
}

test('author fields are cleared and content is kept', async () => {
  const { db, data } = firestore(world())
  await deleteChallengeAccount(db, auth(), ME, 1000)
  assert.deepEqual(data.get('challenges/c1'), {
    name: 'Mine',
    createdBy: null,
    updatedBy: 'sd_other',
  })
  assert.deepEqual(data.get('challenges/c2'), {
    name: 'Theirs',
    createdBy: 'sd_other',
    updatedBy: null,
  })
  assert.deepEqual(data.get('groups/g1'), { name: 'G', createdBy: null, updatedBy: null })
  assert.deepEqual(data.get('participants/p1'), { name: 'Kid', createdBy: null })
  assert.deepEqual(data.get('entries/e1'), { value: 5, createdBy: null })
  assert.deepEqual(data.get('flags/f1'), { status: 'open', createdBy: null })
})

test("another person's documents are untouched", async () => {
  const { db, data } = firestore(world())
  await deleteChallengeAccount(db, auth(), ME, 1000)
  assert.deepEqual(data.get('participants/p2'), { name: 'Other kid', createdBy: 'sd_other' })
  assert.deepEqual(data.get('entries/e2'), {
    value: 7,
    createdBy: 'sd_other',
    updatedBy: 'sd_other',
  })
  assert.equal(data.has('complimentsSubmitted/s4'), true)
})

test('pending compliment submissions go, moderated ones stay without an author', async () => {
  const { db, data } = firestore(world())
  await deleteChallengeAccount(db, auth(), ME, 1000)
  assert.equal(data.has('complimentsSubmitted/s1'), false)
  assert.equal(data.has('complimentsSubmitted/s2'), false)
  assert.deepEqual(data.get('complimentsSubmitted/s3'), {
    text: 'approved',
    status: 'approved',
    createdBy: null,
  })
  assert.deepEqual(data.get('compliments/approved'), { texts: ['approved'] })
})

test('the auth user is deleted and the tombstone completed; a missing user is fine', async () => {
  const { db, data } = firestore(world())
  const a = auth()
  await deleteChallengeAccount(db, a, ME, 1000)
  assert.deepEqual(a.deleted, [ME])
  assert.deepEqual(data.get(`deletedAccounts/${ME}`), { state: 'complete', deletedAt: 1000 })
  const gone = {
    deleteUser: async () =>
      Promise.reject(Object.assign(new Error('x'), { code: 'auth/user-not-found' })),
  }
  await deleteChallengeAccount(firestore(world()).db, gone, ME, 1)
})

test('a repeat after completion does nothing', async () => {
  const { db, data } = firestore(world())
  await deleteChallengeAccount(db, auth(), ME, 1000)
  data.set('entries/e3', { value: 1, createdBy: ME })
  const a = auth()
  await deleteChallengeAccount(db, a, ME, 2000)
  assert.deepEqual(a.deleted, [])
  assert.equal(data.get('entries/e3')!.createdBy, ME)
  assert.equal(data.get(`deletedAccounts/${ME}`)!.deletedAt, 1000)
})

test('a crash midway is finished by the next call', async () => {
  const { db, data } = firestore(world())
  const broken = { deleteUser: async () => Promise.reject(new Error('boom')) }
  await assert.rejects(deleteChallengeAccount(db, broken, ME, 1000), /boom/)
  assert.deepEqual(data.get(`deletedAccounts/${ME}`), { state: 'pending', deletedAt: 1000 })
  assert.equal(await isDeleted(db, ME), true)
  const a = auth()
  await deleteChallengeAccount(db, a, ME, 5000)
  assert.deepEqual(a.deleted, [ME])
  assert.deepEqual(data.get(`deletedAccounts/${ME}`), { state: 'complete', deletedAt: 1000 })
  assert.equal(data.get('entries/e1')!.createdBy, null)
})

test('a tombstone means sign-in is refused; no tombstone means allowed', async () => {
  const { db } = firestore({ [`deletedAccounts/${ME}`]: { state: 'pending', deletedAt: 1 } })
  assert.equal(await isDeleted(db, ME), true)
  assert.equal(await isDeleted(db, 'sd_someoneelse'), false)
})

test('the receiver accepts the hub with a good body', async () => {
  const service = await serviceToken(DELETE_ACCOUNT_AUDIENCE, SERVICES.hub, true)
  assert.deepEqual(await deleteAccountRequest({ service, uid: 'abc', deletedAt: 12 }, true), {
    uid: 'abc',
    deletedAt: 12,
  })
})

test('the receiver refuses an unknown service, another audience, and no proof', async () => {
  const other = await serviceToken(DELETE_ACCOUNT_AUDIENCE, SERVICES.entries, true)
  await assert.rejects(
    deleteAccountRequest({ service: other, uid: 'abc', deletedAt: 1 }, true),
    /Unknown service/,
  )
  const wrong = await serviceToken('https://example.com/other', SERVICES.hub, true)
  await assert.rejects(
    deleteAccountRequest({ service: wrong, uid: 'abc', deletedAt: 1 }, true),
    /elsewhere/,
  )
  await assert.rejects(
    deleteAccountRequest({ uid: 'abc', deletedAt: 1 }, true),
    /Service proof required/,
  )
})

test('the receiver refuses a bad uid or deletedAt', async () => {
  const service = await serviceToken(DELETE_ACCOUNT_AUDIENCE, SERVICES.hub, true)
  for (const uid of [undefined, '', 5, 'a/b', 'x'.repeat(201)])
    await assert.rejects(deleteAccountRequest({ service, uid, deletedAt: 1 }, true), /Invalid uid/)
  for (const deletedAt of [undefined, '5', NaN, Infinity])
    await assert.rejects(
      deleteAccountRequest({ service, uid: 'abc', deletedAt }, true),
      /Invalid deletedAt/,
    )
})
