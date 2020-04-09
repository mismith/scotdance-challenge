import { initializeApp } from 'firebase-admin';
import { firestore } from 'firebase-functions';

const app = initializeApp();
const db = app.firestore();

exports.aggregateEntriesByParticipant = firestore
  .document('entries/{entryId}')
  .onWrite(({ before, after }) => {
    const { challengeId, groupId, participantId, value } = after.data() || before.data() || {};
    const sign = !after.exists ? -1 : 1;
    const totalDiff = sign * value;
    const countDiff = sign * 1;

    const challengeRef = db.collection('challenges').doc(challengeId);
    const groupRef = db.collection('groups').doc(groupId);
    const participantRef = db.collection('participants').doc(participantId);
    const refs = [challengeRef, groupRef, participantRef];

    return db.runTransaction(async (transaction) => {
      // all reads must come before writes within a transaction
      const docs = await Promise.all(refs.map((ref) => transaction.get(ref)))
      return Promise.all(docs.map((doc, i) => {
        const { $total = 0, $count = 0 } = doc.data() || {};
        return transaction.set(refs[i], {
          $total: $total + totalDiff,
          $count: $count + countDiff,
        }, { merge: true });
      }));
    });
  });
