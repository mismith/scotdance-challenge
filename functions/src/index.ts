import { initializeApp, firestore } from 'firebase-admin';
import * as functions from 'firebase-functions';

const app = initializeApp();
const db = app.firestore();

exports.aggregateStatistics = functions.firestore
  .document('entries/{entryId}')
  .onWrite(({ before, after }) => {
    const { challengeId, groupId, participantId, value } = after.data() || before.data() || {};
    const [totalDiff, countDiff] = (() => {
      let totalDiff;
      let countDiff;

      if (before.exists && after.exists) {
        // handle entry value updates
        const { value: beforeValue } = before.data() || {};
        const { value: afterValue } = after.data() || {};
        totalDiff = (afterValue || 0) - (beforeValue || 0);
        countDiff = 0;
      } else {
        // handle entry creation or deletion
        const sign = !after.exists ? -1 : 1;
        totalDiff = sign * value;
        countDiff = sign * 1;
      }
      return [totalDiff, countDiff];
    })();
    if (!totalDiff && !countDiff) return;

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

    const { challengeId, groupId, participantId } = req.query;
    await Promise.all(toAggregate.reduce(
      (acc, key, i) => acc.concat(toAggregateSnaps[i].docs
        .filter((doc) => {
          if (key === 'challenges' && challengeId) return doc.id === challengeId;
          if (key === 'groups' && groupId) return doc.id === groupId;
          if (key === 'participants' && participantId) return doc.id === participantId;
          return true;
        })
        .map((doc) => transaction.set(doc.ref, {
          $total: firestore.FieldValue.delete(),
          $count: firestore.FieldValue.delete(),
          ...stats[key][doc.id],
        }, { merge: true }))),
      [] as FirebaseFirestore.Transaction[],
    ));

    return res.send(stats);
  });
});
