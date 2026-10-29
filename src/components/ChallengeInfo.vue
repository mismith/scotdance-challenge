<script setup lang="ts">
import { isAfter } from 'date-fns'
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { getChallengeEndDate, getChallengeStartDate } from '@/lib/date'
import type { Challenge } from '@/lib/firebase'

const props = defineProps<{ challenge: Challenge }>()
const isOpen = defineModel<boolean>({ required: true })
const store = useAppStore()

const startDate = computed(() => getChallengeStartDate(props.challenge))
const endDate = computed(() => getChallengeEndDate(props.challenge))
const tense = (date: Date) => (isAfter(date, new Date()) ? 's' : 'ed')
</script>

<template>
  <v-dialog v-model="isOpen" max-width="320">
    <v-card class="ChallengeInfo">
      <v-card-title class="d-flex align-center">
        <div class="flex-grow-1">
          {{ store.label('Challenge') }} Info
          <v-icon color="primary" class="ml-1 mt-n1">mdi-information</v-icon>
        </div>
        <v-btn icon variant="text" density="comfortable" class="mr-n2" @click="isOpen = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="pb-0">
        <div class="mb-4">
          <div class="text-overline">Name</div>
          {{ challenge.name }}
        </div>
        <div v-if="challenge.description" class="mb-4">
          <div class="text-overline">Description</div>
          <div style="white-space: pre-wrap">{{ challenge.description }}</div>
        </div>
        <div v-if="startDate" class="mb-4">
          <div class="text-overline">Start{{ tense(startDate) }}</div>
          {{ startDate.toLocaleString() }}
        </div>
        <div v-if="endDate" class="mb-4">
          <div class="text-overline">End{{ tense(endDate) }}</div>
          {{ endDate.toLocaleString() }}
        </div>
        <div v-if="challenge.createdAt" class="mb-4">
          <div class="text-overline">Created</div>
          {{ challenge.createdAt.toDate().toLocaleString() }}
        </div>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-btn rounded size="large" block variant="flat" color="primary" @click="isOpen = false">
          Got It
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
