<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '@/stores/app'

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
  <div class="ScotDanceAccount text-center text-caption text-medium-emphasis">
    <template v-if="store.isSignedIn">
      Signed in as <strong>{{ who }}</strong>
      <v-btn
        variant="text"
        size="small"
        class="text-none"
        :loading="isBusy"
        @click="handleSignOut()"
      >
        Sign out
      </v-btn>
    </template>
    <template v-else>
      <v-btn
        variant="text"
        size="small"
        color="primary"
        class="text-none"
        prepend-icon="mdi-account-circle-outline"
        :loading="isBusy"
        @click="handleSignIn()"
      >
        Sign in with ScotDance.app
      </v-btn>
      <div>to keep your entries on all your devices</div>
    </template>

    <v-snackbar v-model="hasMessage">{{ message }}</v-snackbar>
  </div>
</template>
