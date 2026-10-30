<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import ScotDanceMark from '@/components/ScotDanceMark.vue'

const store = useAppStore()

const isBusy = ref(false)
const message = ref<string | null>(null)
const hasMessage = computed({
  get: () => Boolean(message.value),
  set: (on) => !on && (message.value = null),
})
const who = computed(() => store.me?.displayName || store.me?.email || 'ScotDance.app')

async function handleSignIn() {
  try {
    isBusy.value = true
    const result = await store.signIn()
    if (!result) return
    const moved = result.movedEntries
    message.value = moved
      ? `Signed in as ${who.value}. ${moved} ${moved === 1 ? 'entry' : 'entries'} moved to your account.`
      : `Signed in as ${who.value}`
  } catch (error) {
    console.warn(error)
    message.value = "Couldn't sign in. Please try again."
  } finally {
    isBusy.value = false
  }
}
async function handleSignOut() {
  try {
    isBusy.value = true
    await store.signOut()
  } finally {
    isBusy.value = false
  }
}
</script>

<template>
  <v-menu location="bottom end" max-width="296">
    <template #activator="{ props: menuProps }">
      <v-btn icon aria-label="Account" :loading="isBusy" v-bind="menuProps">
        <v-icon>{{ store.isSignedIn ? 'mdi-account-circle' : 'mdi-account-circle-outline' }}</v-icon>
      </v-btn>
    </template>

    <v-card class="ScotDanceAccount pa-4" rounded="lg">
      <template v-if="store.isSignedIn">
        <div class="text-subtitle-1 mb-1">
          Signed in as <strong>{{ who }}</strong>
        </div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          Your entries are on all your devices.
        </div>
        <v-btn rounded block variant="outlined" class="text-none" @click="handleSignOut()">
          Sign out
        </v-btn>
      </template>
      <template v-else>
        <div class="text-subtitle-1 font-weight-medium mb-1">
          Your entries are only on this device
        </div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          Sign in to keep them on all your devices, and edit them later.
        </div>
        <!-- ScotDance.app's own button, as on every tool: its blue, with Scott -->
        <v-btn
          rounded
          block
          variant="flat"
          color="#1a6fd0"
          class="ScotDanceAccount__sign-in text-none font-weight-bold"
          @click="handleSignIn()"
        >
          <template #prepend>
            <ScotDanceMark class="ScotDanceAccount__mark" />
          </template>
          Sign in with ScotDance.app
        </v-btn>
      </template>
    </v-card>
  </v-menu>

  <v-snackbar v-model="hasMessage">{{ message }}</v-snackbar>
</template>

<style>
.ScotDanceAccount__sign-in {
  letter-spacing: normal;
}
.ScotDanceAccount__mark {
  width: 16px;
  height: 16px;
}
</style>
