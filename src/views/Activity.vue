<template>
  <div class="Activity flex-page pr-6" :class="{ 'pl-6': !$vuetify.breakpoint.smAndDown }">
    <Loader v-if="loading" class="ma-auto" />
    <div v-else-if="!filteredEntries.length" class="d-flex flex-column align-center ma-auto">
      <v-icon x-large>mdi-cancel</v-icon>
      No entries yet
    </div>
    <v-timeline
      v-else
      :dense="$vuetify.breakpoint.smAndDown"
      v-infinite-scroll="handleInfinite"
      :infinite-scroll-distance="100"
    >
      <v-timeline-item
        v-for="entry in groupedEntries"
        :key="entry[idKey]"
        :id="`entry-${entry[idKey]}`"
        small
        :color="entry.$group.color"
        :left="entry.$direction === 'left'"
        :right="entry.$direction === 'right'"
      >
        <v-card>
          <v-card-title class="d-flex align-center">
            <big class="flex">+{{ entry.value }}</big>
            <small v-if="!currentChallenge && challenges.length > 1" class="overline">
              {{ entry.$challenge.name }}
            </small>
            <v-btn small icon class="ml-2" @click="flaggedEntry = entry">
              <v-icon small>mdi-flag-outline</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            by <strong>{{ entry.$participant.name }}</strong>
            of <strong>{{ entry.$group.$name }}</strong>
            at <strong>{{ entry.createdAt.toDate().toLocaleString() }}</strong>
          </v-card-text>
        </v-card>
      </v-timeline-item>
    </v-timeline>

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
import { idKey, findByIdKey } from '@/plugins/firebase';
import Loader from '@/components/Loader.vue';

const INCREMENT = 20;

export default Vue.extend({
  name: 'Activity',
  props: {
    firestoreRefs: Object,
    challenges: Array,
    groups: Array,
    participants: Array,
    entries: Array,
    compliments: Array,
    loading: Boolean,
    currentChallengeId: String,
  },
  data() {
    return {
      idKey,
      offset: INCREMENT,
      isFlagging: false,
      flaggedEntry: undefined,
    };
  },
  computed: {
    currentChallenge() {
      return findByIdKey(this.challenges, this.currentChallengeId);
    },

    filteredEntries() {
      if (this.currentChallenge) {
        return this.entries
          .filter(({ challengeId }) => challengeId === this.currentChallenge[idKey]);
      }
      return this.entries;
    },
    groupedEntries() {
      const groupedEntries = [...this.filteredEntries];
      groupedEntries.reverse();
      return groupedEntries.slice(0, this.offset);
    },
  },
  watch: {
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

    handleInfinite() {
      if (this.offset < this.filteredEntries.length) {
        this.offset += INCREMENT;
      }
    },
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
  },
});
</script>
