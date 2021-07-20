<template>
  <v-app class="App" :class="{ isDebugging }">
    <v-app-bar v-if="$route.name !== 'home'" app color="primary" height="56">
      <!-- <v-btn icon dark @click.prevent="handleNewChallenge()">
        <v-icon>mdi-plus-circle-outline</v-icon>
      </v-btn> -->

      <Picker
        ref="challengePicker"
        v-model="challengeId"
        :label="$root.getLabel('Challenge')"
        :placeholder="`Select ${$root.getLabel('Challenge')}`"
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
      >
        <template #prepend-item>
          <AddNewTip :label="$root.getLabel('Challenge')" />
        </template>
      </Picker>
      <EditChallenge
        v-model="challengeToEdit"
        @done="challenge => handleAddChallenge(challenge)"
      />

      <template v-if="currentChallenge && currentChallenge.private">
        <v-btn icon dark @click="isPrivateDialogOpen = true">
          <v-icon>mdi-shield-lock</v-icon>
        </v-btn>
        <v-dialog v-model="isPrivateDialogOpen" max-width="320">
          <v-form>
            <v-card>
              <v-card-title>
                <div class="flex">
                  Private Challenge
                  <v-icon color="primary" class="ml-1 mt-n1">mdi-shield-lock</v-icon>
                </div>
                <v-btn icon class="mr-n1" @click="isPrivateDialogOpen = false">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </v-card-title>
              <v-card-text class="pb-0">
                <p class="mb-6">This challenge can only be 'unlocked' when accessed from
                  the link below:</p>

                <v-text-field
                  :value="getChallengeUrl(currentChallenge)"
                  label="Access Link"
                  rounded
                  outlined
                  readonly
                />

                <p><strong>Do not share this link publicly</strong> &mdash;<br />
                  anyone who visits it will gain entry.</p>
              </v-card-text>
              <v-card-actions class="justify-end">
                <v-btn rounded large block color="primary" @click="isPrivateDialogOpen = false">
                  Got It
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-form>
        </v-dialog>
      </template>
      <template v-else-if="currentChallenge && !currentChallenge.private">
        <v-btn icon dark @click="isPublicDialogOpen = true">
          <v-icon>mdi-share</v-icon>
        </v-btn>
        <v-dialog v-model="isPublicDialogOpen" max-width="320">
          <v-form>
            <v-card>
              <v-card-title>
                <div class="flex">
                  Share Challenge
                  <v-icon color="primary" class="ml-1 mt-n1">mdi-share</v-icon>
                </div>
                <v-btn icon class="mr-n1" @click="isPublicDialogOpen = false">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </v-card-title>
              <v-card-text class="pb-0">
                <p class="mb-6">This challenge can launched directly using the following link:</p>

                <v-text-field
                  :value="getChallengeUrl(currentChallenge)"
                  label="Access Link"
                  rounded
                  outlined
                  readonly
                />
              </v-card-text>
              <v-card-actions class="justify-end">
                <v-btn rounded large block color="primary" @click="isPublicDialogOpen = false">
                  Got It
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-form>
        </v-dialog>
      </template>
      <template v-if="currentChallenge">
        <v-btn icon dark @click="isInfoDialogOpen = true">
          <v-icon>mdi-information-outline</v-icon>
        </v-btn>
        <ChallengeInfo
          v-model="isInfoDialogOpen"
          :challenge="currentChallenge"
        />
      </template>
    </v-app-bar>

    <v-main>
      <Loader v-if="$route.name !== 'home' && loading" class="ma-auto" />
      <router-view v-show="$route.name === 'home' || !loading" />
    </v-main>

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
import { $package, isDebugging } from '@/config';
import router from '@/router';
import {
  firebase,
  firestore,
  firestoreRefs,
  idKey,
  capitalize,
  Challenge,
} from '@/plugins/firebase';
import Loader from '@/components/Loader.vue';
import Picker from '@/components/Picker.vue';
import ChallengeInfo from '@/components/ChallengeInfo.vue';
import EditChallenge from '@/components/EditChallenge.vue';
import AddNewTip from '@/components/AddNewTip.vue';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default Vue.extend({
  name: 'App',
  data: () => ({
    isDebugging,
    idKey,
    loading: true,
    challengeToEdit: undefined,
  }),
  computed: {
    ...mapGetters([
      'challenges',
      'currentChallenge',
    ]),

    challengeId: {
      get() {
        return this.$store.state.challengeId;
      },
      set(challengeId) {
        return this.$store.commit('setChallengeId', challengeId);
      },
    },

    isInfoDialogOpen: {
      get() {
        return this.$store.state.isInfoDialogOpen;
      },
      set(to) {
        this.$store.commit('toggleInfoDialogOpen', to);
      },
    },
    isPublicDialogOpen: {
      get() {
        return this.$store.state.isPublicDialogOpen;
      },
      set(to) {
        this.$store.commit('togglePublicDialogOpen', to);
      },
    },
    isPrivateDialogOpen: {
      get() {
        return this.$store.state.isPrivateDialogOpen;
      },
      set(to) {
        this.$store.commit('togglePrivateDialogOpen', to);
      },
    },
  },
  watch: {
    challengeId: {
      async handler(challengeId) {
        this.loading = true;
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
        ]);
        this.loading = false;
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
    ]),

    async handleNewChallenge() {
      (this.$refs.challengePicker as any).$el.querySelector('input').click();
    },
    async handleAddChallenge(challenge: Challenge) {
      const { id } = await firestoreRefs.challenges.add({
        createdAt: firestore.FieldValue.serverTimestamp(),
        ...challenge,
      });
      if (challenge.private) {
        this.$store.dispatch('addPrivateId', id);
      }
      this.challengeId = id;
    },

    getChallengeUrl(challenge: Challenge) {
      const { href } = router.resolve({
        name: challenge.private ? 'private' : 'public',
        params: {
          challengeId: challenge[idKey],
        },
      });
      return `${window.location.origin}${href}`;
    },
  },
  async created() {
    if (window.$crisp) {
      window.$crisp.push(['set', 'session:data', [[['AppVersion', $package.version]]]]);
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
    ChallengeInfo,
    EditChallenge,
    AddNewTip,
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

html,
body {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
}

.App {
  &.isDebugging {
    .v-bottom-navigation {
      background-image: repeating-linear-gradient(
        -45deg,
        #0001,
        #0001 5px,
        transparent 0,
        transparent 10px,
      );
    }
  }

  &,
  .v-application--wrap {
    // override Vuetify default (100vh) to solve Safari issue
    // https://stackoverflow.com/a/55003985/888928
    min-height: -webkit-fill-available;
  }
  .v-main__wrap {
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

// source: https://github.com/vuetifyjs/vuetify/issues/7283#issuecomment-572276385
.v-input--reverse {
  .v-input__slot {
    flex-direction: row-reverse;
    justify-content: flex-end;

    .v-application--is-ltr & {
      .v-input--selection-controls__input {
        margin-right: 0;
        margin-left: 8px;
      }
    }
    .v-application--is-rtl & {
      .v-input--selection-controls__input {
        margin-left: 0;
        margin-right: 8px;
      }
    }
  }
}
</style>
