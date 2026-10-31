import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'
import { moderateCompliment, onComplimentSubmitted } from './compliments'
import { adminEmailsSecret, getAdminEmails } from './email'
import { onFlagCreated } from './flags'
import { verifyPass } from './pass'

const app = initializeApp()
const db = getFirestore(app)

exports.aggregateStatistics = onDocumentWritten('entries/{entryId}', (event) => {
    const { before, after } = event.data!
    const { challengeId, groupId, participantId, value } = after.data() || before.data() || {}
    const [totalDiff, countDiff] = (() => {
      let totalDiff
      let countDiff

      if (before.exists && after.exists) {
        // handle entry value updates
        const { value: beforeValue } = before.data() || {}
        const { value: afterValue } = after.data() || {}
        totalDiff = (afterValue || 0) - (beforeValue || 0)
        countDiff = 0
      } else {
        // handle entry creation or deletion
        const sign = !after.exists ? -1 : 1
        totalDiff = sign * value
        countDiff = sign * 1
      }
      return [totalDiff, countDiff]
    })()
    if (!totalDiff && !countDiff) return
    // when the challenge last saw a new entry, so Explore can hide dormant ones
    const createdAt: Timestamp | undefined = !before.exists ? after.data()?.createdAt : undefined

    return db.runTransaction(async (transaction) => {
      const challengeRef = db.collection('challenges').doc(challengeId)
      const groupRef = db.collection('groups').doc(groupId)
      const participantRef = db.collection('participants').doc(participantId)
      const refs = [challengeRef, groupRef, participantRef]

      // all reads must come before writes within a transaction
      const docs = await Promise.all(refs.map((ref) => transaction.get(ref)))

      // a participant's first entry (or last deleted one) changes the challenge's dancer count
      const participantCount = docs[2].data()?.$count ?? 0
      const dancersDiff =
        participantCount <= 0 && participantCount + countDiff > 0 ? 1
          : participantCount > 0 && participantCount + countDiff <= 0 ? -1
            : 0

      return Promise.all(docs.map((doc, i) => {
        const { $total = 0, $count = 0, $dancers = 0, $lastEntryAt } = doc.data() || {}
        const stats: Record<string, unknown> = {
          $total: $total + totalDiff,
          $count: $count + countDiff,
        }
        if (i === 0) {
          if (dancersDiff) stats.$dancers = $dancers + dancersDiff
          if (createdAt && (!$lastEntryAt || createdAt > $lastEntryAt)) stats.$lastEntryAt = createdAt
        }
        return transaction.set(refs[i], stats, { merge: true })
      }))
    })
  })

interface Tally {
  $total: number;
  $count: number;
  $dancers?: number;
  $lastEntryAt?: Timestamp;
}
interface CollectionTally {
  [id: string]: Tally;
}
function tally(collection: CollectionTally, id: string, value: number) {
  collection[id] = collection[id] || { $total: 0, $count: 0 }
  collection[id].$total += value
  collection[id].$count += 1
}
exports.syncAggregateStatistics = onRequest((req, res) => {
  return db.runTransaction(async (transaction) => {
    const toAggregate = ['challenges', 'groups', 'participants']
    const [entriesSnap, ...toAggregateSnaps] = await Promise.all([
      transaction.get(db.collection('entries')),
      ...toAggregate.map((key) => transaction.get(db.collection(key))),
    ])
    const entries = entriesSnap.docs.map((doc) => doc.data())

    const stats: { [collection: string]: CollectionTally } = toAggregate.reduce((acc, key) => ({
      ...acc,
      [key]: {},
    }), {})
    const dancers: { [challengeId: string]: Set<string> } = {}
    entries.map(({ challengeId, groupId, participantId, value, createdAt }) => {
      tally(stats.challenges, challengeId, value)
      tally(stats.groups, groupId, value)
      tally(stats.participants, participantId, value)
      ;(dancers[challengeId] ||= new Set()).add(participantId)
      const challenge = stats.challenges[challengeId]
      if (createdAt && (!challenge.$lastEntryAt || createdAt > challenge.$lastEntryAt)) {
        challenge.$lastEntryAt = createdAt
      }
    })
    Object.entries(dancers).forEach(([id, ids]) => (stats.challenges[id].$dancers = ids.size))

    const { challengeId, groupId, participantId } = req.query
    await Promise.all(toAggregate.reduce(
      (acc, key, i) => acc.concat(toAggregateSnaps[i].docs
        .filter((doc) => {
          if (key === 'challenges' && challengeId) return doc.id === challengeId
          if (key === 'groups' && groupId) return doc.id === groupId
          if (key === 'participants' && participantId) return doc.id === participantId
          return true
        })
        .map((doc) => transaction.set(doc.ref, stats[key][doc.id] ?? {}, { merge: true }))),
      [] as FirebaseFirestore.Transaction[],
    ))

    return res.send(stats)
  }) as any
})

const toolPassSecret = defineSecret('TOOL_PASS_SECRET')

/** Keep the account's email and name on its Auth user, not in (publicly readable) Firestore */
async function upsertUser(uid: string, email: string, displayName: string | null) {
  const auth = getAuth(app)
  const update = async (withEmail: boolean) => {
    const props = { displayName, ...(withEmail && email ? { email } : {}) }
    try {
      await auth.updateUser(uid, props)
    } catch (error: any) {
      if (error?.code !== 'auth/user-not-found') throw error
      // createUser rejects a null name (updateUser takes it to clear one)
      await auth.createUser({ uid, ...props, displayName: displayName ?? undefined })
    }
  }
  try {
    await update(true)
  } catch (error: any) {
    // another account in this project already has that email; keep the name only
    if (error?.code !== 'auth/email-already-exists') throw error
    await update(false)
  }
}

/** Hand everything an anonymous user created over to their account */
async function moveCreatedBy(fromUid: string, toUid: string) {
  let moved = 0
  for (const collection of ['entries', 'participants', 'groups', 'challenges']) {
    const snapshot = await db.collection(collection).where('createdBy', '==', fromUid).get()
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      const batch = db.batch()
      snapshot.docs.slice(i, i + 500).forEach((doc) => batch.update(doc.ref, { createdBy: toUid }))
      await batch.commit()
    }
    if (collection === 'entries') moved = snapshot.size
  }
  return moved
}

exports.signInWithScotDance = onCall({ secrets: [toolPassSecret, adminEmailsSecret] }, async (request) => {
  let pass
  try {
    pass = verifyPass(request.data?.pass, toolPassSecret.value())
  } catch (error) {
    throw new HttpsError('unauthenticated', `Invalid pass: ${(error as Error).message}`)
  }

  const uid = `sd_${pass.sub}`
  await upsertUser(uid, pass.email, pass.name ?? null)
  // admins can see and fix everything (see firestore.rules)
  const isAdmin = Boolean(pass.email) && getAdminEmails().includes(pass.email.toLowerCase())
  await getAuth(app).setCustomUserClaims(uid, isAdmin ? { admin: true } : null)

  const caller = request.auth
  const isAnonymous = caller?.token.firebase?.sign_in_provider === 'anonymous'
  const movedEntries = caller && isAnonymous && caller.uid !== uid
    ? await moveCreatedBy(caller.uid, uid)
    : 0

  const token = await getAuth(app).createCustomToken(uid)
  return { token, movedEntries }
})

/** Who made what, for admins: names and emails stay on Auth users, never in Firestore */
exports.describeUsers = onCall(async (request) => {
  if (request.auth?.token.admin !== true) throw new HttpsError('permission-denied', 'Admins only')
  const uids = (Array.isArray(request.data?.uids) ? request.data.uids : [])
    .filter((uid: unknown): uid is string => typeof uid === 'string')
    .slice(0, 100)
  const { users } = await getAuth(app).getUsers(uids.map((uid: string) => ({ uid })))
  const names: Record<string, string> = {}
  for (const uid of uids) {
    const user = users.find((user) => user.uid === uid)
    names[uid] = user?.displayName || user?.email || `Anonymous ${uid.slice(0, 6)}`
  }
  return names
})

exports.onFlagCreated = onFlagCreated
exports.onComplimentSubmitted = onComplimentSubmitted
exports.moderateCompliment = moderateCompliment
