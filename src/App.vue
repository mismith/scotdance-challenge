<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import AppToast from '@/components/AppToast.vue'
import ChallengeInfo from '@/components/ChallengeInfo.vue'
import EditChallenge, { type EditableChallenge } from '@/components/EditChallenge.vue'
import ShareChallenge from '@/components/ShareChallenge.vue'
import { version } from '../package.json'
import { isUsingEmulators } from '@/lib/firebase'
import { crisp } from '@/lib/utils'

const store = useAppStore()
const router = useRouter()

watch(
  () => store.challengeId,
  (challengeId) => {
    store.bindGroups(challengeId || undefined)
    store.bindParticipants(challengeId || undefined)
  },
  { immediate: true },
)

crisp('set', 'session:data', [[['AppVersion', version]]])
store.bindChallenges()

async function handleAddChallenge(challenge: EditableChallenge) {
  try {
    const id = await store.addChallenge(challenge)
    store.challengeId = id
    store.challengeToEdit = null
    router.push({ name: 'new' })
  } catch (error) {
    store.notifyFailed(error)
  }
}
async function handleSaveChallenge(challenge: EditableChallenge) {
  const id = store.challengeToEdit?.id
  try {
    if (id) await store.saveChallenge(id, challenge)
    store.challengeToEdit = null
  } catch (error) {
    store.notifyFailed(error)
  }
}

const isLinkDialogOpen = computed({
  get: () =>
    Boolean(store.currentChallenge) && (store.isPrivateDialogOpen || store.isPublicDialogOpen),
  set(open) {
    if (!open) store.isPrivateDialogOpen = store.isPublicDialogOpen = false
  },
})
</script>

<template>
  <div class="min-h-dvh bg-paper text-ink" :class="{ 'debug-stripes': isUsingEmulators }">
    <router-view />

    <EditChallenge
      v-model="store.challengeToEdit"
      @add="handleAddChallenge"
      @save="handleSaveChallenge"
    />

    <template v-if="store.currentChallenge">
      <ChallengeInfo v-model="store.isInfoDialogOpen" :challenge="store.currentChallenge" />

      <ShareChallenge v-model="isLinkDialogOpen" :challenge="store.currentChallenge" />
    </template>

    <AppToast />
  </div>
</template>

<style>
.debug-stripes {
  background-image: repeating-linear-gradient(
    -45deg,
    #0001,
    #0001 5px,
    transparent 0,
    transparent 10px
  );
}
</style>
