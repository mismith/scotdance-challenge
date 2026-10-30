<script setup lang="ts">
import { differenceInMilliseconds, formatDistanceStrict, isAfter } from 'date-fns'
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { getChallengeEndDate, getChallengeStartDate } from '@/lib/date'
import type { Challenge } from '@/lib/firebase'

const props = defineProps<{ challenge: Challenge }>()
const store = useAppStore()

const startDate = computed(() => getChallengeStartDate(props.challenge))
const endDate = computed(() => getChallengeEndDate(props.challenge))

const status = computed(() => {
  const now = new Date()
  if (startDate.value) {
    const distance = formatDistanceStrict(startDate.value, now, { addSuffix: true })
    if (isAfter(startDate.value, now)) return ['starts', distance]
    if (!endDate.value) return ['started', distance]
  }
  if (endDate.value) {
    const distance = formatDistanceStrict(endDate.value, now, { addSuffix: true })
    return [isAfter(endDate.value, now) ? 'ends' : 'ended', distance]
  }
  return null
})

const percentComplete = computed(() => {
  if (!startDate.value || !endDate.value) return 0
  const elapsed = differenceInMilliseconds(new Date(), startDate.value)
  const total = differenceInMilliseconds(endDate.value, startDate.value)
  return Math.round((elapsed / total) * 100)
})
</script>

<template>
  <div v-if="status" class="ChallengeProgress">
    <v-progress-linear
      :model-value="percentComplete < 0 ? 100 : percentComplete"
      height="40"
      color="primary"
      :striped="percentComplete < 0 || percentComplete > 100"
    >
      <v-chip color="rgba(0, 0, 0, 0.5)" variant="flat" class="text-white" size="small">
        <div>
          This {{ store.label('Challenge').toLowerCase() }}
          {{ status[0] }}
          <strong>{{ status[1] }}</strong>
        </div>
      </v-chip>
    </v-progress-linear>
  </div>
</template>
