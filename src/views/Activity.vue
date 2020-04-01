<template>
  <div class="Activity flex-page pr-6" :class="{ 'pl-6': !$vuetify.breakpoint.smAndDown }">
    <Loader v-if="loading" class="ma-auto" />
    <div v-else-if="!entries.length" class="d-flex flex-column align-center ma-auto">
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
  },
  data() {
    return {
      idKey,
      offset: INCREMENT,
    };
  },
  computed: {
    groupedEntries() {
      const groupedEntries = [...this.entries];
      groupedEntries.reverse();
      return groupedEntries.slice(0, this.offset);
    },
  },
  methods: {
    handleInfinite() {
      if (this.offset < this.entries.length) {
        this.offset += INCREMENT;
      }
    },
  },
  components: {
    Loader,
  },
});
</script>
