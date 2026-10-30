<script setup lang="ts">
import { CircleUserRound, LoaderCircle, UserRound } from 'lucide-vue-next'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import ScotDanceMark from '@/components/ScotDanceMark.vue'

defineOptions({ inheritAttrs: false })
const store = useAppStore()

const isOpen = ref(false)
const isBusy = ref(false)
const who = computed(() => store.me?.displayName || store.me?.email || 'ScotDance.app')
const initial = computed(() => who.value.trim().charAt(0).toUpperCase())

async function handleSignIn() {
  isOpen.value = false
  try {
    isBusy.value = true
    const result = await store.signIn()
    if (!result) return
    const moved = result.movedEntries
    store.notify(
      moved
        ? `Signed in as ${who.value}. ${moved} ${moved === 1 ? 'entry' : 'entries'} moved to your account.`
        : `Signed in as ${who.value}`,
    )
  } catch (error) {
    console.warn(error)
    store.notify("Couldn't sign in. Please try again.")
  } finally {
    isBusy.value = false
  }
}
async function handleSignOut() {
  isOpen.value = false
  try {
    isBusy.value = true
    await store.signOut()
  } finally {
    isBusy.value = false
  }
}
</script>

<template>
  <PopoverRoot v-model:open="isOpen">
    <PopoverTrigger
      class="btn btn-icon btn-ghost size-11"
      aria-label="Account"
      :disabled="isBusy"
      v-bind="$attrs"
    >
      <LoaderCircle v-if="isBusy" :size="24" :stroke-width="2.6" class="animate-spin" />
      <CircleUserRound v-else-if="store.isSignedIn" :size="24" :stroke-width="2.6" />
      <UserRound v-else :size="24" :stroke-width="2.6" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        align="end"
        :side-offset="8"
        :collision-padding="12"
        class="ScotDanceAccount popover z-[60] w-[300px] rounded-[24px] bg-white p-4 text-ink shadow-float"
      >
        <template v-if="store.isSignedIn">
          <div class="mb-3 flex items-center gap-3">
            <span class="avatar anim-pop bg-lime" aria-hidden="true">{{ initial }}</span>
            <p class="min-w-0 text-[15px] leading-snug font-medium text-muted">
              Signed in as
              <strong class="block truncate text-[17px] font-extrabold text-ink">{{ who }}</strong>
            </p>
          </div>
          <p class="mb-4 text-[15px] leading-snug font-medium text-muted">
            Your entries are on all your devices.
          </p>
          <button
            type="button"
            class="btn btn-soft btn-sm w-full lowercase"
            @click="handleSignOut()"
          >
            Sign out
          </button>
        </template>
        <template v-else>
          <p class="hd mb-2 text-[24px] lowercase">Your entries are only on this device</p>
          <p class="mb-4 text-[15px] leading-snug font-medium text-muted">
            Sign in to keep them on all your devices, and edit them later.
          </p>
          <!-- ScotDance.app's own button, as on every tool: its blue, with Scott -->
          <button
            type="button"
            class="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1a6fd0] px-5 font-bold text-white transition-[scale] duration-300 ease-spring active:scale-[0.96]"
            @click="handleSignIn()"
          >
            <ScotDanceMark class="size-4" />
            Sign in with ScotDance.app
          </button>
        </template>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
