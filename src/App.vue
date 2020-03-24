<template>
  <v-app class="App">
    <v-content>
      <router-view v-bind="{
        firestoreRefs,
        challenges,
        groups,
        participants,
        entries,
      }" />
    </v-content>

    <v-bottom-navigation app grow shift color="primary">
      <v-btn :to="{ name: 'activity' }">
        <span>Activity</span>
        <v-icon>mdi-progress-clock</v-icon>
      </v-btn>
      <v-btn depressed x-large color="primary" :to="{ name: 'new' }">
        <span>New</span>
        <v-icon large>mdi-plus</v-icon>
      </v-btn>
      <v-btn :to="{ name: 'statistics' }">
        <span>Stats</span>
        <v-icon>mdi-chart-line-variant</v-icon>
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
  db,
  findByIdKey,
} from '@/plugins/firebase';
import palette, { Colors, Color } from 'vuetify/lib/util/colors';

const firestoreRefs = {
  challenges: db.collection('challenges'),
  groups: db.collection('groups'),
  participants: db.collection('participants'),
  entries: db.collection('entries'),
};
const colors = ['purple', 'blue', 'green', 'yellow', 'orange', 'red']
  .map((color) => (palette[color as keyof Colors] as Color).base);

export default Vue.extend({
  name: 'App',
  data: () => ({
    firestoreRefs,
    challengesRaw: [] as Challenge[],
    groupsRaw: [] as Group[],
    participantsRaw: [] as Participant[],
    entriesRaw: [] as Entry[],
  }),
  firestore: {
    challengesRaw: firestoreRefs.challenges.orderBy('name'),
    groupsRaw: firestoreRefs.groups.orderBy('name'),
    participantsRaw: firestoreRefs.participants.orderBy('name'),
    entriesRaw: firestoreRefs.entries.orderBy('createdAt'),
  },
  computed: {
    challenges() {
      return this.challengesRaw;
    },
    groups() {
      return this.groupsRaw.map((item, i) => Object.assign(item, {
        color: item.color || colors[i % colors.length],
        $challenge: findByIdKey<Challenge>(this.challengesRaw, item.challengeId),
      }));
    },
    participants() {
      return this.participantsRaw.map((item) => Object.assign(item, {
        $challenge: findByIdKey<Challenge>(this.challengesRaw, item.challengeId),
        $group: findByIdKey<Group>(this.groupsRaw, item.groupId),
      }));
    },
    entries() {
      return this.entriesRaw.map((item) => Object.assign(item, {
        $challenge: findByIdKey<Challenge>(this.challengesRaw, item.challengeId),
        $group: findByIdKey<Group>(this.groupsRaw, item.groupId),
        $participant: findByIdKey<Participant>(this.participantsRaw, item.participantId),
      }));
    },
  },
});
</script>

<style lang="scss">
.App {
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
}
</style>
