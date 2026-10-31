// One-off, before deploying the rules that hide private challenges (see README: Deploy):
// - marks challenges without a `private` flag as public, so they stay listed
// - seeds compliments/approved with the bundled compliments, so submissions are checked against them
//
// Uses Application Default Credentials (`gcloud auth application-default login`).
//   node functions/scripts/backfill.mjs            # dry run
//   node functions/scripts/backfill.mjs --write
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { initializeApp } = require('firebase-admin/app')
const { FieldValue, getFirestore } = require('firebase-admin/firestore')

const isWriting = process.argv.includes('--write')
const db = getFirestore(initializeApp({ projectId: 'scotdance-challenge' }))

const challenges = await db.collection('challenges').get()
const unflagged = challenges.docs.filter((doc) => typeof doc.get('private') !== 'boolean')
console.log(`${unflagged.length} of ${challenges.size} challenges need private: false`)
for (const doc of unflagged) console.log(`  ${doc.id}  ${doc.get('name')}`)

const { default: compliments } = await import('../../src/lib/compliments.ts')
console.log(`${compliments.length} bundled compliments to seed`)

if (isWriting) {
  for (let i = 0; i < unflagged.length; i += 500) {
    const batch = db.batch()
    unflagged.slice(i, i + 500).forEach((doc) => batch.update(doc.ref, { private: false }))
    await batch.commit()
  }
  await db
    .collection('compliments')
    .doc('approved')
    .set({ texts: FieldValue.arrayUnion(...compliments) }, { merge: true })
  console.log('Done')
} else {
  console.log('Dry run: add --write to save')
}
