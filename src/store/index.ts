import Vue from 'vue';
import Vuex from 'vuex';
import { vuexfireMutations, firestoreAction } from 'vuexfire';
import VuexPersistence from 'vuex-persist';
import { $package } from '@/config';
import { getEmojiFlag } from '@/services/country';
import {
  firebase,
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
      return challenges;
    },
    groups({ groups }) {
      return groups.map((item) => {
        // eslint-disable-next-line no-param-reassign
        item.$name = `${item.name}${item.country ? ` ${getEmojiFlag(item.country)}` : ''}`;

        return item;
      });
    },
    participants({ participants }, { groups }) {
      return participants.map((item) => {
        // eslint-disable-next-line no-param-reassign
        item.$group = findByIdKey(groups, item.groupId);
        // eslint-disable-next-line no-param-reassign
        item.$name = item.$group && item.$group.country
          ? `${item.name} ${getEmojiFlag(item.$group.country)}`
          : item.name;
        return item;
      });
    },
    entries({ entries }) {
      return entries;
    },
  },
  mutations: {
    ...vuexfireMutations,

    setChallengeId(state, to) {
      const challenge = findByIdKey<Challenge>(state.challenges, to);
      state.challengeId = (challenge && challenge[idKey]) || '';

      if (window.$crisp && challenge) {
        window.$crisp.push(['set', 'session:data', [[['Challenge', challenge.name]]]]);
      }
    },
    setGroupId(state, to) {
      const group = findByIdKey<Group>(state.groups, to);
      state.groupId = (group && group[idKey]) || '';

      if (window.$crisp && group) {
        window.$crisp.push(['set', 'session:data', [[['Group', group.name]]]]);
      }
    },
    setParticipantId(state, to) {
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
