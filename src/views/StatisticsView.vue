<script setup lang="ts">
import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import { ChevronDown, ListFilter, Search } from 'lucide-vue-next'
import { computed } from 'vue'
import { type GroupItem, type ParticipantItem, useAppStore } from '@/stores/app'
import AnimatedNumber from '@/components/AnimatedNumber.vue'
import { availableCountries } from '@/lib/country'
import { getChallengeEndDate, isChallengeInFinalCountdown } from '@/lib/date'
import { stagger } from '@/lib/motion'
import { orderBy } from '@/lib/utils'

interface GroupStats extends GroupItem {
  $average: number
}
interface ParticipantStats extends ParticipantItem {
  $rank: number
}

const TOP = 100
const store = useAppStore()

// same keys as the old vue-localstorage settings, so filters carry over
const storageKey = (key: string) => `scotdance-challenge.${key}`
const view = useLocalStorage<'dancers' | 'groups'>(storageKey('statsView'), 'dancers')
// anything unexpected in storage shows dancers
const shownView = computed(() => (view.value === 'groups' ? 'groups' : 'dancers'))
const groupMetric = useLocalStorage<'total' | 'average'>(storageKey('groupMetric'), 'total')
const filterDataByGroupIds = useLocalStorage<string[]>(storageKey('filterDataByGroupIds'), [])
const filterDataByCountryIds = useLocalStorage<string[]>(storageKey('filterDataByCountryIds'), [])
const filterDataBySearch = useLocalStorage<string | null>(storageKey('filterDataBySearch'), '', {
  serializer: StorageSerializers.object,
})

// the saved filters are shared by every challenge: only the ones found in this challenge
// apply here (left in storage, so they're back next time it's open)
const activeGroupIds = computed(() =>
  filterDataByGroupIds.value.filter((id) => store.groups.some((group) => group.id === id)),
)
const activeCountryIds = computed(() =>
  filterDataByCountryIds.value.filter((id) => countries.value.some((country) => country.id === id)),
)
const groupFilter = computed({
  get: () => activeGroupIds.value[0] ?? '',
  set: (id: string) => (filterDataByGroupIds.value = id ? [id] : []),
})
const countryFilter = computed({
  get: () => activeCountryIds.value[0] ?? '',
  set: (id: string) => (filterDataByCountryIds.value = id ? [id] : []),
})
const search = computed({
  get: () => filterDataBySearch.value ?? '',
  set: (text: string) => (filterDataBySearch.value = text),
})

const plural = (key: 'Participant' | 'Group') => `${store.label(key).toLowerCase()}s`
const views = computed(() => [
  { id: 'dancers' as const, label: plural('Participant') },
  { id: 'groups' as const, label: plural('Group') },
])

const participantsWithEntries = computed(() => store.participants.filter(({ $total }) => $total))
const countries = computed(() => {
  const codes = new Set(store.groups.map(({ country }) => country).filter(Boolean))
  return availableCountries.filter(({ id }) => codes.has(id))
})
const inCountry = (country?: string | null) =>
  !activeCountryIds.value.length || Boolean(country && activeCountryIds.value.includes(country))

// ranked across the (country and group) filters; search only narrows what's shown
const rankedParticipants = computed<ParticipantStats[]>(() =>
  orderBy(
    participantsWithEntries.value.filter(
      ({ $group }) =>
        inCountry($group?.country) &&
        (!activeGroupIds.value.length ||
          Boolean($group && activeGroupIds.value.includes($group.id))),
    ),
    ['$total'],
    ['desc'],
  ).map((item, index) => ({ ...item, $rank: index + 1 })),
)
const shownParticipants = computed(() => {
  const query = search.value.trim().toLowerCase()
  const items = query
    ? rankedParticipants.value.filter(({ name }) => name.toLowerCase().includes(query))
    : rankedParticipants.value
  return items.slice(0, TOP)
})
const podium = computed(() => (search.value.trim() ? [] : shownParticipants.value.slice(0, 3)))
const list = computed(() => shownParticipants.value.slice(podium.value.length))
const topTotal = computed(() => rankedParticipants.value[0]?.$total || 1)

// how the dancer last picked on this device is doing
const me = computed(() => rankedParticipants.value.find(({ id }) => id === store.participantId))
const aheadOf = computed(() => {
  const count = rankedParticipants.value.length
  if (!me.value || count < 2) return null
  return Math.round(((count - me.value.$rank) / (count - 1)) * 100)
})
// the dancer just above, and how much more it takes to pass them
const chase = computed(() => {
  if (!me.value) return null
  const next = rankedParticipants.value[me.value.$rank - 2]
  if (!next) return null
  return { name: next.name, more: (next.$total ?? 0) - (me.value.$total ?? 0) + 1 }
})

const groups = computed<GroupStats[]>(() => {
  const items = store.groups
    .filter(({ $total, country }) => $total && inCountry(country))
    .map((group) => {
      const count = participantsWithEntries.value.filter(
        ({ groupId }) => groupId === group.id,
      ).length
      return { ...group, $average: count ? Math.round((group.$total ?? 0) / count) : 0 }
    })
  return orderBy(items, [groupMetric.value === 'total' ? '$total' : '$average'], ['desc'])
})
const groupValue = (group: GroupStats) =>
  groupMetric.value === 'total' ? (group.$total ?? 0) : group.$average
const topGroupValue = computed(() => (groups.value[0] ? groupValue(groups.value[0]) : 1) || 1)

const isInFinalCountdown = computed(() => isChallengeInFinalCountdown(store.currentChallenge))
const endDate = computed(() => getChallengeEndDate(store.currentChallenge))
const showGroupFilter = computed(
  () => shownView.value === 'dancers' && !isInFinalCountdown.value && store.groups.length > 1,
)
const filteredGroup = computed(() => store.groups.find(({ id }) => id === groupFilter.value))

const barWidth = (value: number, top: number) => `${Math.max(3, (value / top) * 100)}%`

// podium places by rank index: 1st in the middle on lime, then 2nd left, 3rd right
const ordinals = ['1st', '2nd', '3rd']
// big totals step down to fit their block: `cqi` is the block's width (it's a size container)
const numSize = (index: number, total?: number | null) => {
  const chars = (total ?? 0).toLocaleString().length
  return `min(${places[index]!.num}px, calc((100cqi - 14px) / ${(chars * 0.58).toFixed(2)}))`
}
const places = [
  { col: 'col-start-2', avatar: 58, letter: 28, step: 124, num: 40, delay: 360 },
  { col: 'col-start-1', avatar: 46, letter: 22, step: 94, num: 30, delay: 180 },
  { col: 'col-start-3', avatar: 42, letter: 20, step: 72, num: 26, delay: 0 },
]
const fallbackColors = ['#D4FF3A', '#4CD964', '#3DA9FF']
const stepColor = (index: number, color?: string | null) =>
  index === 0 ? '#D4FF3A' : color || fallbackColors[index]!
const avatarColor = (index: number, color?: string | null) => color || fallbackColors[index]!

// ink or white, whichever has more contrast on a `#rrggbb` colour (WCAG luminance)
const luminance = (hex: string) => {
  const [r, g, b] = (hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)?.slice(1) ?? []).map(
    (part) => {
      const c = parseInt(part, 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    },
  )
  if (r === undefined || g === undefined || b === undefined) return 1
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const INK_LUMINANCE = 0.0068 // #15131A
const readableOn = (color: string) => {
  const l = luminance(color)
  return (l + 0.05) / (INK_LUMINANCE + 0.05) >= 1.05 / (l + 0.05) ? 'var(--color-ink)' : '#fff'
}
</script>

<template>
  <div
    v-if="!participantsWithEntries.length"
    class="anim-rise m-auto flex flex-col items-center gap-5 p-6 text-center"
  >
    <div class="flex items-end gap-1.5" aria-hidden="true">
      <span
        v-for="(height, i) in [34, 52, 24]"
        :key="i"
        class="stats-step w-12 rounded-t-2xl bg-chip"
        :style="{ height: `${height}px`, '--delay': `${[120, 240, 0][i]}ms` }"
      />
    </div>
    <p class="hd text-[32px]">no entries yet</p>
    <router-link :to="{ name: 'new' }" class="btn btn-primary">log the first one</router-link>
  </div>

  <template v-else>
    <div class="mx-4 mt-3 flex items-center gap-2">
      <div role="group" aria-label="Show" class="flex gap-2">
        <button
          v-for="option in views"
          :key="option.id"
          type="button"
          class="chip chip-white"
          :aria-pressed="shownView === option.id"
          @click="view = option.id"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- the group filter folds into a round button beside search; it shows the group once picked -->
      <label
        v-if="showGroupFilter"
        class="stats-filter ml-auto"
        :class="{ 'is-on': filteredGroup }"
        :title="filteredGroup ? undefined : `Filter by ${store.label('Group').toLowerCase()}`"
      >
        <ListFilter :size="17" :stroke-width="2.8" class="shrink-0" aria-hidden="true" />
        <span v-if="filteredGroup" class="truncate" aria-hidden="true">{{
          filteredGroup.$name
        }}</span>
        <select v-model="groupFilter" :aria-label="store.label('Group')">
          <option value="">all {{ plural('Group') }}</option>
          <option v-for="group in store.groups" :key="group.id" :value="group.id">
            {{ group.$name }}
          </option>
        </select>
      </label>

      <label v-if="shownView === 'groups'" class="stats-select ml-auto">
        <select v-model="groupMetric" class="chip chip-white" aria-label="Measure">
          <option value="total">total</option>
          <option value="average">per {{ store.label('Participant').toLowerCase() }}</option>
        </select>
        <ChevronDown :size="16" :stroke-width="2.8" aria-hidden="true" />
      </label>
      <label
        v-else-if="!isInFinalCountdown"
        class="stats-search"
        :class="{ 'ml-auto': !showGroupFilter }"
      >
        <Search :size="16" :stroke-width="2.8" class="shrink-0" aria-hidden="true" />
        <input
          v-model="search"
          type="search"
          :aria-label="`Search ${plural('Participant')}`"
          :placeholder="`search ${plural('Participant')}`"
        />
      </label>
    </div>

    <div v-if="countries.length > 1" class="mx-4 mt-2 flex flex-wrap gap-2">
      <label class="stats-select">
        <select
          v-model="countryFilter"
          class="chip chip-white"
          :aria-label="store.label('Country')"
        >
          <option value="">all countries</option>
          <option v-for="country in countries" :key="country.id" :value="country.id">
            {{ country.$name }}
          </option>
        </select>
        <ChevronDown :size="16" :stroke-width="2.8" aria-hidden="true" />
      </label>
    </div>

    <Transition name="rise" mode="out-in">
      <div v-if="shownView === 'dancers'" key="dancers" class="flex flex-col">
        <!-- nearly over: the podium stays a surprise until the end -->
        <div
          v-if="isInFinalCountdown"
          class="anim-rise on-color relative mx-4 mt-3 flex flex-col items-center gap-3 overflow-hidden rounded-[28px] bg-ink px-6 pt-7 text-center text-white"
        >
          <p class="hd text-[40px] text-lime">almost done!</p>
          <p class="text-lg font-bold">Keep dancing and finish strong!</p>
          <p v-if="endDate" class="text-[15px] font-semibold text-lilac">
            The podium is a surprise until it ends on
            {{
              endDate.toLocaleString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            }}.
          </p>
          <div class="mt-2 grid w-full grid-cols-3 items-end gap-2" aria-hidden="true">
            <span
              v-for="(height, i) in [70, 96, 52]"
              :key="i"
              class="stats-step hd flex items-start justify-center rounded-t-[20px] pt-3 text-[34px] text-ink"
              :class="i === 1 ? 'bg-lime' : 'bg-ink-soft text-white/70'"
              :style="{ height: `${height}px`, '--delay': `${[200, 400, 0][i]}ms` }"
            >
              ?
            </span>
          </div>
        </div>

        <template v-else>
          <ol
            v-if="podium.length"
            class="on-color mx-4 mt-3 grid h-[250px] grid-cols-3 items-end gap-2 overflow-hidden rounded-[28px] bg-ink px-3.5 pt-[18px]"
            aria-label="Top three"
          >
            <li
              v-for="(dancer, index) in podium"
              :key="dancer.id"
              class="StatsDancer row-start-1 flex min-w-0 flex-col items-center gap-1.5 text-white"
              :class="places[index]!.col"
              :data-rank="dancer.$rank"
            >
              <svg
                v-if="index === 0"
                class="stats-crown"
                width="34"
                height="22"
                viewBox="0 0 34 22"
                aria-hidden="true"
              >
                <path d="M2 20 L4 5 L12 12 L17 2 L22 12 L30 5 L32 20 Z" fill="#D4FF3A" />
              </svg>
              <span
                class="stats-avatar flex shrink-0 items-center justify-center rounded-full hd leading-none"
                :class="{ 'stats-glow': index === 0 }"
                :style="{
                  width: `${places[index]!.avatar}px`,
                  height: `${places[index]!.avatar}px`,
                  fontSize: `${places[index]!.letter}px`,
                  background: avatarColor(index, dancer.$group?.color),
                  color: readableOn(avatarColor(index, dancer.$group?.color)),
                  boxShadow:
                    index === 0
                      ? '0 0 0 3px var(--color-ink), 0 0 0 6px #D4FF3A, 0 0 26px #D4FF3A88'
                      : `0 0 0 3px var(--color-ink), 0 0 0 5px ${avatarColor(index, dancer.$group?.color)}`,
                  '--delay': `${places[index]!.delay + 380}ms`,
                }"
                aria-hidden="true"
              >
                {{ dancer.name[0]?.toUpperCase() }}
              </span>
              <span
                class="w-full truncate text-center leading-tight font-extrabold"
                :class="index === 0 ? 'text-[15px]' : 'text-sm'"
              >
                {{ dancer.name }}
              </span>
              <span
                class="stats-step stats-block flex w-full flex-col items-center rounded-t-[20px] pt-2.5"
                :style="{
                  height: `${places[index]!.step}px`,
                  background: stepColor(index, dancer.$group?.color),
                  color: readableOn(stepColor(index, dancer.$group?.color)),
                  '--delay': `${places[index]!.delay}ms`,
                }"
              >
                <span
                  class="hd max-w-full whitespace-nowrap"
                  :style="{ fontSize: numSize(index, dancer.$total) }"
                >
                  <AnimatedNumber :value="dancer.$total ?? 0" :duration="1400" />
                </span>
                <span class="text-xs font-extrabold">{{ ordinals[index] }}</span>
              </span>
            </li>
          </ol>

          <p
            v-if="me && aheadOf !== null"
            class="stats-note anim-sticker tilt relative z-10 mx-7 rounded-[20px] bg-pink px-4 py-3 text-sm font-bold text-ink"
            :class="podium.length ? '-mt-1.5' : 'mt-3'"
          >
            <span class="hd block text-[20px]">{{ me.name }} is #{{ me.$rank }}</span>
            <template v-if="chase"
              >{{ aheadOf ? `ahead of ${aheadOf}%` : 'every bit counts!' }} ·
              {{ chase.more.toLocaleString() }} more to pass {{ chase.name }}</template
            >
            <template v-else>leading the way!</template>
          </p>

          <TransitionGroup
            tag="ol"
            name="list"
            class="mx-4 mt-3 mb-10 rounded-[24px] bg-card px-[18px] py-0.5"
            :aria-label="`${store.label('Participant')}s`"
          >
            <li
              v-for="(participant, i) in list"
              :key="participant.id"
              class="StatsDancer stats-row anim-rise"
              :data-rank="participant.$rank"
              :style="stagger(i)"
            >
              <span class="hd text-[17px] text-hint">{{ participant.$rank }}</span>
              <span class="min-w-0 truncate text-[15px] font-extrabold">
                {{ participant.name }}
                <span v-if="participant.$group" class="font-medium text-muted"
                  >· {{ participant.$group.$name }}</span
                >
                <span v-if="participant.id === me?.id" class="tag ml-1 bg-lime align-[2px]"
                  >you</span
                >
              </span>
              <span class="hd text-[20px]">
                <AnimatedNumber :value="participant.$total ?? 0" :duration="1000" />
              </span>
              <span
                class="stats-bar"
                :style="{
                  width: barWidth(participant.$total ?? 0, topTotal),
                  background: participant.$group?.color || 'var(--color-violet)',
                  ...stagger(i),
                }"
                aria-hidden="true"
              />
            </li>
            <li
              v-if="!shownParticipants.length"
              key="none"
              class="py-4 text-[15px] font-semibold text-muted"
            >
              No {{ plural('Participant') }} match “{{ search.trim() }}”
            </li>
            <li
              v-else-if="rankedParticipants.length > TOP && !search"
              key="more"
              class="py-3.5 text-sm font-bold text-hint"
            >
              Showing the top {{ TOP }}
            </li>
          </TransitionGroup>
        </template>
      </div>

      <div v-else key="groups" class="flex flex-col">
        <TransitionGroup
          tag="ol"
          name="list"
          class="mx-4 mt-3 mb-10 rounded-[24px] bg-card px-[18px] py-0.5"
          :aria-label="`${store.label('Group')}s`"
        >
          <li
            v-for="(group, index) in groups"
            :key="group.id"
            class="StatsGroup stats-row anim-rise"
            :style="stagger(index)"
          >
            <span class="hd text-[17px] text-hint">{{ index + 1 }}</span>
            <span class="flex min-w-0 items-center gap-2 text-[15px] font-extrabold">
              <span
                class="size-3 shrink-0 rounded-full"
                :style="{ background: group.color || 'var(--color-violet)' }"
                aria-hidden="true"
              />
              <span class="truncate">{{ group.$name }}</span>
            </span>
            <span class="hd text-[20px]">
              <AnimatedNumber :value="groupValue(group)" :duration="1000" />
            </span>
            <span
              class="stats-bar"
              :style="{
                height: '10px',
                width: barWidth(groupValue(group), topGroupValue),
                background: group.color || 'var(--color-violet)',
                ...stagger(index),
              }"
              aria-hidden="true"
            />
          </li>
        </TransitionGroup>
      </div>
    </Transition>
  </template>
</template>

<style scoped>
/* a search button that opens into a field while it's in use */
/* the input fills the whole pill, so even the closed circle is a real tap and fill target */
.stats-search {
  position: relative;
  display: flex;
  flex: 0 0 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-card);
  cursor: text;
  transition:
    flex-grow 0.45s var(--ease-out),
    box-shadow 0.18s var(--ease-out);
}
.stats-search:focus-within,
.stats-search:has(input:not(:placeholder-shown)) {
  flex-grow: 1;
}
.stats-search:focus-within {
  box-shadow: inset 0 0 0 3px var(--color-violet);
}
.stats-search svg {
  position: absolute;
  left: 12px;
  pointer-events: none;
}
.stats-search input {
  min-width: 0;
  flex: 1;
  height: 100%;
  padding: 0 12px 0 36px;
  background: transparent;
  font-size: 16px;
  font-weight: 700;
  outline: none;
}
.stats-search input::placeholder {
  color: var(--color-hint);
  font-weight: 600;
}

/* round filter button over an invisible native select; a violet pill once a group is picked */
.stats-filter {
  position: relative;
  display: inline-flex;
  flex: 0 1 auto;
  min-width: 2.75rem;
  max-width: 10rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 999px;
  background: var(--color-card);
  color: var(--color-ink);
  font-size: 15px;
  font-style: italic;
  font-weight: 900;
  letter-spacing: -0.02em;
  transition:
    background-color 0.2s,
    color 0.2s,
    padding 0.3s var(--ease-out),
    scale 0.25s var(--ease-spring);
}
.stats-filter.is-on {
  padding: 0 14px 0 12px;
  background: var(--color-violet);
  color: #fff;
}
.stats-filter:active {
  scale: 0.94;
}
.stats-filter:has(select:focus-visible) {
  box-shadow:
    0 0 0 3px var(--color-paper),
    0 0 0 6px var(--color-violet);
}
.stats-filter select {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
  font-size: 16px;
}

/* chip-looking native selects */
.stats-select {
  position: relative;
  display: inline-flex;
  min-width: 0;
  align-items: center;
}
.stats-select select {
  max-width: 100%;
  appearance: none;
  padding-right: 34px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stats-select svg {
  position: absolute;
  right: 13px;
  pointer-events: none;
}

/* the number inside sizes itself to this block's width */
.stats-block {
  container-type: inline-size;
}

/* podium steps grow up from the floor of the stage */
.stats-step {
  transform-origin: 50% 100%;
  animation: stats-grow 0.75s var(--ease-spring) both;
  animation-delay: var(--delay, 0ms);
}
.stats-avatar {
  animation: var(--animate-pop);
  animation-delay: var(--delay, 0ms);
}
.stats-glow {
  animation:
    var(--animate-pop),
    stats-glow 2.6s ease-in-out 1.6s infinite;
  animation-delay: var(--delay, 0ms), 1.6s;
}
.stats-crown {
  transform-origin: 50% 100%;
  animation: stats-crown 0.7s var(--ease-spring) 1.05s both;
}
.stats-note {
  --rx: 10deg;
  --rz: -2.5deg;
  --delay: 1.1s;
  box-shadow: 0 16px 24px -14px rgb(21 19 26 / 0.55);
}

/* ranked rows with a solid bar that sweeps in */
.stats-row {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  align-items: center;
  gap: 6px 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-line);
}
.stats-row:last-child {
  border-bottom: 0;
}
.stats-bar {
  grid-column: 2 / 4;
  height: 8px;
  border-radius: 999px;
  transform-origin: 0 50%;
  transition: width 0.6s var(--ease-out);
  animation: stats-sweep 0.8s var(--ease-out) both;
  animation-delay: calc(var(--i, 0) * 45ms + 150ms);
}

@keyframes stats-grow {
  from {
    scale: 1 0;
  }
}
@keyframes stats-sweep {
  from {
    scale: 0 1;
  }
}
@keyframes stats-crown {
  0% {
    opacity: 0;
    translate: 0 -18px;
    rotate: -20deg;
  }
  60% {
    opacity: 1;
    translate: 0 2px;
    rotate: 6deg;
  }
  100% {
    translate: 0 0;
    rotate: 0deg;
  }
}
@keyframes stats-glow {
  50% {
    filter: drop-shadow(0 0 14px #d4ff3a);
  }
}
</style>
