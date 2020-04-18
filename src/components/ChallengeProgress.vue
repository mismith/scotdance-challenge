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
          {{ status[0] }}
          <strong>{{ status[1] }}</strong>
        </div>
      </v-chip>
    </v-progress-linear>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { differenceInMilliseconds, formatDistanceStrict, isAfter } from 'date-fns';
import { getChallengeStartDate, getChallengeEndDate } from '@/services/date';

export default Vue.extend({
  name: 'ChallengeProgress',
  props: {
    challenge: Object,
  },
  computed: {
    startDate() {
      return getChallengeStartDate(this.challenge);
    },
    endDate() {
      return getChallengeEndDate(this.challenge);
    },
    status() {
      const { startDate, endDate } = (this as any);
      if (startDate) {
        const distance = formatDistanceStrict(startDate, new Date(), { addSuffix: true });
        if (isAfter(startDate, new Date())) {
          return ['starts', distance];
        }
        if (!endDate) {
          return ['started', distance];
        }
      }
      if (endDate) {
        const distance = formatDistanceStrict(endDate, new Date(), { addSuffix: true });
        if (isAfter(endDate, new Date())) {
          return ['ends', distance];
        }
        return ['ended', distance];
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
