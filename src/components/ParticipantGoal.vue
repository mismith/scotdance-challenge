<script setup lang="ts">
import { Target } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { type ParticipantItem, useAppStore } from '@/stores/app'
import AppDialog from '@/components/AppDialog.vue'

const props = defineProps<{ participant: ParticipantItem }>()
const store = useAppStore()

const newGoal = ref<string | number | null>(null)
const isEditing = ref(false)

const total = computed(() => props.participant.$total ?? 0)
const goal = computed(() => props.participant.goal ?? null)
const progress = computed(() => (goal.value ? Math.min(1, total.value / goal.value) : 0))
const canEdit = computed(() => store.canModerate(props.participant))
const isNewGoalValid = computed(() => {
  const value = Number(newGoal.value)
  return !newGoal.value || (Number.isInteger(value) && value > 0)
})

function startEditing() {
  newGoal.value = goal.value
  isEditing.value = true
}
async function saveGoal() {
  if (!isNewGoalValid.value) return
  try {
    await store.setGoal(props.participant.id, Number(newGoal.value) || null)
    isEditing.value = false
  } catch (error) {
    store.notifyFailed(error)
  }
}
</script>

<template>
  <div v-if="goal || canEdit" class="flex items-center gap-3 px-1.5">
    <template v-if="goal">
      <div
        class="h-2.5 flex-1 overflow-hidden rounded-full bg-chip"
        role="progressbar"
        :aria-valuenow="total"
        aria-valuemin="0"
        :aria-valuemax="goal"
        :aria-label="`${participant.name}'s goal`"
      >
        <div
          class="h-full rounded-full transition-[width] duration-500"
          :class="progress >= 1 ? 'bg-pink' : 'bg-violet'"
          :style="{ width: `${progress * 100}%` }"
        />
      </div>
      <span class="num shrink-0 text-[13px] font-extrabold text-muted">
        {{ total.toLocaleString() }} / {{ goal.toLocaleString() }}
      </span>
    </template>
    <button
      v-if="canEdit"
      type="button"
      class="flex shrink-0 items-center gap-1 text-[13px] font-extrabold text-violet"
      @click="startEditing()"
    >
      <Target v-if="!goal" :size="15" :stroke-width="2.6" aria-hidden="true" />
      {{ goal ? 'change' : 'set a goal' }}
    </button>

    <AppDialog v-model="isEditing" :title="`${participant.name}'s goal`">
      <template #title-icon><Target :size="24" :stroke-width="2.6" class="text-pink" /></template>
      <form autocomplete="off" class="flex flex-col gap-4" @submit.prevent="saveGoal()">
        <div class="flex flex-col gap-1.5">
          <label for="participant-goal" class="lbl lowercase"
            >Total {{ store.label('Amount') }}</label
          >
          <input
            id="participant-goal"
            v-model="newGoal"
            type="number"
            inputmode="numeric"
            step="1"
            min="1"
            placeholder="e.g. 500"
            class="pill num text-[28px] font-black tracking-[-0.035em] italic"
            :aria-invalid="!isNewGoalValid"
          />
        </div>
        <button type="submit" class="btn btn-primary btn-lg" :disabled="!isNewGoalValid">
          save
        </button>
      </form>
    </AppDialog>
  </div>
</template>
