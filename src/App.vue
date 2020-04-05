<template>
  <v-app class="App">
    <v-app-bar v-if="$route.name !== 'home'" app color="primary" height="56">
      <Picker
        v-model="challengeId"
        :label="$root.labels.Challenge"
        :placeholder="`All ${$root.labels.Challenge}s`"
        dense
        solo
        outlined
        rounded
        clearable
        hide-details
        :items="challenges"
        item-text="name"
        :item-value="idKey"
        :add-new="name => handleAddChallenge(name)"
      />
    </v-app-bar>

    <v-content>
      <router-view v-bind="{
        firestoreRefs,
        challenges,
        groups,
        participants,
        entries,
        compliments,
        loading,
        currentChallengeId: challengeId,
      }" />
    </v-content>

    <v-bottom-navigation app grow shift color="primary">
      <v-btn :to="{ name: 'activity' }">
        <span>Activity</span>
        <v-icon>mdi-chart-timeline-variant</v-icon>
      </v-btn>
      <v-btn depressed x-large color="primary" :to="{ name: 'new' }">
        <span>New</span>
        <v-icon large>mdi-plus</v-icon>
      </v-btn>
      <v-btn :to="{ name: 'statistics' }">
        <span>Stats</span>
        <v-icon>mdi-poll</v-icon>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import {
  Challenge,
  Group,
  Participant,
  Entry,
  Compliments,
  firestore,
  db,
  idKey,
  findByIdKey,
} from '@/plugins/firebase';
import Picker from '@/components/Picker.vue';

const firestoreRefs = {
  challenges: db.collection('challenges'),
  groups: db.collection('groups'),
  participants: db.collection('participants'),
  entries: db.collection('entries'),
  compliments: db.collection('compliments'),
  complimentsSubmitted: db.collection('complimentsSubmitted'),
};

/* eslint-disable @typescript-eslint/ban-ts-ignore */
export default Vue.extend({
  name: 'App',
  // @ts-ignore
  localStorage: {
    challengeId: {
      type: String,
    },
  },
  data: () => ({
    idKey,
    firestoreRefs,
    challengesRaw: [] as Challenge[],
    groupsRaw: [] as Group[],
    participantsRaw: [] as Participant[],
    entriesRaw: [] as Entry[],
    complimentsRaw: [] as Compliments[],
    loading: true,
  }),
  firestore: {
    challengesRaw: firestoreRefs.challenges.orderBy('name'),
    groupsRaw: firestoreRefs.groups.orderBy('name'),
    participantsRaw: firestoreRefs.participants.orderBy('name'),
    entriesRaw: firestoreRefs.entries.orderBy('createdAt'),
    complimentsRaw: firestoreRefs.compliments,
  },
  computed: {
    challengesDebug() {
      // @ts-ignore
      if (this.$root.isDebugging) {
        return this.challengesRaw.concat({
          [idKey]: 'test_challenge',
          name: 'Test',
        });
      }
      // @ts-ignore
      return this.challengesRaw;
    },
    groupsDebug() {
      // @ts-ignore
      if (this.$root.isDebugging) {
        return this.groupsRaw.concat({
          [idKey]: 'test_group',
          challengeId: 'test_challenge',
          name: 'Test Group',
        });
      }
      // @ts-ignore
      return this.groupsRaw;
    },
    participantsDebug() {
      // @ts-ignore
      if (this.$root.isDebugging) {
        return this.participantsRaw.concat({
          [idKey]: 'test_participant',
          challengeId: 'test_challenge',
          groupId: 'test_group',
          name: 'Test Participant',
        });
      }
      // @ts-ignore
      return this.participantsRaw;
    },
    entriesDebug() {
      // @ts-ignore
      if (this.$root.isDebugging) {
        return this.entriesRaw.concat({
          [idKey]: 'test_entry',
          challengeId: 'test_challenge',
          groupId: 'test_group',
          participantId: 'test_participant',
          value: 1000,
          createdAt: firestore.Timestamp.now(),
        });
      }
      // @ts-ignore
      return this.entriesRaw;
    },

    challenges() {
      // @ts-ignore
      return this.challengesDebug;
    },
    groups() {
      // @ts-ignore
      return this.groupsDebug.map((item) => Object.assign(item, {
        // @ts-ignore
        $challenge: findByIdKey<Challenge>(this.challengesDebug, item.challengeId),
      }));
    },
    participants() {
      // @ts-ignore
      return this.participantsDebug.map((item) => Object.assign(item, {
        // @ts-ignore
        $challenge: findByIdKey<Challenge>(this.challengesDebug, item.challengeId),
        // @ts-ignore
        $group: findByIdKey<Group>(this.groupsDebug, item.groupId),
      }));
    },
    entries() {
      // @ts-ignore
      return this.entriesDebug.map((item) => Object.assign(item, {
        // @ts-ignore
        $challenge: findByIdKey<Challenge>(this.challengesDebug, item.challengeId),
        // @ts-ignore
        $group: findByIdKey<Group>(this.groupsDebug, item.groupId),
        // @ts-ignore
        $participant: findByIdKey<Participant>(this.participantsDebug, item.participantId),
      }));
    },
    compliments() {
      // @ts-ignore
      return this.complimentsRaw;
    },
  },
  watch: {
    challenges: {
      handler(challenges) {
        // @ts-ignore
        if (!this.loading && challenges && challenges.length === 1) {
          // auto-pick first challenge if it's the only one
          // @ts-ignore
          this.challengeId = challenges[0][idKey];
        }
      },
      immediate: true,
    },
  },
  methods: {
    async handleAddChallenge(name: string) {
      // @ts-ignore
      await this.firestoreRefs.challenges.add({
        name,
      });
    },
  },
  async created() {
    await Promise.all(Object.values(firestoreRefs).map((ref) => ref.get()));
    this.loading = false;
  },
  components: {
    Picker,
  },
});
</script>

<style lang="scss">
@media (max-width: 768px) {
  #crisp-chatbox {
    z-index: 200; // less than v-overlay

    a[data-cshid] {
      margin-bottom: 56px !important;
    }
  }
}

.App {
  &,
  .v-application--wrap {
    // override Vuetify default (100vh) to solve Safari issue
    // https://stackoverflow.com/a/55003985/888928
    min-height: -webkit-fill-available;
  }
  .v-content__wrap {
    display: flex;
    flex-direction: column;
  }

  .v-bottom-navigation {
    .v-btn {
      height: inherit !important;

      &.v-size--x-large {
        height: 110% !important;
        align-self: flex-end;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;

        &.primary {
          color: #fff !important;
        }
      }
    }
  }

  .flex-page {
    display: flex;
    flex-direction: column;
    flex: auto;
  }

  .scroll-y {
    overflow: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
