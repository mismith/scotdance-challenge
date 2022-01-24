import Vue from 'vue'
import Vuex from 'vuex'
import { vuexfireMutations, firestoreAction } from 'vuexfire'
import VuexPersistence from 'vuex-persist'
import orderBy from 'lodash.orderby'
import { $package } from '@/config'
import { getEmojiFlag } from '@/services/country'
import {
  firebase,
  firestoreRefs,
  idKey,
  findByIdKey,
  Challenge,
  Group,
  Participant,
  Entry,
} from '@/plugins/firebase'
import { isChallengeActive, isChallengeUpcoming, isChallengeRecentlyEnded } from '@/services/date'

Vue.use(Vuex)

export interface State {
  me: firebase.User | null;

  challenges: Challenge[];
  groups: Group[];
  participants: Participant[];
  entries: Entry[];

  privateIds: string[];
  isPrivateDialogOpen: boolean;
  isPublicDialogOpen: boolean;
  isInfoDialogOpen: boolean;

  challengeId: string;
  groupId: string;
  participantId: string;

  labels: {
    Challenge: string;
    Group: string;
    Participant: string;
    Amount: string;
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
})

function augment<T extends Record<any, any>>(item: T, augmentations: Partial<T>) {
  const config = Object.entries(augmentations).reduce((acc, [key, value]) => {
    acc[key] = {
      value,
      configurable: true,
    }
    return acc
  }, {} as any)
  Object.defineProperties(item, config)
}

export default new Vuex.Store<State>({
  state: {
    me: null,

    challenges: [],
    groups: [],
    participants: [],
    entries: [],

    privateIds: [],
    isPrivateDialogOpen: false,
    isPublicDialogOpen: false,
    isInfoDialogOpen: false,

    challengeId: '',
    groupId: '',
    participantId: '',

    labels: {
      Challenge: 'Challenge',
      Group: 'Group',
      Participant: 'Participant',
      Amount: 'Amount',
      Country: 'Country',
    },
  },
  getters: {
    challenges({ challenges, privateIds }) {
      return orderBy(
        challenges
          .filter(({ [idKey]: challengeId, private: isPrivate }) => {
            if (isPrivate) {
              return privateIds.includes(challengeId)
            }
            return true
          })
          .map((item) => {
            augment(item, {
              $isActive: isChallengeActive(item),
              $isUpcoming: isChallengeUpcoming(item),
              $isRecentlyEnded: isChallengeRecentlyEnded(item),
            })
            return item
          }),
        ['$isActive', '$isRecentlyEnded', '$isUpcoming', 'name'],
        ['desc', 'desc', 'desc', 'asc'],
      )
    },
    groups({ groups, privateIds }, { challenges }) {
      return groups
        .filter(({ challengeId, private: isPrivate }) => {
          if (isPrivate) {
            return privateIds.includes(challengeId)
          }
          return true
        })
        .map((item) => {
          augment(item, {
            $challenge: findByIdKey(challenges, item.challengeId),
            $name: `${item.name}${item.country ? ` ${getEmojiFlag(item.country)}` : ''}`,
          })
          return item
        })
    },
    participants({ participants, privateIds }, { groups }) {
      return participants
        .filter(({ challengeId, private: isPrivate }) => {
          if (isPrivate) {
            return privateIds.includes(challengeId)
          }
          return true
        })
        .map((item) => {
          augment(item, {
            $group: findByIdKey(groups, item.groupId),
            $name: item.$group && item.$group.country
              ? `${item.name} ${getEmojiFlag(item.$group.country)}`
              : item.name,
          })
          return item
        })
    },
    entries({ entries, privateIds }, { participants }) {
      return entries
        .filter(({ challengeId, private: isPrivate }) => {
          if (isPrivate) {
            return privateIds.includes(challengeId)
          }
          return true
        })
        .map((item) => {
          augment(item, {
            $participant: findByIdKey(participants, item.participantId),
          })
          return item
        })
    },

    currentChallenge({ challengeId }, { challenges }) {
      return findByIdKey(challenges, challengeId)
    },
  },
  mutations: {
    ...vuexfireMutations,

    setMe(state, me) {
      state.me = me
    },

    setChallengeId(state, to) {
      const challenge = findByIdKey<Challenge>(state.challenges, to)
      state.challengeId = (challenge && challenge[idKey]) || ''

      if (window.$crisp && challenge) {
        window.$crisp.push(['set', 'session:data', [[['Challenge', challenge.name]]]])
      }
    },
    setGroupId(state, to) {
      const group = findByIdKey<Group>(state.groups, to)
      state.groupId = (group && group[idKey]) || ''

      if (window.$crisp && group) {
        window.$crisp.push(['set', 'session:data', [[['Group', group.name]]]])
      }
    },
    setParticipantId(state, to) {
      const participant = findByIdKey<Participant>(state.participants, to)
      state.participantId = (participant && participant[idKey]) || ''

      if (window.$crisp && participant) {
        window.$crisp.push(['set', 'session:data', [[['Participant', participant.name]]]])
      }
    },

    togglePrivateDialogOpen(state, to = !state.isPrivateDialogOpen) {
      state.isPrivateDialogOpen = Boolean(to)
    },
    togglePublicDialogOpen(state, to = !state.isPublicDialogOpen) {
      state.isPublicDialogOpen = Boolean(to)
    },
    toggleInfoDialogOpen(state, to = !state.isInfoDialogOpen) {
      state.isInfoDialogOpen = Boolean(to)
    },
  },
  actions: {
    bindChallenges: firestoreAction(({ bindFirestoreRef }, {
      mutateQuery = (query: firebase.firestore.Query) => query,
    } = {}) => {
      const query = firestoreRefs.challenges.orderBy('name')
      return bindFirestoreRef('challenges', mutateQuery(query))
    }),
    bindGroups: firestoreAction(({ bindFirestoreRef }, {
      mutateQuery = (query: firebase.firestore.Query) => query,
    } = {}) => {
      const query = firestoreRefs.groups.orderBy('name')
      return bindFirestoreRef('groups', mutateQuery(query))
    }),
    bindParticipants: firestoreAction(({ bindFirestoreRef }, {
      mutateQuery = (query: firebase.firestore.Query) => query,
    } = {}) => {
      const query = firestoreRefs.participants.orderBy('name')
      return bindFirestoreRef('participants', mutateQuery(query))
    }),
    bindEntries: firestoreAction(({ bindFirestoreRef }, {
      mutateQuery = (query: firebase.firestore.Query) => query,
      limit = 50,
      options = {},
    } = {}) => {
      const query = firestoreRefs.entries.orderBy('createdAt', 'desc').limit(limit)
      return bindFirestoreRef('entries', mutateQuery(query), options)
    }),

    addPrivateId({ state, commit }, id) {
      if (!state.privateIds.includes(id)) {
        state.privateIds.push(id)
        commit('togglePrivateDialogOpen', true)
      }
    },
  },
  plugins: [
    vuexLocal.plugin,
  ],
})
