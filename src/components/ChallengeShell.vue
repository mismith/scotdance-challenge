<script setup lang="ts">
// a challenge's header and log / activity / stats tabs, around whichever tab is open: the
// layout route for all three, so it stays mounted (and focus stays on its tabs) as they switch
import { formatDistanceStrict, isAfter } from 'date-fns'
import { ChevronLeft, Info, Lock, Pencil, Share } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import AnimatedNumber from '@/components/AnimatedNumber.vue'
import HelpButton from '@/components/HelpButton.vue'
import Ribbons from '@/components/Ribbons.vue'
import ScotDanceAccount from '@/components/ScotDanceAccount.vue'
import { getChallengeEndDate, getChallengeStartDate } from '@/lib/date'
import { prefersReducedMotion } from '@/lib/motion'
import { pluralize } from '@/lib/strings'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const challenge = computed(() => store.currentChallenge)

const isMine = computed(() =>
  Boolean(store.me && challenge.value && store.me.uid === challenge.value.createdBy),
)
const startDate = computed(() => getChallengeStartDate(challenge.value))
const endDate = computed(() => getChallengeEndDate(challenge.value))

const status = computed(() => {
  const now = new Date()
  const distance = (date: Date) => formatDistanceStrict(date, now, { roundingMethod: 'floor' })
  if (startDate.value && isAfter(startDate.value, now))
    return { tone: 'soon', text: `starts in ${distance(startDate.value)}` }
  if (endDate.value) {
    return isAfter(endDate.value, now)
      ? { tone: 'live', text: `${distance(endDate.value)} left` }
      : { tone: 'ended', text: `ended ${distance(endDate.value)} ago` }
  }
  return null
})

// the challenge's climb, in its own group colours (Ribbons tops them up from its palette)
const colors = computed(() => store.groups.map((group) => group.color))

const tabs = [
  { name: 'new', label: 'log' },
  { name: 'activity', label: 'activity' },
  { name: 'statistics', label: 'stats' },
]
const tabIndex = computed(() =>
  Math.max(
    0,
    tabs.findIndex((tab) => tab.name === route.name),
  ),
)
// each tab's content slides in from the side its tab is on
const slideFrom = ref(0)
watch(tabIndex, (index, previous) => (slideFrom.value = Math.sign(index - previous)))

// back goes back (so Explore is where you left it) when Explore is where you came from
function goBack() {
  const back = (window.history.state as { back?: unknown } | null)?.back
  if (typeof back === 'string' && back.split(/[?#]/)[0] === '/') router.back()
  else router.push({ name: 'home' })
}
// tapping the tab you're on takes you back to its top, as native tab bars do
function handleTabClick(index: number) {
  if (index !== tabIndex.value) return
  window.scrollTo({ top: 0, behavior: prefersReducedMotion.value ? 'auto' : 'smooth' })
}
</script>

<template>
  <!-- overflow-x-clip: tabs slide in from the side and must never widen the page (iOS zooms out) -->
  <div
    class="mx-auto flex min-h-dvh w-full max-w-xl flex-col overflow-x-clip pt-[env(safe-area-inset-top)]"
  >
    <template v-if="challenge">
      <!-- the app's own bar, as on Explore: back, help and you; the card is all this challenge -->
      <div class="flex items-center gap-1 px-3 pt-2.5">
        <router-link v-slot="{ href }" :to="{ name: 'home' }" custom>
          <a
            :href="href"
            class="btn btn-icon btn-ghost shrink-0 bg-chip"
            aria-label="All challenges"
            @click.prevent="goBack()"
          >
            <ChevronLeft :size="26" :stroke-width="2.8" />
          </a>
        </router-link>
        <span class="flex-1" />
        <HelpButton />
        <ScotDanceAccount class="bg-chip" />
      </div>

      <!-- the same on every tab, so switching tabs never moves the layout -->
      <header
        class="anim-rise on-color relative mx-3 mt-2 overflow-hidden rounded-[28px] bg-violet text-white"
      >
        <!-- the climb runs up behind the total, fading out under the words -->
        <div class="ChallengeShell-ribbons absolute inset-x-0 bottom-0 h-[92px]">
          <Ribbons variant="shell" :days="store.climbDays" :colors="colors" reveal />
        </div>
        <div class="relative flex items-start gap-0.5 pt-2 pr-2 pl-[18px]">
          <h1 class="hd min-w-0 flex-1 self-center py-1.5 text-[22px] [overflow-wrap:anywhere]">
            {{ challenge.name }}
          </h1>
          <div class="flex shrink-0 items-center">
            <button
              v-if="challenge.private"
              type="button"
              class="btn btn-icon btn-ghost"
              aria-label="Private"
              @click="store.isPrivateDialogOpen = true"
            >
              <Lock :size="21" :stroke-width="2.6" />
            </button>
            <button
              v-else
              type="button"
              class="btn btn-icon btn-ghost"
              aria-label="Share"
              @click="store.isPublicDialogOpen = true"
            >
              <Share :size="21" :stroke-width="2.6" />
            </button>
            <button
              v-if="isMine"
              type="button"
              class="btn btn-icon btn-ghost"
              aria-label="Edit"
              @click="store.challengeToEdit = challenge"
            >
              <Pencil :size="21" :stroke-width="2.6" />
            </button>
            <button
              v-else
              type="button"
              class="btn btn-icon btn-ghost"
              aria-label="Info"
              @click="store.isInfoDialogOpen = true"
            >
              <Info :size="21" :stroke-width="2.6" />
            </button>
          </div>
        </div>

        <div class="relative flex items-center gap-3 pr-4 pl-[18px]">
          <span class="hd text-[34px] text-lime" data-testid="challenge-total">
            <AnimatedNumber :value="challenge.$total ?? 0" />
          </span>
          <span class="flex min-w-0 flex-col text-[13px] leading-tight font-bold text-lilac">
            <span>
              total<template v-if="challenge.$dancers">
                · {{ challenge.$dancers }}
                {{
                  pluralize(challenge.$dancers, store.label('Participant').toLowerCase())
                }}</template
              >
            </span>
            <span v-if="status" class="flex items-center gap-1.5">
              <span
                v-if="status.tone !== 'ended'"
                aria-hidden="true"
                class="size-2 shrink-0 rounded-full"
                :class="
                  status.tone === 'live' ? 'animate-pulse-dot bg-lime text-lime' : 'bg-butter'
                "
              />
              {{ status.text }}
            </span>
          </span>
        </div>

        <div aria-hidden="true" class="h-11" />
      </header>

      <nav
        aria-label="Challenge"
        class="relative mx-3 mt-2.5 grid grid-cols-3 gap-px rounded-full bg-chip p-px"
      >
        <span
          aria-hidden="true"
          class="absolute top-px bottom-px left-px w-[calc((100%-4px)/3)] rounded-full bg-ink transition-transform duration-500 ease-[cubic-bezier(.34,1.25,.64,1)]"
          :style="{ transform: `translateX(calc(${tabIndex} * (100% + 1px)))` }"
        />
        <router-link
          v-for="(tab, i) in tabs"
          :key="tab.name"
          :to="{ name: tab.name }"
          replace
          class="hd relative flex h-11 items-center justify-center rounded-full text-[17px] transition-colors duration-300"
          :class="i === tabIndex ? 'text-white' : 'text-muted hover:text-fg'"
          @click="handleTabClick(i)"
        >
          {{ tab.label }}
        </router-link>
      </nav>

      <main
        class="flex flex-1 flex-col pb-[env(safe-area-inset-bottom)]"
        :style="{ '--slide-from': slideFrom }"
      >
        <router-view v-slot="{ Component, route: shown }">
          <Transition name="shell-tab" mode="out-in">
            <div :key="String(shown.name)" class="flex flex-1 flex-col">
              <component :is="Component" />
            </div>
          </Transition>
        </router-view>
      </main>
    </template>

    <div
      v-else-if="store.hasLoadedChallenges"
      class="anim-rise m-auto flex flex-col items-center gap-5 p-6 text-center"
    >
      <p class="hd text-[32px]">pick a {{ store.label('Challenge').toLowerCase() }} first</p>
      <router-link :to="{ name: 'home' }" class="btn btn-primary">see all challenges</router-link>
    </div>
  </div>
</template>

<style>
.ChallengeShell-ribbons {
  mask-image: linear-gradient(to bottom, transparent 12%, #000 64%);
}
/* the old tab fades away, then the new one slides in from the side its tab is on */
.shell-tab-leave-active {
  transition: opacity 0.12s ease-in;
}
.shell-tab-leave-to {
  opacity: 0;
}
.shell-tab-enter-active {
  transition:
    opacity 0.3s var(--ease-out),
    translate 0.45s var(--ease-out);
}
.shell-tab-enter-from {
  opacity: 0;
  translate: calc(var(--slide-from, 0) * 28px) 6px;
}
</style>
