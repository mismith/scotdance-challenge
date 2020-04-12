import Vue from 'vue';
import Vuex from 'vuex';
import { vuexfireMutations, firestoreAction } from 'vuexfire';
import VuexPersistence from 'vuex-persist';
import { isDebugging, $package } from '@/config';
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

interface State {
  challenges: Challenge[];
  groups: Group[];
  participants: Participant[];
  entries: Entry[];

  challengeId: string;
  groupId: string;
  participantId: string;
}

const vuexLocal = new VuexPersistence<State>({
  key: $package.name,
  reducer: ({ challengeId, groupId, participantId }) => ({
    challengeId,
    groupId,
    participantId,
  }),
});

export default new Vuex.Store<State>({
  state: {
    challenges: [],
    groups: [],
    participants: [],
    entries: [],

    challengeId: '',
    groupId: '',
    participantId: '',
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
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
  },
  mutations: {
    ...vuexfireMutations,

    setChallengeId(state: any, to) {
      const challenge = findByIdKey<Challenge>(state.challenges, to);
      state.challengeId = (challenge && challenge[idKey]) || '';

      if (window.$crisp && challenge) {
        window.$crisp.push(['set', 'session:data', [[['Challenge', challenge.name]]]]);
      }
    },
    setGroupId(state: any, to) {
      const group = findByIdKey<Group>(state.groups, to);
      state.groupId = (group && group[idKey]) || '';

      if (window.$crisp && group) {
        window.$crisp.push(['set', 'session:data', [[['Group', group.name]]]]);
      }
    },
    setParticipantId(state: any, to) {
      const participant = findByIdKey<Participant>(state.participants, to);
      state.participantId = (participant && participant[idKey]) || '';

      if (window.$crisp && participant) {
        window.$crisp.push(['set', 'session:data', [[['Participant', participant.name]]]]);
      }
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
  plugins: [
    vuexLocal.plugin,
  ],
});
