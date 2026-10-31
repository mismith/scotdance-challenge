<script setup lang="ts">
import { CircleUserRound, LoaderCircle, Moon, Sun, SunMoon, UserRound } from 'lucide-vue-next'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import ScotDanceMark from '@/components/ScotDanceMark.vue'
import { gravatarUrl } from '@/lib/gravatar'
import { isSignInEnabled } from '@/lib/scotdance'
import { themeChoice } from '@/lib/theme'

defineOptions({ inheritAttrs: false })
const store = useAppStore()

// light or dark, or whatever the device is set to
const themes = [
  { value: 'system', label: 'auto', icon: SunMoon },
  { value: 'light', label: 'light', icon: Sun },
  { value: 'dark', label: 'dark', icon: Moon },
] as const

const isOpen = ref(false)
const isBusy = ref(false)
const who = computed(() => store.me?.displayName || store.me?.email || 'ScotDance.app')
const initial = computed(() => who.value.trim().charAt(0).toUpperCase())
// names can be shared, so the email says which account it is
const email = computed(() => (store.me?.displayName ? store.me.email : null))
// your Gravatar picture, as on ScotDance.app, or your initial
const picture = ref<string | null>(null)
watch(
  () => store.me?.email,
  async (address) => (picture.value = await gravatarUrl(address, 96)),
  { immediate: true },
)

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
      :aria-label="isSignInEnabled ? 'Account' : 'Settings'"
      :disabled="isBusy"
      v-bind="$attrs"
    >
      <LoaderCircle v-if="isBusy" :size="24" :stroke-width="2.6" class="animate-spin" />
      <img
        v-else-if="store.isSignedIn && picture"
        :src="picture"
        alt=""
        class="size-8 rounded-full object-cover"
      />
      <CircleUserRound v-else-if="store.isSignedIn" :size="24" :stroke-width="2.6" />
      <UserRound v-else :size="24" :stroke-width="2.6" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        align="end"
        :side-offset="8"
        :collision-padding="12"
        class="ScotDanceAccount popover z-[60] w-[300px] rounded-[24px] bg-card p-4 text-fg shadow-float"
      >
        <template v-if="isSignInEnabled && store.isSignedIn">
          <div class="mb-3 flex items-center gap-3">
            <img v-if="picture" :src="picture" alt="" class="avatar anim-pop object-cover" />
            <span v-else class="avatar anim-pop bg-lime" aria-hidden="true">{{ initial }}</span>
            <p class="min-w-0 text-[15px] leading-snug font-medium text-muted">
              Signed in as
              <strong class="block truncate text-[17px] font-extrabold text-fg">{{ who }}</strong>
              <span v-if="email" class="block truncate">{{ email }}</span>
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
        <template v-else-if="isSignInEnabled">
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

        <div :class="{ 'mt-4 border-t-2 border-line pt-4': isSignInEnabled }">
          <!-- one segmented control, like the challenge tabs -->
          <div
            role="radiogroup"
            aria-label="Appearance"
            class="grid grid-cols-3 gap-px rounded-full bg-chip p-px"
          >
            <button
              v-for="theme in themes"
              :key="theme.value"
              type="button"
              role="radio"
              :aria-checked="themeChoice === theme.value"
              class="hd flex h-11 items-center justify-center gap-1.5 rounded-full text-[15px] transition-colors duration-300"
              :class="
                themeChoice === theme.value ? 'bg-ink text-white' : 'text-muted hover:text-fg'
              "
              @click="themeChoice = theme.value"
            >
              <component :is="theme.icon" :size="16" :stroke-width="2.6" aria-hidden="true" />
              {{ theme.label }}
            </button>
          </div>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
