import { initializeApp, firestore } from 'firebase-admin';
import * as functions from 'firebase-functions';

const app = initializeApp();
const db = app.firestore();

exports.aggregateStatistics = functions.firestore
  .document('entries/{entryId}')
  .onWrite(({ before, after }) => {
    if (before.exists && after.exists) return; // skip updates // @TODO: what if value changes

    const { challengeId, groupId, participantId, value } = after.data() || before.data() || {};
    const sign = !after.exists ? -1 : 1;
    const totalDiff = sign * value;
    const countDiff = sign * 1;

    return db.runTransaction(async (transaction) => {
      const challengeRef = db.collection('challenges').doc(challengeId);
      const groupRef = db.collection('groups').doc(groupId);
      const participantRef = db.collection('participants').doc(participantId);
      const refs = [challengeRef, groupRef, participantRef];

      // all reads must come before writes within a transaction
      const docs = await Promise.all(refs.map((ref) => transaction.get(ref)));

      return Promise.all(docs.map((doc, i) => {
        const { $total = 0, $count = 0 } = doc.data() || {};
        return transaction.set(refs[i], {
          $total: $total + totalDiff,
          $count: $count + countDiff,
        }, { merge: true });
      }));
    });
  });

interface Tally {
  $total: number;
  $count: number;
}
interface CollectionTally {
  [id: string]: Tally;
}
function tally(collection: CollectionTally, id: string, value: number) {
  collection[id] = collection[id] || { $total: 0, $count: 0 };
  collection[id].$total += value;
  collection[id].$count += 1;
}
exports.syncAggregateStatistics = functions.https.onRequest((req, res) => {
  return db.runTransaction(async (transaction) => {
    const toAggregate = ['challenges', 'groups', 'participants'];
    const [entriesSnap, ...toAggregateSnaps] = await Promise.all([
      transaction.get(db.collection('entries')),
      ...toAggregate.map((key) => transaction.get(db.collection(key))),
    ]);
    const entries = entriesSnap.docs.map((doc) => doc.data());

    const stats: { [collection: string]: CollectionTally } = toAggregate.reduce((acc, key) => ({
      ...acc,
      [key]: {},
    }), {});
    entries.map(({ challengeId, groupId, participantId, value }) => {
      tally(stats.challenges, challengeId, value);
      tally(stats.groups, groupId, value);
      tally(stats.participants, participantId, value);
    });

    await Promise.all(toAggregate.reduce(
      (acc, key, i) => acc.concat(toAggregateSnaps[i].docs.map((doc) => transaction.set(doc.ref, {
        $total: firestore.FieldValue.delete(),
        $count: firestore.FieldValue.delete(),
        ...stats[key][doc.id],
      }, { merge: true }))),
      [] as FirebaseFirestore.Transaction[],
    ));

    return res.send(stats);
  });
});
