<template>
  <v-timeline-item
    :id="`entry-${entry[idKey]}`"
    small
    :color="group && group.color"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <big class="flex">+{{ entry.value }}</big>

        <template v-if="challenge">
          <small v-if="!challengeId && challenges.length > 1" class="overline">
            {{ challenge.name }}
          </small>
        </template>
        <v-skeleton-loader
          v-else
          type="text"
          width="48"
          style="display: inline-flex; vertical-align: middle; margin-bottom: -6px;"
        />

        <v-btn small icon class="ml-2" @click="$emit('flag', entry)">
          <v-icon small>mdi-flag-outline</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        by <strong v-if="participant">{{ participant.name }}</strong>
        <v-skeleton-loader
          v-else
          type="text"
          width="48"
          style="display: inline-flex; vertical-align: middle; margin-bottom: -6px;"
        />
        of <strong v-if="group">{{ group.name }}</strong>
        <v-skeleton-loader
          v-else
          type="text"
          width="48"
          style="display: inline-flex; vertical-align: middle; margin-bottom: -6px;"
        />
        at <strong>{{ entry.createdAt.toDate().toLocaleString() }}</strong>
      </v-card-text>
    </v-card>
  </v-timeline-item>
</template>

<script>
import Vue from 'vue';
import { mapGetters } from 'vuex';
import { firestoreRefs, idKey } from '@/plugins/firebase';

export default Vue.extend({
  name: 'ActivityTimelineItem',
  props: {
    entry: Object,
    challengeId: String,
  },
  data() {
    return {
      idKey,

      challenge: null,
      group: null,
      participant: null,
    };
  },
  computed: {
    ...mapGetters([
      'challenges',
    ]),
  },
  watch: {
    entry: {
      handler(entry) {
        this.$bind('challenge', firestoreRefs.challenges.doc(entry.challengeId));
        this.$bind('group', firestoreRefs.groups.doc(entry.groupId));
        this.$bind('participant', firestoreRefs.participants.doc(entry.participantId));
      },
      immediate: true,
    },
  },
});
</script>
