<template>
  <v-app class="App">
    <v-content>
      <router-view v-bind="{
        firestoreRefs,
        challenges,
        groups,
        participants,
        entries,
        compliments,
        loading,
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
  db,
  findByIdKey,
} from '@/plugins/firebase';

const firestoreRefs = {
  challenges: db.collection('challenges'),
  groups: db.collection('groups'),
  participants: db.collection('participants'),
  entries: db.collection('entries'),
  compliments: db.collection('compliments'),
};

export default Vue.extend({
  name: 'App',
  data: () => ({
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
    challenges() {
      return this.challengesRaw;
    },
    groups() {
      return this.groupsRaw.map((item, i) => Object.assign(item, {
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
    compliments() {
      return this.complimentsRaw;
    },
  },
  async created() {
    await Promise.all(Object.values(firestoreRefs).map((ref) => ref.get()));
    this.loading = false;
  },
});
</script>

<style lang="scss">
@media (max-width: 768px) {
  #crisp-chatbox {
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
