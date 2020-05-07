<template>
  <v-dialog v-model="isOpen" max-width="320">
    <v-card class="ChallengeInfo">
      <v-form>
        <v-card-title>
          <div class="flex">
            Challenge Info
            <v-icon color="primary" class="ml-1 mt-n1">mdi-information</v-icon>
          </div>
          <v-btn icon class="mr-n1" @click="isOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text v-if="challenge" class="pb-0">
          <div class="mb-4">
            <div class="overline">Name</div>
            {{ challenge.name }}
          </div>
          <div v-if="startDate" class="mb-4">
            <div class="overline">Start{{ isAfter(startDate, new Date()) ? 's' : 'ed' }}</div>
            {{ startDate.toLocaleString() }}
          </div>
          <div v-if="endDate" class="mb-4">
            <div class="overline">End{{ isAfter(endDate, new Date()) ? 's' : 'ed' }}</div>
            {{ endDate.toLocaleString() }}
          </div>
          <div v-if="challenge.createdAt" class="mb-4">
            <div class="overline">Created</div>
            {{ challenge.createdAt.toDate().toLocaleString() }}
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn rounded large block color="primary" @click="isOpen = false">
            Got It
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Vue from 'vue';
import { isAfter } from 'date-fns';
import { idKey } from '@/plugins/firebase';
import { getChallengeStartDate, getChallengeEndDate } from '@/services/date';

export default Vue.extend({
  name: 'ChallengeInfo',
  props: {
    value: Boolean,
    challenge: Object,
  },
  data: () => ({
    idKey,
  }),
  computed: {
    isOpen: {
      get() {
        return this.value;
      },
      set(isOpen) {
        if (!isOpen) {
          this.$emit('input', null);
        }
      },
    },

    startDate() {
      return getChallengeStartDate(this.challenge);
    },
    endDate() {
      return getChallengeEndDate(this.challenge);
    },
  },
  methods: {
    isAfter,
  },
});
</script>
