<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type ChallengeItem, useAppStore } from '@/stores/app'
import AddNewTip from '@/components/AddNewTip.vue'
import AppLoader from '@/components/AppLoader.vue'
import AppPicker, { ADD_NEW_KEY } from '@/components/AppPicker.vue'
import ChallengeInfo from '@/components/ChallengeInfo.vue'
import EditChallenge, { type EditableChallenge } from '@/components/EditChallenge.vue'
import ScotDanceAccount from '@/components/ScotDanceAccount.vue'
import { version } from '../package.json'
import { type Challenge, isUsingEmulators } from '@/lib/firebase'
import { capitalize, pluralize } from '@/lib/strings'
import { crisp } from '@/lib/utils'

const store = useAppStore()
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const challengeToEdit = ref<Partial<Challenge> | null>()
const isShowingAllChallenges = ref(false)
const hasCopied = ref(false)
const canCopy = typeof window.navigator.clipboard?.writeText === 'function'

const relevantChallenges = computed(() =>
  store.challenges.filter(
    (challenge) =>
      challenge.$isActive ||
      challenge.$isUpcoming ||
      challenge.$isRecentlyEnded ||
      challenge.id === store.currentChallenge?.id,
  ),
)
const challengesForPicker = computed(() =>
  isShowingAllChallenges.value ? store.challenges : relevantChallenges.value,
)
const hiddenChallengeCount = computed(
  () => store.challenges.length - relevantChallenges.value.length,
)
const isMyChallenge = computed(() =>
  Boolean(store.me && store.me.uid === store.currentChallenge?.createdBy),
)

function getStatus(challenge: ChallengeItem) {
  if (challenge.$isUpcoming) return 'Upcoming'
  if (challenge.$isRecentlyEnded) return 'Recently Ended'
  return 'Inactive'
}

watch(
  () => store.challengeId,
  async (challengeId) => {
    loading.value = true
    await Promise.all([
      store.bindGroups(challengeId || undefined),
      store.bindParticipants(challengeId || undefined),
    ])
    loading.value = false
  },
  { immediate: true },
)

crisp('set', 'session:data', [[['AppVersion', version]]])
store.bindChallenges().then(() => {
  // auto-pick the challenge if it's the only one
  if (!store.challengeId && store.challenges.length === 1) {
    store.challengeId = store.challenges[0]!.id
  }
})

async function handleAddChallenge(challenge: EditableChallenge) {
  const id = await store.addChallenge(challenge)
  store.challengeId = id
  challengeToEdit.value = undefined
}
async function handleSaveChallenge(challenge: EditableChallenge) {
  const id = challengeToEdit.value?.id
  if (id) await store.saveChallenge(id, challenge)
  challengeToEdit.value = undefined
}

function getChallengeUrl(challenge: Challenge) {
  const { href } = router.resolve({
    name: challenge.private ? 'private' : 'public',
    params: { challengeId: challenge.id },
  })
  return `${window.location.origin}${href}`
}
function handleCopy(text: string) {
  window.navigator.clipboard.writeText(text)
  hasCopied.value = true
}

// select the link so it's ready to copy
const urlField = useTemplateRef<{ $el: HTMLElement }>('urlField')
watch([() => store.isPrivateDialogOpen, () => store.isPublicDialogOpen], async (open) => {
  if (open.some(Boolean)) {
    await nextTick()
    urlField.value?.$el.querySelector('input')?.select()
  }
})
</script>

<template>
  <v-app class="App" :class="{ isDebugging: isUsingEmulators }">
    <v-app-bar v-if="route.name !== 'home'" color="primary" height="56" flat>
      <AppPicker
        v-model="store.challengeId"
        :label="store.label('Challenge')"
        :placeholder="`Select ${store.label('Challenge')}`"
        variant="solo"
        density="compact"
        rounded
        clearable
        hide-details
        single-line
        :items="challengesForPicker"
        item-title="name"
        :add-new="(name: string) => (challengeToEdit = { name: capitalize(name) })"
        auto-select-first
        class="App__challenge-picker mx-2"
      >
        <template #prepend-item>
          <AddNewTip :label="store.label('Challenge').toLowerCase()" />
        </template>
        <template #item="{ item, props: itemProps }">
          <v-list-item
            v-bind="itemProps"
            :style="{
              opacity: !item.raw.$isActive && item.raw.id !== ADD_NEW_KEY ? 0.5 : undefined,
            }"
          >
            <template #title>
              <span>{{ item.title }}</span>
              <v-icon v-if="item.raw.private" class="ml-2" size="small">mdi-shield-lock</v-icon>
              <em
                v-if="!item.raw.$isActive && item.raw.id !== ADD_NEW_KEY"
                class="text-caption ml-2"
              >
                {{ getStatus(item.raw) }}
              </em>
            </template>
          </v-list-item>
        </template>
        <template #append-item>
          <div
            v-if="!isShowingAllChallenges && hiddenChallengeCount > 0"
            class="text-caption text-center px-4 my-2"
          >
            <v-chip size="small" @click="isShowingAllChallenges = true">
              Show {{ hiddenChallengeCount }} more inactive
              {{ pluralize(hiddenChallengeCount, store.label('Challenge').toLowerCase()) }}
            </v-chip>
          </div>
        </template>
      </AppPicker>
      <EditChallenge
        v-model="challengeToEdit"
        @add="handleAddChallenge"
        @save="handleSaveChallenge"
      />

      <template v-if="store.currentChallenge">
        <v-btn
          v-if="store.currentChallenge.private"
          icon
          aria-label="Private"
          @click="store.isPrivateDialogOpen = true"
        >
          <v-icon>mdi-shield-lock</v-icon>
        </v-btn>
        <v-btn v-else icon aria-label="Share" @click="store.isPublicDialogOpen = true">
          <v-icon>mdi-share</v-icon>
        </v-btn>

        <v-btn
          v-if="isMyChallenge"
          icon
          aria-label="Edit"
          @click="challengeToEdit = store.currentChallenge"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <template v-else>
          <ChallengeInfo v-model="store.isInfoDialogOpen" :challenge="store.currentChallenge" />
          <v-btn icon aria-label="Info" @click="store.isInfoDialogOpen = true">
            <v-icon>mdi-information-outline</v-icon>
          </v-btn>
        </template>
      </template>
      <ScotDanceAccount />
    </v-app-bar>

    <template v-if="store.currentChallenge">
      <v-dialog
        :model-value="store.isPrivateDialogOpen || store.isPublicDialogOpen"
        max-width="320"
        @update:model-value="store.isPrivateDialogOpen = store.isPublicDialogOpen = $event"
      >
        <v-card>
          <v-card-title class="d-flex align-center">
            <div v-if="store.currentChallenge.private" class="flex-grow-1">
              Private {{ store.label('Challenge') }}
              <v-icon color="primary" class="ml-1 mt-n1">mdi-shield-lock</v-icon>
            </div>
            <div v-else class="flex-grow-1">
              Share {{ store.label('Challenge') }}
              <v-icon color="primary" class="ml-1 mt-n1">mdi-share</v-icon>
            </div>
            <v-btn
              icon
              variant="text"
              density="comfortable"
              class="mr-n2"
              @click="store.isPrivateDialogOpen = store.isPublicDialogOpen = false"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text class="pb-0">
            <p v-if="store.currentChallenge.private" class="mb-6">
              This {{ store.label('Challenge').toLowerCase() }} can only be 'unlocked' when accessed
              from the link below:
            </p>
            <p v-else class="mb-6">
              This {{ store.label('Challenge').toLowerCase() }} can be accessed directly using the
              following link:
            </p>

            <div class="d-flex align-center mb-4">
              <v-text-field
                ref="urlField"
                :model-value="getChallengeUrl(store.currentChallenge)"
                label="Access Link"
                variant="outlined"
                rounded
                readonly
                hide-details
              />
              <v-btn
                v-if="canCopy"
                icon
                variant="text"
                class="ml-1"
                aria-label="Copy"
                @click="handleCopy(getChallengeUrl(store.currentChallenge))"
              >
                <v-icon>mdi-content-copy</v-icon>
              </v-btn>
            </div>

            <p v-if="store.currentChallenge.private">
              <strong>Do not share this link publicly</strong> &mdash;<br />
              anyone who visits it will gain entry.
            </p>
          </v-card-text>
          <v-card-actions class="pa-4">
            <v-btn
              rounded
              size="large"
              block
              variant="flat"
              color="primary"
              @click="store.isPrivateDialogOpen = store.isPublicDialogOpen = false"
            >
              Got It
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>

    <v-snackbar v-model="hasCopied">
      <v-icon color="success">mdi-check</v-icon>
      Copied to clipboard
    </v-snackbar>

    <v-main class="App__main">
      <AppLoader v-if="route.name !== 'home' && loading" class="ma-auto" />
      <router-view v-show="route.name === 'home' || !loading" />
    </v-main>

    <v-bottom-navigation grow mode="shift" color="primary" class="App__nav">
      <v-btn :to="{ name: 'activity' }">
        <v-icon>mdi-chart-timeline-variant</v-icon>
        <span>Activity</span>
      </v-btn>
      <v-btn :to="{ name: 'new' }" variant="flat" color="primary" class="App__nav-new">
        <v-icon size="large">mdi-plus</v-icon>
        <span>New</span>
      </v-btn>
      <v-btn :to="{ name: 'statistics' }">
        <v-icon>mdi-poll</v-icon>
        <span>Stats</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<style>
html,
body {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
}

@media (max-width: 768px) {
  #crisp-chatbox {
    z-index: 200; /* below dialogs */

    a[aria-label='Open chat'],
    a[aria-label='Close chat'] {
      margin-bottom: calc(56px + env(safe-area-inset-bottom)) !important;
    }
  }
}

.App {
  .App__main {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
  }

  .v-app-bar {
    padding-top: env(safe-area-inset-top);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }

  .App__nav.v-bottom-navigation {
    height: calc(56px + env(safe-area-inset-bottom)) !important;
    padding-bottom: env(safe-area-inset-bottom);
    overflow: visible;

    .App__nav-new {
      height: 110% !important;
      align-self: flex-end;
      border-radius: 4px 4px 0 0;
      color: #fff !important;
      background: rgb(var(--v-theme-primary)) !important;
    }
  }

  &.isDebugging .App__nav.v-bottom-navigation {
    background-image: repeating-linear-gradient(
      -45deg,
      #0001,
      #0001 5px,
      transparent 0,
      transparent 10px
    );
  }

  /* Vuetify 2's grey disabled buttons */
  .v-btn--disabled.v-btn--variant-flat {
    background: rgba(0, 0, 0, 0.12) !important;
    color: rgba(0, 0, 0, 0.26) !important;
  }

  .flex-page {
    display: flex;
    flex-direction: column;
    flex: auto;
  }
}
</style>
