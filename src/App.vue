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
      <router-view :challenge-id="challengeId" />
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
  firestore,
  firestoreRefs,
  idKey,
  capitalize,
} from '@/plugins/firebase';
import Picker from '@/components/Picker.vue';
import EditChallenge from '@/components/EditChallenge.vue';

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
    loading: true,
    challengeToEdit: undefined,
  }),
  computed: {
    ...mapGetters([
      'challenges',
    ]),
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
    capitalize,
    ...mapActions([
      'bindChallenges',
    ]),

    async handleAddChallenge(challenge: object) {
      const { id } = await firestoreRefs.challenges.add({
        createdAt: firestore.FieldValue.serverTimestamp(),
        ...challenge,
      });
      // @ts-ignore
      this.challengeId = id;
    },
  },
  async created() {
    // @ts-ignore
    if (window.$crisp) {
      // @ts-ignore
      window.$crisp.push(['set', 'session:data', [[['AppVersion', version]]]]);
    }

    await this.bindChallenges();
    this.loading = false;
  },
  components: {
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
