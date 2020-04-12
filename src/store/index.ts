import Vue from 'vue';
import Vuex from 'vuex';
import { vuexfireMutations, firestoreAction } from 'vuexfire';
import { isDebugging } from '@/config';
import {
  firebase,
  firestore,
  firestoreRefs,
  idKey,
  findByIdKey,
  Challenge,
  Group,
  Participant,
  Entry,
} from '@/plugins/firebase';

Vue.use(Vuex);

/* eslint-disable @typescript-eslint/ban-ts-ignore */
export default new Vuex.Store({
  state: {
    challenges: [] as Challenge[],
    groups: [] as Group[],
    participants: [] as Participant[],
    entries: [] as Entry[],
    challengeId: undefined,
  },
  // @ts-ignore
  getters: {
    challenges({ challenges }) {
      if (isDebugging) {
        return [
          {
            [idKey]: 'test_challenge',
            name: 'Test Challenge',
            createdAt: firestore.Timestamp.now(),
          },
          ...challenges,
        ];
      }
      return challenges;
    },
    groups: ({ groups }) => {
      if (isDebugging) {
        return [
          {
            [idKey]: 'test_group',
            challengeId: 'test_challenge',
            name: 'Test Group',
            createdAt: firestore.Timestamp.now(),
          },
          ...groups,
        ];
      }
      return groups;
    },
    participants: ({ participants }) => {
      if (isDebugging) {
        return [
          {
            [idKey]: 'test_participant',
            challengeId: 'test_challenge',
            groupId: 'test_group',
            name: 'Test Participant',
            createdAt: firestore.Timestamp.now(),
          },
          ...participants,
        ];
      }
      return participants;
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

    // @ts-ignore
    challengeId: ({ challengeId }) => challengeId
      // @ts-ignore
      || Vue.localStorage.get('challengeId', '', String),
  },
  mutations: {
    ...vuexfireMutations,

    setChallengeId(state, challengeId) {
      const challenge = findByIdKey(state.challenges, challengeId);
      // @ts-ignore
      state.challengeId = (challenge && challenge[idKey]) || '';
      // @ts-ignore
      Vue.localStorage.set('challengeId', state.challengeId);
    },
  },
  actions: {
    bindChallenges: firestoreAction(({ bindFirestoreRef }, {
      mutateQuery = (query: firebase.firestore.Query) => query,
    } = {}) => {
      const query = firestoreRefs.challenges.orderBy('name');
      return bindFirestoreRef('challenges', mutateQuery(query));
    }),
    bindGroups: firestoreAction(({ bindFirestoreRef }, {
      mutateQuery = (query: firebase.firestore.Query) => query,
    } = {}) => {
      const query = firestoreRefs.groups.orderBy('name');
      return bindFirestoreRef('groups', mutateQuery(query));
    }),
    bindParticipants: firestoreAction(({ bindFirestoreRef }, {
      mutateQuery = (query: firebase.firestore.Query) => query,
    } = {}) => {
      const query = firestoreRefs.participants.orderBy('name');
      return bindFirestoreRef('participants', mutateQuery(query));
    }),
    bindEntries: firestoreAction(({ bindFirestoreRef }, {
      mutateQuery = (query: firebase.firestore.Query) => query,
      limit = 50,
    } = {}) => {
      const query = firestoreRefs.entries.orderBy('createdAt', 'desc').limit(limit);
      return bindFirestoreRef('entries', mutateQuery(query));
    }),
  },
});
