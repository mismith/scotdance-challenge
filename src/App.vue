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
        :items="challengesForPicker"
        item-text="name"
        :item-value="idKey"
        :add-new="name => challengeToEdit = {
          name: capitalize(name),
        }"
      >
        <template #prepend-item>
          <AddNewTip :label="$root.getLabel('Challenge').toLowerCase()" />
        </template>
        <template #item="{ item, parent }">
          <v-list-item-content :style="{ opacity: !item.$isActive ? 0.5 : undefined }">
            <v-list-item-title>
              <span v-html="parent.genFilteredText(parent.getText(item))" />
              <v-icon v-if="item.private" class="ml-2">mdi-shield-lock</v-icon>
              <em v-if="!item.$isActive" class="caption ml-2">
                {{
                  item.$isUpcoming ? 'Upcoming' : (
                    item.$isRecentlyEnded ? 'Recently Ended' : 'Inactive'
                  )
                }}
              </em>
            </v-list-item-title>
          </v-list-item-content>
        </template>
        <template #append-item>
          <div
            v-if="!isShowingAllChallenges && relevantChallenges.length < challenges.length"
            class="caption text-center px-4 my-2"
          >
            <v-chip small @click="isShowingAllChallenges = true">
              Show {{ challenges.length - relevantChallenges.length }} more inactive
              {{
                pluralize(
                  challenges.length - relevantChallenges.length,
                  $root.getLabel('Challenge').toLowerCase(),
                )
              }}
            </v-chip>
          </div>
        </template>
      </Picker>
      <EditChallenge
        v-model="challengeToEdit"
        @add="challenge => handleAddChallenge(challenge)"
        @save="challenge => handleSaveChallenge(challenge)"
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
                  Private {{ $root.getLabel('Challenge') }}
                  <v-icon color="primary" class="ml-1 mt-n1">mdi-shield-lock</v-icon>
                </div>
                <v-btn icon class="mr-n1" @click="isPrivateDialogOpen = false">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </v-card-title>
              <v-card-text class="pb-0">
                <p class="mb-6">
                  This {{ $root.getLabel('Challenge').toLowerCase() }}
                  can only be 'unlocked' when accessed from the link below:
                </p>

                <div class="d-flex align-center mb-4">
                  <v-text-field
                    ref="privateUrl"
                    :value="getChallengeUrl(currentChallenge)"
                    label="Access Link"
                    rounded
                    outlined
                    readonly
                    hide-details
                  />
                  <v-btn
                    v-if="canCopy"
                    icon
                    large
                    class="ml-1"
                    @click="handleCopy(getChallengeUrl(currentChallenge))"
                  >
                    <v-icon>mdi-content-copy</v-icon>
                  </v-btn>
                </div>

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
                  Share {{ $root.getLabel('Challenge') }}
                  <v-icon color="primary" class="ml-1 mt-n1">mdi-share</v-icon>
                </div>
                <v-btn icon class="mr-n1" @click="isPublicDialogOpen = false">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </v-card-title>
              <v-card-text class="pb-0">
                <p class="mb-6">
                  This {{ $root.getLabel('Challenge').toLowerCase() }} can be accessed directly
                  using the following link:
                </p>

                <div class="d-flex align-center mb-4">
                  <v-text-field
                    ref="publicUrl"
                    :value="getChallengeUrl(currentChallenge)"
                    label="Access Link"
                    rounded
                    outlined
                    readonly
                    hide-details
                  />
                  <v-btn
                    v-if="canCopy"
                    icon
                    large
                    class="ml-1"
                    @click="handleCopy(getChallengeUrl(currentChallenge))"
                  >
                    <v-icon>mdi-content-copy</v-icon>
                  </v-btn>
                </div>
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
        <v-btn
          v-if="me && (me.uid === currentChallenge.createdBy)"
          icon
          dark
          @click="challengeToEdit = currentChallenge"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <template v-else>
          <ChallengeInfo
            v-model="isInfoDialogOpen"
            :challenge="currentChallenge"
          />
          <v-btn
            icon
            dark
            @click="isInfoDialogOpen = true"
          >
            <v-icon>mdi-information-outline</v-icon>
          </v-btn>
        </template>
      </template>
    </v-app-bar>
    <v-snackbar app v-model="hasCopied">
      <v-icon color="success">mdi-check</v-icon>
      Copied to clipboard
    </v-snackbar>

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
import { mapGetters, mapActions, mapState } from 'vuex';
import { $package, isDebugging } from '@/config';
import router from '@/router';
import {
  firebase,
  firestore,
  firestoreRefs,
  idKey,
  Challenge,
} from '@/plugins/firebase';
import {
  capitalize,
  pluralize,
} from '@/services/strings';
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
    challengeToEdit: undefined as Challenge | null | undefined,
    isShowingAllChallenges: false,
    hasCopied: false,
  }),
  computed: {
    ...mapState([
      'me',
    ]),
    ...mapGetters([
      'challenges',
      'currentChallenge',
    ]),

    relevantChallenges() {
      return this.challenges.filter(
        (challenge: Challenge) => challenge.$isActive
          || challenge.$isUpcoming
          || challenge.$isRecentlyEnded
          || (this.currentChallenge && this.currentChallenge[idKey] === challenge[idKey]),
      );
    },
    challengesForPicker() {
      return this.isShowingAllChallenges
        ? this.challenges
        : this.relevantChallenges;
    },

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

    canCopy() {
      return window.navigator.clipboard && typeof window.navigator.clipboard.writeText === 'function';
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
    async isPrivateDialogOpen(isOpen) {
      if (isOpen) {
        await this.$nextTick();
        (this.$refs.privateUrl as any).$el.querySelector('input').select();
      }
    },
    async isPublicDialogOpen(isOpen) {
      if (isOpen) {
        await this.$nextTick();
        (this.$refs.publicUrl as any).$el.querySelector('input').select();
      }
    },
  },
  methods: {
    capitalize,
    pluralize,
    ...mapActions([
      'bindChallenges',
      'bindGroups',
      'bindParticipants',
    ]),

    // async handleNewChallenge() {
    //   (this.$refs.challengePicker as any).$el.querySelector('input').click();
    // },
    async handleAddChallenge(challenge: Challenge) {
      const { [idKey]: id } = await firestoreRefs.challenges.add({
        createdAt: firestore.FieldValue.serverTimestamp(),
        createdBy: this.me && this.me.uid,
        ...challenge,
      });
      if (challenge.private) {
        this.$store.dispatch('addPrivateId', id);
      }
      this.challengeId = id;
      this.challengeToEdit = undefined;
    },
    async handleSaveChallenge(challenge: Challenge) {
      const { [idKey]: id } = this.challengeToEdit || {};
      if (id) {
        await firestoreRefs.challenges.doc(id).update({
          ...challenge,
          updatedAt: firestore.FieldValue.serverTimestamp(),
          updatedBy: this.me && this.me.uid,
        });
      }
      this.challengeToEdit = undefined;
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

    handleCopy(textToCopy: string) {
      window.navigator.clipboard.writeText(textToCopy);
      this.hasCopied = true;
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

    a[aria-label='Open chat'],
    a[aria-label='Close chat']{
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
