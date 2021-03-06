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

export interface State {
  challenges: Challenge[];
  groups: Group[];
  participants: Participant[];
  entries: Entry[];

  privateIds: string[];
  isPrivateDialogOpen: boolean;
  isInfoDialogOpen: boolean;

  challengeId: string;
  groupId: string;
  participantId: string;

  labels: {
    Challenge: string;
    Group: string;
    Participant: string;
    Entry: string;
    EntryUnit: string;
    Country: string;
  };
}

const vuexLocal = new VuexPersistence<State>({
  key: $package.name,
  reducer: ({
    privateIds,
    challengeId,
    groupId,
    participantId,
  }) => ({
    privateIds,
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

    privateIds: [],
    isPrivateDialogOpen: false,
    isInfoDialogOpen: false,

    challengeId: '',
    groupId: '',
    participantId: '',

    labels: {
      Challenge: 'Challenge',
      Group: 'Group',
      Participant: 'Participant',
      Entry: 'Entry',
      EntryUnit: '',
      Country: 'Country',
    },
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  getters: {
    /* eslint-disable no-param-reassign */
    challenges({ challenges, privateIds }) {
      return challenges
        .filter(({ [idKey]: challengeId, private: isPrivate }) => {
          if (isPrivate) {
            return privateIds.includes(challengeId);
          }
          return true;
        });
    },
    groups({ groups, privateIds }, { challenges }) {
      return groups
        .filter(({ challengeId, private: isPrivate }) => {
          if (isPrivate) {
            return privateIds.includes(challengeId);
          }
          return true;
        })
        .map((item) => {
          item.$challenge = findByIdKey(challenges, item.challengeId);
          item.$name = `${item.name}${item.country ? ` ${getEmojiFlag(item.country)}` : ''}`;
          return item;
        });
    },
    participants({ participants, privateIds }, { groups }) {
      return participants
        .filter(({ challengeId, private: isPrivate }) => {
          if (isPrivate) {
            return privateIds.includes(challengeId);
          }
          return true;
        })
        .map((item) => {
          item.$group = findByIdKey(groups, item.groupId);
          item.$name = item.$group && item.$group.country
            ? `${item.name} ${getEmojiFlag(item.$group.country)}`
            : item.name;
          return item;
        });
    },
    entries({ entries, privateIds }, { participants }) {
      return entries
        .filter(({ challengeId, private: isPrivate }) => {
          if (isPrivate) {
            return privateIds.includes(challengeId);
          }
          return true;
        })
        .map((item) => {
          item.$participant = findByIdKey(participants, item.participantId);
          return item;
        });
    },
    /* eslint-enable no-param-reassign */

    currentChallenge({ challengeId }, { challenges }) {
      return findByIdKey(challenges, challengeId);
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

    togglePrivateDialogOpen(state, to = !state.isPrivateDialogOpen) {
      state.isPrivateDialogOpen = Boolean(to);
    },
    toggleInfoDialogOpen(state, to = !state.isInfoDialogOpen) {
      state.isInfoDialogOpen = Boolean(to);
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
      options = {},
    } = {}) => {
      const query = firestoreRefs.entries.orderBy('createdAt', 'desc').limit(limit);
      return bindFirestoreRef('entries', mutateQuery(query), options);
    }),

    addPrivateId({ state, commit }, id) {
      if (!state.privateIds.includes(id)) {
        state.privateIds.push(id);
        commit('togglePrivateDialogOpen', true);
      }
    },
  },
  plugins: [
    vuexLocal.plugin,
  ],
});
