<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import AppToast from '@/components/AppToast.vue'
import ChallengeInfo from '@/components/ChallengeInfo.vue'
import EditChallenge, { type EditableChallenge } from '@/components/EditChallenge.vue'
import InstallSheet from '@/components/InstallSheet.vue'
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
    store.bindClimb(challengeId || undefined)
  },
  { immediate: true },
)

crisp('set', 'session:data', [[['AppVersion', version]]])
// a striped background says "not the live app": on the page itself, so it covers every screen
if (isUsingEmulators) document.documentElement.classList.add('debug-stripes')
store.bindChallenges()

async function handleAddChallenge(challenge: EditableChallenge) {
  try {
    const id = await store.addChallenge(challenge)
    store.challengeToEdit = null
    router.push({ name: 'new', params: { challengeId: id } })
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
  <div class="min-h-dvh text-fg">
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

    <InstallSheet />

    <AppToast />
  </div>
</template>

<style>
html.debug-stripes body {
  background-color: transparent;
}
html.debug-stripes {
  background-image: repeating-linear-gradient(
    -45deg,
    #0001,
    #0001 5px,
    transparent 0,
    transparent 10px
  );
}
</style>
