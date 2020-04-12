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
        :add-new="name => challengeToEdit = {
          name: capitalize(name),
        }"
      />
      <EditChallenge
        v-model="challengeToEdit"
        @done="challenge => handleAddChallenge(challenge)"
      />
    </v-app-bar>

    <v-content>
      <Loader v-if="$route.name !== 'home' && loading" class="ma-auto" />
      <router-view v-else />
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
import { mapGetters, mapActions } from 'vuex';
import { version } from '@/../package.json';
import {
  firebase,
  firestore,
  firestoreRefs,
  idKey,
  capitalize,
} from '@/plugins/firebase';
import Loader from '@/components/Loader.vue';
import Picker from '@/components/Picker.vue';
import EditChallenge from '@/components/EditChallenge.vue';

export default Vue.extend({
  name: 'App',
  data: () => ({
    idKey,
    loading: true,
    challengeToEdit: undefined,
  }),
  computed: {
    ...mapGetters([
      'challenges',
    ]),

    challengeId: {
      get() {
        return this.$store.getters.challengeId;
      },
      set(challengeId) {
        return this.$store.commit('setChallengeId', challengeId);
      },
    },
  },
  watch: {
    challengeId: {
      async handler(challengeId) {
        (this as any).loading = true;
        await Promise.all([
          (this as any).bindGroups({
            mutateQuery: challengeId
              ? (query: firebase.firestore.Query) => query.where('challengeId', '==', challengeId)
              : undefined,
          }),
          (this as any).bindParticipants({
            mutateQuery: challengeId
              ? (query: firebase.firestore.Query) => query.where('challengeId', '==', challengeId)
              : undefined,
          }),
          (this as any).bindEntries({
            mutateQuery: challengeId
              ? (query: firebase.firestore.Query) => query.where('challengeId', '==', challengeId)
              : undefined,
          }),
        ]);
        (this as any).loading = false;
      },
      immediate: true,
    },
  },
  methods: {
    capitalize,
    ...mapActions([
      'bindChallenges',
      'bindGroups',
      'bindParticipants',
      'bindEntries',
    ]),

    async handleAddChallenge(challenge: object) {
      const { id } = await firestoreRefs.challenges.add({
        createdAt: firestore.FieldValue.serverTimestamp(),
        ...challenge,
      });
      (this as any).challengeId = id;
    },
  },
  async created() {
    if (window.$crisp) {
      window.$crisp.push(['set', 'session:data', [[['AppVersion', version]]]]);
    }

    await (this as any).bindChallenges();
    if (!this.challengeId && this.challenges.length === 1) {
      // auto-pick first challenge if it's the only one
      this.challengeId = this.challenges[0][idKey];
    }
  },
  components: {
    Loader,
    Picker,
    EditChallenge,
  },
});
</script>

<style lang="scss">
@media (max-width: 768px) {
  #crisp-chatbox {
    z-index: 200; // less than v-overlay

    a[data-cshid] {
      margin-bottom: calc(56px + env(safe-area-inset-bottom)) !important;
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

  .v-app-bar.v-app-bar--fixed {
    height: auto !important;
    padding-top: env(safe-area-inset-top);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }

  .v-bottom-navigation.v-bottom-navigation--fixed {
    height: calc(56px + env(safe-area-inset-bottom)) !important;
    padding-bottom: env(safe-area-inset-bottom);

    .v-btn {
      height: 56px !important;

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
