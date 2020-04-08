<template>
  <div class="Activity flex-page pr-6" :class="{ 'pl-6': !$vuetify.breakpoint.smAndDown }">
    <v-timeline :dense="$vuetify.breakpoint.smAndDown">
      <ActivityTimelineItem
        v-for="entry in entries"
        :key="entry[idKey]"
        :entry="entry"
        :challenge-id="currentChallengeId"
        @flag="flaggedEntry = entry"
      />
    </v-timeline>
    <Loader v-if="loading" class="ma-auto" />
    <div v-else-if="!entries.length" class="d-flex flex-column align-center ma-auto">
      <v-icon x-large>mdi-cancel</v-icon>
      No entries yet
    </div>

    <v-dialog v-model="isFlagging" max-width="320">
      <v-card>
        <v-card-title>
          Flag An Issue <v-icon color="primary" class="ml-2">mdi-flag</v-icon>

          <v-spacer />
          <v-btn icon class="mr-n2" @click="isFlagging = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pb-2">
          <p>Did you make a mistake, or does something seem off?</p>
          <p>Help sort things out with a super quick explanation of what you think is wrong.</p>
        </v-card-text>
        <v-card-actions class="justify-center pt-0 pa-4">
          <v-btn rounded block x-large color="primary" @click="openLiveChat()">
            Flag
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import Vue from 'vue';
import { getEmojiFlag } from '@/services/country';
import { idKey } from '@/plugins/firebase';
import Loader from '@/components/Loader.vue';
import ActivityTimelineItem from '@/components/ActivityTimelineItem.vue';
import { mapGetters, mapActions } from 'vuex';

export default Vue.extend({
  name: 'Activity',
  props: {
    challengeId: String,
  },
  data() {
    return {
      idKey,

      loading: true,

      isFlagging: false,
      flaggedEntry: undefined,
    };
  },
  computed: {
    ...mapGetters([
      'challenges',
      'entries',
    ]),

    currentChallengeId() {
      const challenge = this.challenges.find(({ [idKey]: id }) => id === this.challengeId);
      return challenge && challenge[idKey];
    },
  },
  watch: {
    currentChallengeId: {
      async handler(challengeId) {
        this.loading = true;
        await this.bindEntries({
          mutateQuery: challengeId
            ? (query) => query.where('challengeId', '==', challengeId)
            : undefined,
        });
        this.loading = false;
      },
      immediate: true,
    },

    flaggedEntry(flaggedEntry) {
      this.isFlagging = Boolean(flaggedEntry);
    },
    isFlagging(isFlagging) {
      if (!isFlagging) {
        this.flaggedEntry = null;
      }
    },
  },
  methods: {
    getEmojiFlag,
    ...mapActions([
      'bindEntries',
    ]),

    openLiveChat() {
      if (window.$crisp) {
        if (this.flaggedEntry) {
          window.$crisp.push(['do', 'message:send', [
            'text',
            `Flagged Entry ID: ${this.flaggedEntry[idKey]}`,
          ]]);
        }
        window.$crisp.push(['do', 'chat:open']);
      } else {
        throw new Error('Live chat not found');
      }
      this.flaggedEntry = null;
    },
  },
  components: {
    Loader,
    ActivityTimelineItem,
  },
});
</script>
