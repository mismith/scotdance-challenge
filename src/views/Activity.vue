<template>
  <div class="Activity pr-6" :class="{ 'pl-6': !$vuetify.breakpoint.smAndDown }">
    <v-timeline :dense="$vuetify.breakpoint.smAndDown">
      <v-timeline-item
        v-for="entry in groupedEntries"
        :key="entry[idKey]"
        small
        :color="entry.$group.color"
        :left="entry.$direction === 'left'"
        :right="entry.$direction === 'right'"
      >
        <v-card>
          <v-card-title class="d-flex align-start justify-space-between">
            <big>+{{ entry.value }}</big>
            <small v-if="challenges.length > 1" class="overline">
              {{ entry.$challenge.name }}
            </small>
          </v-card-title>
          <v-card-text>
            by <strong>{{ entry.$participant.name }}</strong>
            of <strong>{{ entry.$group.name }}</strong>
            at <strong>{{ entry.createdAt.toDate().toLocaleString() }}</strong>
          </v-card-text>
        </v-card>
      </v-timeline-item>
    </v-timeline>
  </div>
</template>

<script>
import Vue from 'vue';
import { idKey } from '@/plugins/firebase';
// import { toDateStr } from '@/utils';

export default Vue.extend({
  name: 'Activity',
  props: {
    firestoreRefs: Object,
    challenges: Array,
    groups: Array,
    participants: Array,
    entries: Array,
    compliments: Array,
  },
  data() {
    return {
      idKey,
    };
  },
  computed: {
    groupedEntries() {
      return this.entries
        .map((entry) => entry)
        /* (entry, i, a) => {
          let dir = 'left';
          if (i) {
            const prev = a[i - 1];
            if (toDateStr(prev.createdAt.toDate()) === toDateStr(entry.createdAt.toDate())) {
              dir = prev.$direction;
            } else {
              dir = prev.$direction === 'left' ? 'right' : 'left';
            }
          }
          entry.$direction = dir; // eslint-disable-line no-param-reassign
          return entry;
        } */
        .reverse();
    },
  },
});
</script>
