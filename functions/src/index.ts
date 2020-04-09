import { initializeApp } from 'firebase-admin';
import { firestore } from 'firebase-functions';

const app = initializeApp();
const db = app.firestore();

function getValues(data: FirebaseFirestore.DocumentData | undefined) {
  const { total = 0, count = 0 } = data || {};
  return { total, count };
}
function aggregateTransaction(
  targetRef: FirebaseFirestore.DocumentReference,
  totalDiff: number = 0,
  countDiff: number = 1,
) {
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(targetRef);
    const { total, count } = getValues(doc.data());
    return transaction.set(targetRef, {
      total: total + totalDiff,
      count: count + countDiff,
    }, { merge: true });
  });
}

exports.aggregateEntriesByParticipant = firestore
  .document('entries/{entryId}')
  .onWrite(({ before, after }) => {
    const { challengeId, groupId, participantId, value } = after.data() || before.data() || {};
    const sign = !after.exists ? -1 : 1;

    const ref = db
      .collection('statistics').doc(challengeId)
      .collection('groups').doc(groupId)
      .collection('participants').doc(participantId);
    return aggregateTransaction(ref, sign * value, sign * 1);
  });

exports.aggregateParticipantsByGroup = firestore
  .document('statistics/{challengeId}/groups/{groupId}/participants/{participantId}')
  .onWrite(({ before, after }, ctx) => {
    const { challengeId, groupId } = ctx.params;
    const { total: totalBefore, count: countBefore } = getValues(before.data());
    const { total: totalAfter, count: countAfter } = getValues(after.data());
    const totalDiff = totalAfter - totalBefore;
    const countDiff = countAfter - countBefore;

    const ref = db
      .collection('statistics').doc(challengeId)
      .collection('groups').doc(groupId);
    return aggregateTransaction(ref, totalDiff, countDiff);
  });

exports.aggregateGroupsByChallenge = firestore
  .document('statistics/{challengeId}/groups/{groupId}')
  .onWrite(({ before, after }, ctx) => {
    const { challengeId } = ctx.params;
    const { total: totalBefore, count: countBefore } = getValues(before.data());
    const { total: totalAfter, count: countAfter } = getValues(after.data());
    const totalDiff = totalAfter - totalBefore;
    const countDiff = countAfter - countBefore;

    const ref = db.collection('statistics').doc(challengeId);
    return aggregateTransaction(ref, totalDiff, countDiff);
  });
