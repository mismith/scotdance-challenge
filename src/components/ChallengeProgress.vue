<template>
  <div v-if="status" class="ChallengeProgress">
    <v-progress-linear
      :value="percentComplete < 0 ? 100 : percentComplete"
      height="40"
      :striped="percentComplete < 0 || percentComplete > 100"
    >
      <v-chip
        color="rgba(0, 0, 0, 0.5)"
        dark
        style="height: 24px;"
      >
        <div>
          This {{ $root.labels.Challenge.toLowerCase() }}
          {{ status }}
          <strong>{{ distance }}</strong>
        </div>
      </v-chip>
    </v-progress-linear>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import {
  parse,
  startOfDay,
  endOfDay,
  differenceInMilliseconds,
  formatDistanceStrict,
  isBefore,
  isAfter,
} from 'date-fns';
import { Challenge } from '../plugins/firebase';

export default Vue.extend({
  name: 'ChallengeProgress',
  props: {
    challenge: Object,
  },
  computed: {
    startDate() {
      if (this.challenge && (this.challenge as Challenge).startAt) {
        return startOfDay(parse(this.challenge.startAt, 'yyyy-MM-dd', new Date()));
      }
      return null;
    },
    endDate() {
      if (this.challenge && (this.challenge as Challenge).endAt) {
        return endOfDay(parse(this.challenge.endAt, 'yyyy-MM-dd', new Date()));
      }
      return null;
    },
    status() {
      if (this.startDate && isAfter((this as any).startDate, new Date())) {
        return 'starts';
      }
      if (this.endDate && isBefore((this as any).endDate, new Date())) {
        return 'ended';
      }
      if (this.startDate || this.endDate) {
        return 'ends';
      }
      return null;
    },
    distance() {
      if (this.endDate) {
        return formatDistanceStrict((this as any).endDate, new Date(), { addSuffix: true });
      }
      return null;
    },
    percentComplete() {
      if (this.startDate && this.endDate) {
        const elapsed = differenceInMilliseconds(new Date(), (this as any).startDate);
        const total = differenceInMilliseconds((this as any).endDate, (this as any).startDate);
        return Math.round((elapsed / total) * 100);
      }
      return null;
    },
  },
});
</script>
