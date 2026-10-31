<script setup lang="ts">
import { differenceInCalendarDays } from 'date-fns'
import { getDocs, limit, orderBy as byField, query, where } from 'firebase/firestore'
import { Lock, Plus, TrendingUp, Trophy } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { type ChallengeItem, useAppStore } from '@/stores/app'
import HelpButton from '@/components/HelpButton.vue'
import ChallengeRibbons from '@/components/Ribbons.vue'
import ScotDanceAccount from '@/components/ScotDanceAccount.vue'
import StepsMark from '@/components/StepsMark.vue'
import { getChallengeEndDate, getChallengeStartDate } from '@/lib/date'
import { type Entry, type Group, type Participant, refs } from '@/lib/firebase'
import { animate, burst, easing, stagger } from '@/lib/motion'
import { isSignInEnabled } from '@/lib/scotdance'
import { pluralize } from '@/lib/strings'
import { orderBy } from '@/lib/utils'
import { dailyTotals } from '@/lib/waves'

// public challenges need this many people before they make the hall of fame
const HALL_OF_FAME_DANCERS = 5
const HALL_OF_FAME_PER_YEAR = 3
// the rest of the public challenges show this many until asked for more
const MORE_SHOWN = 5
const CARDS_SHOWN = 3
// year colours in the hall of fame (all at least 3:1 on white at 22px italic 900)
const yearColors = ['#6A3CFF', '#E0338A', '#0B5C99', '#A33A00']

const tagline = [
  { text: 'log your practice', color: 'bg-lime', turn: '-3deg', end: ',' },
  { text: 'cheer each other on', color: 'bg-pink-soft', turn: '2deg', end: ',' },
  { text: 'watch the totals climb', color: 'bg-sky-soft', turn: '-1.5deg', end: '!', icon: true },
]

const store = useAppStore()
const router = useRouter()

const publicChallenges = computed(() => store.challenges.filter((c) => !c.private))
// live ones first, then the most dancers (none yet counts as zero, so the order holds still)
const live = computed(() =>
  publicChallenges.value
    .filter((c) => c.$isLive || c.$isRecentlyEnded)
    .sort(
      (a, b) =>
        Number(Boolean(b.$isLive)) - Number(Boolean(a.$isLive)) ||
        (b.$dancers ?? 0) - (a.$dancers ?? 0),
    ),
)
const hero = computed(() => live.value[0])
const moreLive = computed(() => live.value.slice(1))
const upcoming = computed(() =>
  orderBy(
    publicChallenges.value.filter((c) => c.$isUpcoming),
    ['startAt'],
  ),
)
// only a few cards up top, so starting your own challenge is never far away
const isShowingAllCards = ref(false)
const shownMoreLive = computed(() =>
  isShowingAllCards.value ? moreLive.value : moreLive.value.slice(0, CARDS_SHOWN - 1),
)
const shownUpcoming = computed(() =>
  isShowingAllCards.value
    ? upcoming.value
    : upcoming.value.slice(0, Math.max(0, CARDS_SHOWN - live.value.length)),
)
const hiddenCardCount = computed(
  () =>
    moreLive.value.length -
    shownMoreLive.value.length +
    upcoming.value.length -
    shownUpcoming.value.length,
)
const shownAbove = computed(() => new Set([...live.value, ...upcoming.value].map(({ id }) => id)))
const yours = computed(() =>
  orderBy(
    store.myChallenges.filter(({ id }) => !shownAbove.value.has(id)),
    ['$isActive', '$year', 'name'],
    ['desc', 'desc', 'asc'],
  ),
)
const famous = computed(() =>
  publicChallenges.value.filter(
    (c) => !shownAbove.value.has(c.id) && (c.$dancers ?? 0) >= HALL_OF_FAME_DANCERS,
  ),
)
const hallOfFame = computed(() => {
  const list = famous.value
  const biggest = orderBy(list, ['$count'], ['desc'])[0]
  const years = new Map<number, ChallengeItem[]>()
  for (const challenge of [...list].sort((a, b) => (b.$total ?? 0) - (a.$total ?? 0))) {
    const year = challenge.$year ?? 0
    years.set(year, [...(years.get(year) ?? []), challenge])
  }
  return {
    biggestId: biggest?.id,
    years: [...years.entries()]
      .sort(([a], [b]) => b - a)
      .map(([year, items], index) => ({
        year,
        items,
        color: yearColors[index % yearColors.length],
      })),
  }
})
const expandedYears = ref<number[]>([])

// every other public challenge (ended a while ago, or quiet), so none is ever out of reach
const others = computed(() => {
  const listed = new Set([...shownAbove.value, ...yours.value.map(({ id }) => id)])
  for (const { id } of famous.value) listed.add(id)
  return orderBy(
    publicChallenges.value.filter(({ id }) => !listed.has(id)),
    ['$year', 'name'],
    ['desc', 'asc'],
  )
})
const isShowingAllOthers = ref(false)
const shownOthers = computed(() =>
  isShowingAllOthers.value ? others.value : others.value.slice(0, MORE_SHOWN),
)

// the hero's own climb and group colours (for its ribbons) and who's in front: the store only
// loads these for the open challenge, so read the hero's once here
interface HeroInfo {
  days: number[]
  colors: string[]
  leader?: string
}
const heroInfo = shallowRef<HeroInfo>()
function describe(groups: Group[], participants: Participant[], days: number[]): HeroInfo {
  // same order as the open challenge's groups (by name), so the ribbons always match
  const colors = orderBy(
    groups.filter((group) => !group.private),
    ['name'],
  )
    .map(({ color }) => color)
    .filter((color): color is string => Boolean(color))
  // only a clear leader: nobody in front on a tie or before anyone has logged
  const [first, second] = participants
    .filter((participant) => !participant.private)
    .sort((a, b) => (b.$total ?? 0) - (a.$total ?? 0))
  const firstName = first?.name.trim().split(/\s+/)[0]
  const isAhead = first?.$total && first.$total > (second?.$total ?? 0)
  return { days, colors, leader: isAhead && firstName ? `${firstName}’s in front` : undefined }
}
watch(
  () => hero.value?.id,
  async (id) => {
    heroInfo.value = undefined
    if (!id) return
    let info: HeroInfo
    if (id === store.challengeId && store.groups.length) {
      info = describe(store.groups, store.participants, store.climbDays)
    } else {
      try {
        // every group (there are few, and they colour the ribbons), but only the top few
        // dancers: enough to find a clear leader, even past a private one or two
        const [groups, participants, entries] = await Promise.all([
          getDocs(query(refs.groups, where('challengeId', '==', id))),
          getDocs(
            query(
              refs.participants,
              where('challengeId', '==', id),
              byField('$total', 'desc'),
              limit(4),
            ),
          ),
          getDocs(store.climbQuery(id)),
        ])
        info = describe(
          groups.docs.map((d) => ({ ...d.data(), id: d.id }) as Group),
          participants.docs.map((d) => ({ ...d.data(), id: d.id }) as Participant),
          dailyTotals(entries.docs.map((d) => d.data() as Entry).filter((entry) => !entry.private)),
        )
      } catch (error) {
        console.warn(error)
        info = { days: [], colors: [] }
      }
    }
    if (hero.value?.id === id) heroInfo.value = info
  },
  { immediate: true },
)

function dates(challenge: ChallengeItem) {
  const start = getChallengeStartDate(challenge)
  const end = getChallengeEndDate(challenge)
  const format = (date: Date) =>
    date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  if (start && end) return `${format(start)} – ${format(end)}`
  if (end) return `until ${format(end)}`
  if (start) return `from ${format(start)}`
  return ''
}
function dancers(challenge: ChallengeItem) {
  const count = challenge.$dancers ?? 0
  return `${count.toLocaleString()} ${pluralize(count, 'dancer')}`
}
function summary(challenge: ChallengeItem, leader?: string) {
  if (!challenge.$dancers) return 'be the first one in'
  const parts = [dancers(challenge)]
  if (challenge.$total) parts.push(`${challenge.$total.toLocaleString()} total`)
  if (leader) parts.push(leader)
  return parts.join(' · ')
}
function daysLeft(challenge: ChallengeItem) {
  const end = getChallengeEndDate(challenge)
  return end ? Math.max(0, differenceInCalendarDays(end, new Date())) : null
}

interface Stamp {
  top?: string
  big: string
  bottom?: string
}
// the round stamp on smaller cards: when it starts, how long is left, or that it's done
function stamp(challenge: ChallengeItem): Stamp | null {
  const now = new Date()
  if (challenge.$isUpcoming) {
    const start = getChallengeStartDate(challenge)
    if (!start) return null
    const days = differenceInCalendarDays(start, now)
    if (days <= 6) {
      return {
        top: 'starts',
        big: start.toLocaleDateString('en', { weekday: 'short' }).toLowerCase(),
      }
    }
    if (days <= 99) return { top: 'in', big: String(days), bottom: 'days' }
    return { top: 'starts', big: start.toLocaleDateString('en', { month: 'short' }).toLowerCase() }
  }
  if (!challenge.$isLive) return { top: 'all', big: 'done!' }
  const days = daysLeft(challenge)
  if (days === null) return { big: 'live', bottom: 'now' }
  if (days === 0) return { top: 'last', big: 'day!' }
  return { big: String(days), bottom: `${pluralize(days, 'day')} left` }
}

function open(challenge: ChallengeItem) {
  store.challengeId = challenge.id
  router.push({ name: challenge.$isActive || challenge.$isUpcoming ? 'new' : 'statistics' })
}
function startNew() {
  store.challengeToEdit = { name: '', private: true }
}

// easter egg: tap the logo five times quickly and the ribbons dance
const logo = ref<HTMLElement>()
const heroCard = ref<HTMLElement>()
const isDancing = ref(false)
let taps: number[] = []
let danceTimeout: ReturnType<typeof setTimeout> | undefined
function tapLogo() {
  const now = Date.now()
  taps = [...taps.filter((time) => now - time < 1600), now]
  if (taps.length < 5) {
    animate(
      logo.value,
      [{ transform: 'scale(1)' }, { transform: 'scale(.88)' }, { transform: 'scale(1)' }],
      {
        duration: 260,
        easing: easing.spring,
      },
    )
    return
  }
  taps = []
  animate(
    logo.value,
    [
      { transform: 'rotate(0) scale(1)' },
      { transform: 'rotate(-14deg) scale(1.15)' },
      { transform: 'rotate(10deg) scale(1.1)' },
      { transform: 'rotate(-5deg) scale(1.04)' },
      { transform: 'rotate(0) scale(1)' },
    ],
    { duration: 800, easing: easing.out },
  )
  burst(heroCard.value ?? logo.value!, { shape: 'confetti', count: 32 })
  isDancing.value = true
  clearTimeout(danceTimeout)
  danceTimeout = setTimeout(() => (isDancing.value = false), 2800)
  store.notify('you found the secret!')
}
onBeforeUnmount(() => clearTimeout(danceTimeout))
</script>

<template>
  <!-- overflow-x-clip: stickers popping in (scaled up) must never widen the page -->
  <div
    class="mx-auto flex min-h-dvh max-w-xl flex-col overflow-x-clip pt-[env(safe-area-inset-top)] pb-14"
  >
    <header class="flex items-center gap-2.5 px-[18px] pt-[22px]">
      <span ref="logo" class="Explore-logo shrink-0" @click="tapLogo()">
        <StepsMark :size="42" draw />
      </span>
      <h1 class="hd anim-fade min-w-0 flex-1 text-[32px] whitespace-nowrap">challenge</h1>
      <HelpButton class="-mr-1.5" />
      <ScotDanceAccount v-if="isSignInEnabled" class="bg-chip" />
    </header>

    <!-- what this is, in three stickers slapped on one after another (the Toolkit's line) -->
    <p class="flex flex-wrap items-center gap-x-1 gap-y-1.5 px-[14px] pt-3">
      <span
        v-for="(bit, index) in tagline"
        :key="bit.text"
        class="Explore-bit sticker tilt anim-sticker hd inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[17px] text-ink"
        :class="bit.color"
        :style="{ '--rx': '0deg', '--rz': bit.turn, '--i': index, '--delay': '200ms' }"
      >
        {{ bit.text
        }}<TrendingUp v-if="bit.icon" :size="18" :stroke-width="3" aria-hidden="true" /><span
          class="sr-only"
          >{{ bit.end }}</span
        >
      </span>
    </p>

    <main class="flex flex-col gap-5 px-4 pt-8">
      <div
        v-if="!store.hasLoadedChallenges"
        class="h-[290px] animate-pulse rounded-[30px] bg-violet-soft"
        aria-hidden="true"
      />

      <section v-if="hero" class="flex flex-col gap-5" aria-label="Featured">
        <!-- the big one: violet card on a little stack, with stickers -->
        <div class="Explore-stack anim-rise relative mb-[26px]">
          <span
            aria-hidden="true"
            class="Explore-back absolute inset-[18px_16px_-20px_16px] rounded-[30px] bg-pink"
            style="--turn: 1.2deg"
          />
          <span
            aria-hidden="true"
            class="Explore-back absolute inset-[10px_8px_-10px_8px] rounded-[30px] bg-lime"
            style="--turn: -1deg; animation-delay: 60ms"
          />
          <button
            ref="heroCard"
            type="button"
            class="Explore-hero lift relative block w-full rounded-[30px] bg-violet text-left text-white"
            @click="open(hero)"
          >
            <!-- the climb runs up behind the title, fading out under the words -->
            <span
              class="Explore-ribbons absolute inset-x-0 top-0 block aspect-[380/250] overflow-hidden rounded-t-[30px]"
            >
              <ChallengeRibbons
                v-if="heroInfo"
                :days="heroInfo.days"
                :colors="heroInfo.colors"
                reveal
                :dance="isDancing"
              />
            </span>
            <span aria-hidden="true" class="block aspect-[380/170]" />
            <span class="relative flex flex-col gap-2 px-[18px] pt-1 pb-[58px]">
              <span class="sr-only">{{ hero.$isLive ? 'Live now.' : 'Just ended.' }}</span>
              <span class="hd pr-[70px] text-[34px] text-balance break-words">{{ hero.name }}</span>
              <span class="text-sm font-semibold text-lilac">
                {{ summary(hero, heroInfo?.leader) }}
              </span>
            </span>
            <span
              v-if="hero.$isLive && daysLeft(hero) !== null"
              class="anim-sticker absolute -right-2 -bottom-[22px]"
              style="--delay: 420ms"
            >
              <span
                class="Explore-days sticker flex items-baseline gap-1 rounded-[22px] bg-ink px-3.5 pt-2 pb-2.5 text-lime"
              >
                <template v-if="daysLeft(hero)">
                  <span class="hd num text-[50px]">{{ daysLeft(hero) }}</span>
                  <span class="text-[15px] font-black whitespace-nowrap text-white italic">
                    {{ pluralize(daysLeft(hero)!, 'day') }} left
                  </span>
                </template>
                <span v-else class="hd py-1.5 text-[34px] whitespace-nowrap">last day!</span>
              </span>
            </span>
          </button>
          <span
            aria-hidden="true"
            class="tilt sticker anim-sticker absolute -top-3.5 -left-1 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-[7px] text-[15px] font-black whitespace-nowrap italic"
            style="--rx: 16deg; --rz: -6deg"
          >
            <template v-if="hero.$isLive">
              <span class="size-2 animate-pulse-dot rounded-full bg-red text-red" />
              live now
            </template>
            <template v-else>just ended</template>
          </span>
        </div>

        <button
          v-for="(challenge, index) in shownMoreLive"
          :key="challenge.id"
          type="button"
          class="Explore-card card anim-rise flex items-center gap-3 px-[18px] py-4 text-left"
          :style="stagger(index + 1)"
          @click="open(challenge)"
        >
          <span class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="hd text-[26px] break-words">{{ challenge.name }}</span>
            <span class="text-sm font-semibold text-muted">{{ summary(challenge) }}</span>
          </span>
          <span
            v-if="stamp(challenge)"
            class="Explore-stamp tilt sticker anim-sticker"
            :class="challenge.$isLive ? 'bg-ink text-lime' : 'bg-butter text-ink'"
            :style="{ ...stagger(index), '--rx': '0deg', '--ry': '-16deg', '--rz': '8deg' }"
          >
            <span v-if="stamp(challenge)!.top" :class="{ 'text-white': challenge.$isLive }">
              {{ stamp(challenge)!.top }}
            </span>
            <span class="text-[22px]">{{ stamp(challenge)!.big }}</span>
            <span
              v-if="stamp(challenge)!.bottom"
              class="text-[10px]"
              :class="{ 'text-white': challenge.$isLive }"
            >
              {{ stamp(challenge)!.bottom }}
            </span>
          </span>
        </button>
      </section>

      <section v-if="shownUpcoming.length" class="flex flex-col gap-3" aria-label="Starting soon">
        <button
          v-for="(challenge, index) in shownUpcoming"
          :key="challenge.id"
          type="button"
          class="Explore-card card anim-rise flex items-center gap-3 px-[18px] py-4 text-left"
          :style="stagger(live.length + index)"
          @click="open(challenge)"
        >
          <span class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="hd text-[26px] break-words">{{ challenge.name }}</span>
            <span class="text-sm font-semibold text-muted">
              {{ [dates(challenge), summary(challenge)].filter(Boolean).join(' · ') }}
            </span>
          </span>
          <span
            v-if="stamp(challenge)"
            class="Explore-stamp tilt sticker anim-sticker bg-orange text-ink"
            :style="{
              ...stagger(index),
              '--delay': '320ms',
              '--rx': '0deg',
              '--ry': '-16deg',
              '--rz': '8deg',
            }"
          >
            <span v-if="stamp(challenge)!.top">{{ stamp(challenge)!.top }}</span>
            <span class="text-[22px]">{{ stamp(challenge)!.big }}</span>
            <span v-if="stamp(challenge)!.bottom">{{ stamp(challenge)!.bottom }}</span>
          </span>
        </button>
      </section>

      <div
        v-if="store.hasLoadedChallenges && !live.length && !upcoming.length"
        class="card anim-rise flex flex-col items-start gap-3 overflow-hidden p-5"
      >
        <span class="-mx-5 -mt-5 mb-1 block h-24 w-[calc(100%+2.5rem)] bg-violet">
          <ChallengeRibbons variant="header" reveal />
        </span>
        <p class="hd text-[26px]">nothing live right now</p>
        <p class="text-[15px] font-semibold text-muted">
          Start one and get everyone dancing together!
        </p>
      </div>

      <button
        v-if="hiddenCardCount"
        type="button"
        class="btn btn-soft btn-sm anim-pop -mt-1 self-center"
        @click="isShowingAllCards = true"
      >
        + {{ hiddenCardCount }} more {{ pluralize(hiddenCardCount, 'challenge') }}
      </button>

      <!-- quieter than the challenges above: most people come here to dance, not to set one up -->
      <button
        v-if="store.hasLoadedChallenges"
        type="button"
        class="Explore-card anim-rise flex items-center gap-3.5 rounded-[26px] bg-violet-soft px-[18px] py-4 text-left"
        :style="stagger(live.length + upcoming.length)"
        @click="startNew()"
      >
        <span
          class="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-violet text-white"
          aria-hidden="true"
        >
          <Plus :size="24" :stroke-width="3" />
        </span>
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="hd text-[22px] text-violet">start your own challenge</span>
          <span class="text-sm font-semibold text-muted">for your class, studio or friends</span>
        </span>
      </button>

      <section
        v-if="yours.length"
        class="anim-rise flex flex-col gap-2"
        aria-label="Yours"
        :style="stagger(live.length + upcoming.length)"
      >
        <h2 class="hd px-1 text-[26px]">yours</h2>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(challenge, index) in yours"
            :key="challenge.id"
            type="button"
            class="Explore-chip anim-pop flex min-h-11 items-center gap-1.5 rounded-[18px] bg-white px-3.5 py-2 text-left text-[15px] font-extrabold"
            :style="{ ...stagger(index), '--delay': '120ms' }"
            @click="open(challenge)"
          >
            <Lock
              v-if="challenge.private"
              :size="14"
              :stroke-width="2.6"
              class="shrink-0"
              role="img"
              aria-label="Private"
            />
            {{ challenge.name }}
          </button>
        </div>
      </section>

      <section
        v-if="hallOfFame.years.length"
        class="anim-rise flex flex-col gap-2"
        aria-label="Hall of fame"
        :style="stagger(live.length + upcoming.length + 1)"
      >
        <h2 class="hd px-1 text-[26px]">hall of fame</h2>
        <div class="card px-[18px] py-1">
          <template v-for="{ year, items, color } in hallOfFame.years" :key="year">
            <button
              v-for="(challenge, index) in expandedYears.includes(year)
                ? items
                : items.slice(0, HALL_OF_FAME_PER_YEAR)"
              :key="challenge.id"
              type="button"
              class="Explore-row grid w-full grid-cols-[46px_1fr_auto] items-center gap-2.5 py-[11px] text-left"
              @click="open(challenge)"
            >
              <span class="hd num text-[22px]" :style="{ color }">
                <template v-if="index === 0">
                  <span aria-hidden="true">{{ year ? `’${String(year).slice(-2)}` : '∞' }}</span>
                  <span class="sr-only">{{ year || 'Ongoing' }}</span>
                </template>
              </span>
              <span class="flex min-w-0 flex-col items-start gap-1">
                <span class="text-base font-extrabold">{{ challenge.name }}</span>
                <span v-if="challenge.id === hallOfFame.biggestId" class="tag bg-butter text-ink">
                  <Trophy :size="12" :stroke-width="2.8" aria-hidden="true" />
                  biggest ever
                </span>
              </span>
              <span class="hd num text-[26px]">
                {{ (challenge.$total ?? 0).toLocaleString() }}
                <span class="sr-only">total</span>
              </span>
            </button>
            <button
              v-if="items.length > HALL_OF_FAME_PER_YEAR && !expandedYears.includes(year)"
              type="button"
              class="Explore-row min-h-11 w-full py-2.5 pl-14 text-left text-sm font-black text-violet italic"
              @click="expandedYears.push(year)"
            >
              + {{ items.length - HALL_OF_FAME_PER_YEAR }} more from {{ year || 'before' }}
            </button>
          </template>
        </div>
      </section>

      <section
        v-if="others.length"
        class="anim-rise flex flex-col gap-2"
        aria-label="More challenges"
        :style="stagger(live.length + upcoming.length + 2)"
      >
        <h2 class="hd px-1 text-[26px]">more challenges</h2>
        <div class="card px-[18px] py-1">
          <TransitionGroup name="rise">
            <button
              v-for="challenge in shownOthers"
              :key="challenge.id"
              type="button"
              class="Explore-row flex min-h-11 w-full items-center gap-2.5 py-[11px] text-left"
              @click="open(challenge)"
            >
              <span class="min-w-0 flex-1 text-base font-extrabold break-words">
                {{ challenge.name }}
              </span>
              <span v-if="challenge.$year" class="num text-sm font-bold text-muted">
                {{ challenge.$year }}
              </span>
            </button>
          </TransitionGroup>
          <button
            v-if="!isShowingAllOthers && others.length > MORE_SHOWN"
            type="button"
            class="Explore-row min-h-11 w-full py-2.5 text-left text-sm font-black text-violet italic"
            @click="isShowingAllOthers = true"
          >
            + {{ others.length - MORE_SHOWN }} more
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<style>
.Explore-logo {
  display: inline-flex;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

/* the cards behind the live one fan out as it lands, and a little more on press */
.Explore-back {
  rotate: var(--turn);
  animation: explore-fan 0.7s var(--ease-spring) 0.15s both;
  transition: rotate 0.4s var(--ease-spring);
}
@keyframes explore-fan {
  from {
    rotate: 0deg;
    translate: 0 -10px;
  }
}
.Explore-ribbons {
  mask-image: radial-gradient(130% 62% at 0% 100%, transparent 35%, #000 78%);
}
.Explore-hero {
  transition:
    scale 0.4s var(--ease-spring),
    rotate 0.4s var(--ease-spring),
    translate 0.4s var(--ease-spring);
}
.Explore-hero:active {
  scale: 0.98;
  rotate: -0.8deg;
}
.Explore-stack:has(.Explore-hero:active) .Explore-back {
  rotate: calc(var(--turn) * 1.8);
}
@media (hover: hover) {
  .Explore-hero:hover {
    translate: 0 -3px;
  }
  .Explore-stack:has(.Explore-hero:hover) .Explore-back {
    rotate: calc(var(--turn) * 1.4);
  }
}
.Explore-days {
  transform: rotate(-4deg);
}

.Explore-stamp {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 999px;
  font-size: 13px;
  font-style: italic;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.Explore-card,
.Explore-chip {
  transition:
    scale 0.3s var(--ease-spring),
    box-shadow 0.25s;
}
.Explore-card:active,
.Explore-chip:active {
  scale: 0.97;
}
@media (hover: hover) {
  .Explore-card:hover,
  .Explore-chip:hover {
    box-shadow: var(--shadow-float);
  }
}

.Explore-row {
  border-bottom: 1px solid var(--color-line);
  transition: background-color 0.2s;
}
.Explore-row:last-child {
  border-bottom: 0;
}
@media (hover: hover) {
  .Explore-row:hover {
    background: linear-gradient(
      90deg,
      transparent,
      var(--color-paper) 12%,
      var(--color-paper) 88%,
      transparent
    );
  }
}
</style>
