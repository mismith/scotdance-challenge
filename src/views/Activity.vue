<template>
  <div class="Activity flex-page pr-6" :class="{ 'pl-6': !$vuetify.breakpoint.smAndDown }">
    <div v-if="!entries.length" class="d-flex flex-column align-center ma-auto">
      <v-icon x-large>mdi-cancel</v-icon>
      No entries yet
    </div>
    <template v-else>
      <div
        v-if="currentChallenge"
        class="d-flex align-center my-4 mr-auto primary--text"
        :style="{
          flexDirection: $vuetify.breakpoint.smAndDown ? 'row' : 'column',
          marginLeft: $vuetify.breakpoint.smAndDown ? '16px' : 'auto',
        }"
      >
        <big class="display-1">
          <AnimatedNumber
            :value="currentChallenge.$total"
            :formatValue="v => v.toLocaleString(undefined, { maximumFractionDigits: 0 })"
            :duration="2000"
            round
          />
        </big>
        <small class="ma-2">total</small>
      </div>
      <v-timeline :dense="$vuetify.breakpoint.smAndDown">
        <ActivityTimelineItem
          v-for="entry in entries"
          :key="entry[idKey]"
          :entry="entry"
          @flag="flaggedEntry = entry"
        />
      </v-timeline>
    </template>
    <v-btn
      v-if="!isShowingAllEntries || isLoadingMore"
      fab
      small
      color="primary"
      :loading="isLoadingMore"
      class="mr-auto mb-10"
      :style="{ marginLeft: $vuetify.breakpoint.smAndDown ? '28px' : 'auto' }"
      @click="loadMore()"
      v-infinite-scroll="loadMore"
      :infinite-scroll-distance="100"
    >
      <v-icon>mdi-dots-vertical</v-icon>
    </v-btn>

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
import AnimatedNumber from 'animated-number-vue';
import infiniteScroll from 'vue-infinite-scroll';
import { idKey, findByIdKey } from '@/plugins/firebase';
import ActivityTimelineItem from '@/components/ActivityTimelineItem.vue';
import { mapState, mapGetters, mapActions } from 'vuex';

const INCREMENT = 20;

export default Vue.extend({
  name: 'Activity',
  data() {
    return {
      idKey,

      limit: 0,
      isLoadingMore: false,

      isFlagging: false,
      flaggedEntry: undefined,
    };
  },
  computed: {
    ...mapState([
      'challengeId',
    ]),
    ...mapGetters([
      'challenges',
      'entries',
    ]),

    currentChallenge() {
      return findByIdKey(this.challenges, this.challengeId);
    },

    isShowingAllEntries() {
      return this.entries.length < this.limit;
    },
  },
  watch: {
    challengeId: {
      handler() {
        this.limit = 0;
        this.loadMore();
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

    async loadMore() {
      if (this.isShowingAllEntries || this.isLoadingMore) return;

      this.isLoadingMore = true;
      this.limit += INCREMENT;
      await this.bindEntries({
        mutateQuery: this.challengeId
          ? (query) => query.where('challengeId', '==', this.challengeId)
          : undefined,
        limit: this.limit,
        options: {
          wait: true,
        },
      });
      this.isLoadingMore = false;
    },
  },
  components: {
    AnimatedNumber,
    ActivityTimelineItem,
  },
  directives: {
    infiniteScroll,
  },
});
</script>
