import Vue from 'vue';
import Vuex from 'vuex';
import { vuexfireMutations, firestoreAction } from 'vuexfire';
import {
  firestore,
  firestoreRefs,
  idKey,
  Challenge,
  Entry,
} from '@/plugins/firebase';

Vue.use(Vuex);

const isDebugging = window.location.hostname === 'localhost';

export default new Vuex.Store({
  state: {
    challenges: [] as Challenge[],
    entries: [] as Entry[],
  },
  getters: {
    challenges: ({ challenges }) => {
      if (isDebugging) {
        return [
          {
            [idKey]: 'test_challenge',
            name: 'Test',
          },
          ...challenges,
        ];
      }
      return challenges;
    },
    entries: ({ entries }) => {
      if (isDebugging) {
        return [
          {
            [idKey]: 'test_entry',
            challengeId: 'test_challenge',
            groupId: 'test_group',
            participantId: 'test_participant',
            value: 1000,
            createdAt: firestore.Timestamp.now(),
          },
          ...entries,
        ];
      }
      return entries;
    },
  },
  mutations: {
    ...vuexfireMutations,
  },
  actions: {
    bindChallenges: firestoreAction(({ bindFirestoreRef }) => {
      const query = firestoreRefs.challenges.orderBy('name');
      return bindFirestoreRef('challenges', query);
    }),
    bindEntries: firestoreAction(({ bindFirestoreRef }, { challengeId, limit = 50 } = {}) => {
      let query = firestoreRefs.entries.orderBy('createdAt', 'desc').limit(limit);
      if (challengeId) {
        query = query.where('challengeId', '==', challengeId);
      }
      return bindFirestoreRef('entries', query);
    }),
  },
});
