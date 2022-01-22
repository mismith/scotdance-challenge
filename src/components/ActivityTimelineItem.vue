<template>
  <v-timeline-item
    :id="`entry-${entry[idKey]}`"
    small
    :color="group && group.color"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <big class="flex">+{{ entry.value.toLocaleString() }}</big>

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

        <v-btn
          v-if="me && (me.uid === entry.createdBy)"
          small
          icon
          class="ml-2"
          @click="$emit('delete', entry)"
        >
          <v-icon small>mdi-delete-outline</v-icon>
        </v-btn>
        <v-btn
          v-else
          small
          icon
          class="ml-2"
          @click="$emit('flag', entry)"
        >
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
        of <strong v-if="group">
          {{ group.name }}
          <span v-if="group.country">{{ getEmojiFlag(group.country) }}</span>
        </strong>
        <v-skeleton-loader
          v-else
          type="text"
          width="48"
          style="display: inline-flex; vertical-align: middle; margin-bottom: -6px;"
        />
        at <strong v-if="entry.createdAt">
          {{ entry.createdAt.toDate().toLocaleString() }}
        </strong>
        <v-skeleton-loader
          v-else
          type="text"
          width="48"
          style="display: inline-flex; vertical-align: middle; margin-bottom: -6px;"
        />
      </v-card-text>
    </v-card>
  </v-timeline-item>
</template>

<script>
import Vue from 'vue';
import { mapGetters, mapState } from 'vuex';
import { getEmojiFlag } from '@/services/country';
import { idKey, findByIdKey } from '@/plugins/firebase';

export default Vue.extend({
  name: 'ActivityTimelineItem',
  props: {
    entry: Object,
  },
  data() {
    return {
      idKey,
    };
  },
  computed: {
    ...mapState([
      'me',
      'challengeId',
    ]),
    ...mapGetters([
      'challenges',
      'groups',
      'participants',
    ]),

    challenge() {
      return this.entry && findByIdKey(this.challenges, this.entry.challengeId);
    },
    group() {
      return this.entry && findByIdKey(this.groups, this.entry.groupId);
    },
    participant() {
      return this.entry && findByIdKey(this.participants, this.entry.participantId);
    },
  },
  methods: {
    getEmojiFlag,
  },
});
</script>
