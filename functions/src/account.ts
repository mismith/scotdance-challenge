import type { Auth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'
import { SERVICES, verifyService } from './service'

// Deleting a ScotDance.app account here: the sign-in goes and the person's name is taken off what they made.
// What they made stays (challenges, groups, participants, entries), so other people's history is not broken.

/** Where ScotDance.app's server calls deleteScotDanceAccount: the audience of its service proof. */
export const DELETE_ACCOUNT_AUDIENCE =
  'https://us-central1-scotdance-challenge.cloudfunctions.net/deleteScotDanceAccount'

/** Collections whose documents say who made them. */
const CREATED_BY = [
  'challenges',
  'groups',
  'participants',
  'entries',
  'flags',
  'complimentsSubmitted',
]
/** Collections whose documents also say who last changed them. */
const UPDATED_BY = ['challenges', 'groups', 'participants', 'entries', 'flags']

/** The checked body of a deletion call: the ScotDance.app uid (no `sd_`) and when it was deleted. */
export async function deleteAccountRequest(data: any, emulator: boolean) {
  await verifyService(data?.service, DELETE_ACCOUNT_AUDIENCE, [SERVICES.hub], emulator)
  const { uid, deletedAt } = data
  if (typeof uid !== 'string' || !uid || uid.length > 200 || uid.includes('/'))
    throw new Error('Invalid uid')
  if (typeof deletedAt !== 'number' || !Number.isFinite(deletedAt))
    throw new Error('Invalid deletedAt')
  return { uid, deletedAt }
}

/** Run the writes in batches (a batch holds 500). */
async function inBatches(
  db: Firestore,
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  write: (
    batch: FirebaseFirestore.WriteBatch,
    doc: FirebaseFirestore.QueryDocumentSnapshot,
  ) => void,
) {
  for (let i = 0; i < docs.length; i += 500) {
    const batch = db.batch()
    docs.slice(i, i + 500).forEach((doc) => write(batch, doc))
    await batch.commit()
  }
}

/**
 * Remove an account's sign-in and its name from what it made. `uid` is the Challenge uid (`sd_<ScotDance.app uid>`).
 * Every step is safe to run again, so a crash halfway is finished by the next call.
 */
export async function deleteChallengeAccount(
  db: Firestore,
  auth: Pick<Auth, 'deleteUser'>,
  uid: string,
  deletedAt: number,
) {
  const tombstone = db.collection('deletedAccounts').doc(uid)
  const existing = await tombstone.get()
  if (existing.exists && existing.data()?.state === 'complete') return
  // first, so sign-in is refused from now on, even if the rest takes a few tries
  await tombstone.set({ state: 'pending', deletedAt: existing.data()?.deletedAt ?? deletedAt })

  for (const field of ['createdBy', 'updatedBy'] as const) {
    for (const collection of field === 'createdBy' ? CREATED_BY : UPDATED_BY) {
      const snapshot = await db.collection(collection).where(field, '==', uid).get()
      // their own compliments still waiting for a moderator go; the rest only lose their author
      const remove = (doc: FirebaseFirestore.QueryDocumentSnapshot) =>
        collection === 'complimentsSubmitted' && (doc.data().status ?? 'pending') === 'pending'
      await inBatches(db, snapshot.docs, (batch, doc) =>
        remove(doc) ? batch.delete(doc.ref) : batch.update(doc.ref, { [field]: null }),
      )
    }
  }

  try {
    await auth.deleteUser(uid)
  } catch (error: any) {
    if (error?.code !== 'auth/user-not-found') throw error
  }
  await tombstone.set({ state: 'complete' }, { merge: true })
}

/** Whether this account was deleted (or is being): it may not sign in again. */
export async function isDeleted(db: Firestore, uid: string) {
  return (await db.collection('deletedAccounts').doc(uid).get()).exists
}
