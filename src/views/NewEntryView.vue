<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import colors from 'vuetify/util/colors'
import { useAppStore } from '@/stores/app'
import AddCompliment from '@/components/AddCompliment.vue'
import AddNewTip from '@/components/AddNewTip.vue'
import AppPicker from '@/components/AppPicker.vue'
import ChallengeProgress from '@/components/ChallengeProgress.vue'
import EditGroup, { type NewGroup } from '@/components/EditGroup.vue'
import ScotDanceAccount from '@/components/ScotDanceAccount.vue'
import compliments from '@/lib/compliments'
import { isChallengeActive } from '@/lib/date'
import { capitalize } from '@/lib/strings'

const store = useAppStore()

const groupColors = [
  colors.red.base,
  colors.orange.base,
  colors.yellow.base,
  colors.green.base,
  colors.blue.base,
  colors.indigo.base,
  colors.purple.base,
]

const groupToEdit = ref<NewGroup | null>()
const value = ref<string | number | null>(null)
const isAddEntryLoading = ref(false)
const successMessage = ref<string | null>(null)

const relevantParticipants = computed(() =>
  store.participants.filter(({ groupId }) => groupId === store.groupId),
)
const isActive = computed(() => isChallengeActive(store.currentChallenge))
const isValid = computed(
  () =>
    Boolean(store.challengeId && store.groupId && store.participantId) &&
    Number(value.value) > 0 &&
    Number(value.value) <= 9999,
)
const hasSuccessMessage = computed({
  get: () => Boolean(successMessage.value),
  set(on) {
    if (!on) successMessage.value = null
  },
})

watch(
  () => store.challengeId,
  () => {
    store.groupId = ''
    store.participantId = ''
  },
)
watch(
  () => store.groupId,
  () => (store.participantId = ''),
)

function getRandomCompliment() {
  return compliments[Math.floor(Math.random() * compliments.length)]!
}

function addGroup(name: string) {
  groupToEdit.value = {
    name: capitalize(name),
    color: groupColors[store.groups.length % groupColors.length],
    challengeId: store.challengeId,
  }
}
async function handleAddGroup(group: NewGroup) {
  const { id } = await store.add('groups', group)
  store.groupId = id
  groupToEdit.value = null
}
function addParticipant(name: string) {
  return store.add('participants', {
    name: capitalize(name),
    challengeId: store.challengeId,
    groupId: store.groupId,
  })
}

async function handleAddEntry() {
  if (isAddEntryLoading.value) return // don't allow dupes
  if (!isValid.value) return
  if (!isActive.value) return // don't allow submissions to inactive challenges
  if (!store.currentChallenge) return

  try {
    isAddEntryLoading.value = true
    await store.add('entries', {
      challengeId: store.challengeId,
      groupId: store.groupId,
      participantId: store.participantId,
      value: Number(value.value) || 0,
    })
    value.value = null
    successMessage.value = getRandomCompliment()
  } finally {
    setTimeout(() => (isAddEntryLoading.value = false), 500)
  }
}
</script>

<template>
  <div class="NewEntryView flex-page">
    <div v-if="!store.currentChallenge" class="d-flex flex-column align-center ma-auto">
      <v-icon size="x-large" class="mb-3">mdi-chevron-up</v-icon>
      Select a {{ store.label('Challenge').toLowerCase() }} first
    </div>
    <template v-else>
      <ChallengeProgress :challenge="store.currentChallenge" />

      <v-form autocomplete="off" class="px-4 py-6" @submit.prevent="handleAddEntry()">
        <AppPicker
          v-model="store.groupId"
          :label="store.label('Group')"
          variant="outlined"
          rounded
          clearable
          :items="store.groups"
          item-title="$name"
          :disabled="!isActive || !store.challengeId"
          :add-new="addGroup"
        >
          <template #prepend-item>
            <AddNewTip :label="store.label('Group').toLowerCase()" />
          </template>
        </AppPicker>
        <EditGroup v-model="groupToEdit" @add="handleAddGroup" />

        <AppPicker
          v-model="store.participantId"
          :label="store.label('Participant')"
          variant="outlined"
          rounded
          clearable
          :items="relevantParticipants"
          item-title="name"
          :disabled="!isActive || !store.challengeId || !store.groupId"
          :add-new="addParticipant"
        >
          <template #prepend-item>
            <AddNewTip :label="store.label('Participant').toLowerCase()" />
          </template>
        </AppPicker>
        <v-text-field
          v-model="value"
          :label="store.label('Amount')"
          type="number"
          step="1"
          min="1"
          max="9999"
          variant="outlined"
          rounded
          :disabled="!isActive || !store.challengeId || !store.groupId || !store.participantId"
          :error="value !== undefined && value !== null && value !== '' && !isValid"
        />

        <v-btn
          type="submit"
          rounded
          size="x-large"
          block
          variant="flat"
          color="primary"
          :disabled="!isActive || !isValid"
          :loading="isAddEntryLoading"
        >
          Submit
        </v-btn>
      </v-form>

      <v-spacer />
      <AddCompliment class="d-flex justify-center pb-2" @message="successMessage = $event" />
      <ScotDanceAccount class="pb-6" />

      <v-snackbar v-model="hasSuccessMessage">
        <div class="text-h6 text-center ma-auto" style="text-transform: capitalize">
          {{ successMessage }}!
        </div>
      </v-snackbar>
    </template>
  </div>
</template>
