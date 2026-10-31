<script setup lang="ts">
import { useElementVisibility } from '@vueuse/core'
import { format, isToday, isYesterday, subDays } from 'date-fns'
import { Flag, Flame, LoaderCircle, Moon, Pencil, Sun, Trash2 } from 'lucide-vue-next'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import AppDialog from '@/components/AppDialog.vue'
import { timeTag } from '@/lib/eggs'
import { type Entry, findById } from '@/lib/firebase'
import { animate, easing, stagger } from '@/lib/motion'
import { openChat } from '@/lib/utils'

const INCREMENT = 20

const store = useAppStore()

const limit = ref(0)
const isLoadingMore = ref(false)
const flaggedEntry = ref<Entry | null>(null)
const deletedEntry = ref<Entry | null>(null)
const editedEntry = ref<Entry | null>(null)
const editedValue = ref<string | number | null>(null)
// who the entry being edited is, kept while the sheet closes
const editedWho = ref('')

const isShowingAllEntries = computed(() => store.entries.length < limit.value)

const isFlagging = computed({
  get: () => Boolean(flaggedEntry.value),
  set: (on) => !on && (flaggedEntry.value = null),
})
const isEditing = computed({
  get: () => Boolean(editedEntry.value),
  set: (on) => !on && (editedEntry.value = null),
})
// whole numbers from 1 to 9,999, as when logging
const isEditedValueValid = computed(() => {
  const value = Number(editedValue.value)
  return Number.isInteger(value) && value > 0 && value <= 9999
})
const isDeleting = computed({
  get: () => Boolean(deletedEntry.value),
  set: (on) => !on && (deletedEntry.value = null),
})

// an entry still saving has no server time yet: it belongs to right now
const dateOf = (entry: Entry) => entry.createdAt?.toDate() ?? new Date()
const dayKey = (date: Date) => format(date, 'yyyy-MM-dd')

// entries grouped by the day they were added, newest first
const days = computed(() => {
  const result: { key: string; date: Date; entries: Entry[] }[] = []
  for (const entry of store.entries) {
    const date = dateOf(entry)
    const key = dayKey(date)
    const last = result.at(-1)
    if (last?.key === key) last.entries.push(entry)
    else result.push({ key, date, entries: [entry] })
  }
  return result
})
const formatDay = (date: Date) => {
  if (isToday(date)) return 'today'
  if (isYesterday(date)) return 'yesterday'
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return format(date, sameYear ? 'EEE d MMM' : 'EEE d MMM yyyy').toLowerCase()
}
const formatTime = (entry: Entry) =>
  entry.createdAt
    ?.toDate()
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })
    .toLowerCase() ?? 'saving…'

const groupOf = (entry: Entry) => findById(store.groups, entry.groupId)
const participantOf = (entry: Entry) => findById(store.participants, entry.participantId)
const isMine = (entry: Entry) => Boolean(store.me && store.me.uid === entry.createdBy)
const initialOf = (entry: Entry) =>
  Array.from(participantOf(entry)?.name.trim() ?? '')[0]?.toUpperCase() ?? ''

// ink or white on a group colour, whichever has more contrast
function avatarStyle(entry: Entry) {
  const color = groupOf(entry)?.color
  const rgb = color
    ?.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
    ?.slice(1)
    .map((hex) => {
      const c = parseInt(hex, 16) / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
  if (!color || !rgb) return { background: 'var(--color-chip)' }
  const [r = 0, g = 0, b = 0] = rgb
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  // ink #15131A has a luminance of about 0.007
  const onInk = (luminance + 0.05) / 0.057
  const onWhite = 1.05 / (luminance + 0.05)
  return { background: color, color: onInk >= onWhite ? 'var(--color-ink)' : '#fff' }
}

// the same hours as the moment after logging (still saving: no time yet, so no tag)
const tagOf = (entry: Entry) => (entry.createdAt ? timeTag(dateOf(entry)) : null)
const isNightOwl = (entry: Entry) => tagOf(entry) === 'night owl'
const isEarlyBird = (entry: Entry) => tagOf(entry) === 'early bird'

/**
 * Days in a row, only where the loaded entries prove it: 3 or more days running for that
 * dancer, ending on the entry's day. Shown once a day, on the dancer's newest entry.
 * Older entries not loaded yet can only make the count smaller, never wrong.
 */
const streaks = computed(() => {
  const daysByDancer = new Map<string, Set<string>>()
  for (const entry of store.entries) {
    if (!entry.createdAt) continue
    const set = daysByDancer.get(entry.participantId) ?? new Set()
    set.add(dayKey(dateOf(entry)))
    daysByDancer.set(entry.participantId, set)
  }
  const result = new Map<string, number>()
  const shown = new Set<string>()
  for (const entry of store.entries) {
    if (!entry.createdAt) continue
    const date = dateOf(entry)
    const once = `${entry.participantId} ${dayKey(date)}`
    if (shown.has(once)) continue
    shown.add(once)
    const set = daysByDancer.get(entry.participantId)
    let count = 0
    for (let day = date; set?.has(dayKey(day)); day = subDays(day, 1)) count++
    if (count >= 3) result.set(entry.id, count)
  }
  return result
})
const hasTags = (entry: Entry) =>
  isNightOwl(entry) || isEarlyBird(entry) || streaks.value.has(entry.id)

/**
 * How each row comes in: the first batch (and each "more" batch) rises in turn, entries
 * arriving live slide down in at the top. Worked out before the rows render.
 */
const entrances = new Map<string, { i: number; from: number }>()
let newestTime = 0
const timeOf = (entry: Entry) => entry.createdAt?.toMillis() ?? Date.now()
watch(
  () => store.entries,
  (entries) => {
    const isFirstBatch = entrances.size === 0
    let i = 0
    for (const entry of entries) {
      if (entrances.has(entry.id)) continue
      const isLive = !isFirstBatch && timeOf(entry) > newestTime
      entrances.set(entry.id, isLive ? { i: 0, from: -16 } : { i: i++, from: 14 })
    }
    for (const entry of entries) newestTime = Math.max(newestTime, timeOf(entry))
  },
  { immediate: true },
)
function rowStyle(entry: Entry) {
  const { i, from } = entrances.get(entry.id) ?? { i: 0, from: 14 }
  return { ...stagger(i), '--from': `${from}px` }
}

// deleted rows (and emptied days) fold away
function collapse(el: Element, done: () => void) {
  const node = el as HTMLElement
  const style = getComputedStyle(node)
  node.style.overflow = 'hidden'
  animate(
    node,
    [
      {
        height: `${node.offsetHeight}px`,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        opacity: 1,
      },
      { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0 },
    ],
    { duration: 380, easing: easing.out, fill: 'forwards' },
  ).then(done)
}

async function loadMore() {
  if (isShowingAllEntries.value || isLoadingMore.value) return

  isLoadingMore.value = true
  limit.value += INCREMENT
  await store.bindEntries(store.challengeId || undefined, limit.value)
  isLoadingMore.value = false
}

watch(
  () => store.challengeId,
  (id, previousId) => {
    // another challenge: its entries come in as a first batch again
    if (previousId !== undefined && id !== previousId) {
      entrances.clear()
      newestTime = 0
    }
    limit.value = 0
    loadMore()
  },
  { immediate: true },
)

// infinite scroll: keep loading while the "more" button is (nearly) on screen
const moreButton = useTemplateRef<HTMLElement>('moreButton')
const isMoreButtonVisible = useElementVisibility(moreButton, { rootMargin: '0px 0px 200px 0px' })
watch([isMoreButtonVisible, isLoadingMore], ([visible, loading]) => {
  if (visible && !loading) loadMore()
})

function openLiveChat() {
  openChat(flaggedEntry.value ? `Flagged Entry ID: ${flaggedEntry.value.id}` : undefined)
  flaggedEntry.value = null
}
function startEditing(entry: Entry) {
  editedEntry.value = entry
  editedValue.value = entry.value
  editedWho.value = [participantOf(entry)?.name, groupOf(entry)?.$name].filter(Boolean).join(' · ')
}
async function saveEntry() {
  if (!editedEntry.value || !isEditedValueValid.value) return
  try {
    await store.updateEntry(editedEntry.value.id, Number(editedValue.value))
    editedEntry.value = null
  } catch (error) {
    store.notifyFailed(error)
  }
}
// the menu hands focus to the sheet it opens, rather than back to its own button
function keepFocusInSheet(event: Event) {
  if (isEditing.value || isDeleting.value) event.preventDefault()
}
async function deleteEntry() {
  try {
    if (deletedEntry.value) await store.deleteEntry(deletedEntry.value.id)
    deletedEntry.value = null
  } catch (error) {
    store.notifyFailed(error)
  }
}
</script>

<template>
  <Transition name="rise">
    <div
      v-if="!store.entries.length && !isLoadingMore"
      class="m-auto flex flex-col items-center gap-2 px-6 py-10 text-center"
    >
      <p class="hd anim-pop text-[30px]">no entries yet</p>
      <p class="anim-rise text-[15px] font-semibold text-muted" style="--delay: 120ms">
        Every bit of practice counts. Be the first!
      </p>
      <router-link
        :to="{ name: 'new' }"
        class="btn btn-primary anim-rise mt-3"
        style="--delay: 220ms"
      >
        log the first one
      </router-link>
    </div>
  </Transition>

  <TransitionGroup tag="div" name="day" class="flex flex-col px-4" appear @leave="collapse">
    <section v-for="day in days" :key="day.key" class="flex flex-col pt-4 first:pt-3.5">
      <h2 class="hd mb-2 px-1.5 text-[22px]">{{ formatDay(day.date) }}</h2>
      <TransitionGroup
        tag="ul"
        name="feed"
        class="overflow-hidden rounded-[24px] bg-card"
        appear
        @leave="collapse"
      >
        <li
          v-for="entry in day.entries"
          :id="`entry-${entry.id}`"
          :key="entry.id"
          class="ActivityItem relative after:pointer-events-none after:absolute after:right-3 after:bottom-0 after:left-4 after:h-px after:bg-line last:after:hidden"
          :class="{ 'bg-lime-soft': isMine(entry) }"
          :style="rowStyle(entry)"
        >
          <!-- the whole row opens its menu: edit or delete your own, flag anyone else's -->
          <DropdownMenuRoot>
            <DropdownMenuTrigger
              class="ActivityItem-row grid w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2.5 py-2.5 pr-4 pl-4 text-left"
            >
              <span class="avatar" :style="avatarStyle(entry)" aria-hidden="true">
                {{ initialOf(entry) }}
              </span>

              <span class="block min-w-0">
                <span class="block text-base leading-tight font-extrabold break-words">
                  {{ participantOf(entry)?.name ?? '…' }}<span class="sr-only">{{ ' · ' }}</span>
                </span>
                <span class="mt-0.5 block text-[13px] font-semibold text-muted">
                  {{ groupOf(entry)?.$name ?? '…' }}{{ isMine(entry) ? ' · you' : '' }}{{ ' · '
                  }}<time class="num" :datetime="entry.createdAt?.toDate().toISOString()">
                    {{ formatTime(entry) }}
                  </time>
                </span>
                <span v-if="hasTags(entry)" class="mt-[5px] flex flex-wrap gap-1">
                  <span v-if="isNightOwl(entry)" class="tag anim-pop bg-ink text-white">
                    <Moon :size="12" :stroke-width="0" fill="currentColor" class="text-lime" />
                    night owl
                  </span>
                  <span
                    v-if="isEarlyBird(entry)"
                    class="tag anim-pop bg-butter-soft text-butter-ink"
                  >
                    <Sun :size="12" :stroke-width="3" class="text-orange" />
                    early bird
                  </span>
                  <span
                    v-if="streaks.has(entry.id)"
                    class="tag anim-pop bg-orange-soft text-orange-ink"
                  >
                    <Flame :size="12" :stroke-width="0" fill="currentColor" class="text-orange" />
                    {{ streaks.get(entry.id) }} days
                  </span>
                </span>
              </span>

              <Transition name="pop" mode="out-in">
                <span
                  :key="entry.value"
                  class="hd num text-[30px] whitespace-nowrap"
                  :class="isMine(entry) ? 'text-violet' : 'text-fg'"
                >
                  +{{ entry.value.toLocaleString() }}
                </span>
              </Transition>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent
                align="end"
                :side-offset="-8"
                :collision-padding="12"
                class="popover z-[60] flex min-w-[168px] flex-col rounded-[20px] bg-card p-1.5 text-fg shadow-float"
                @close-auto-focus="keepFocusInSheet"
              >
                <template v-if="isMine(entry)">
                  <DropdownMenuItem class="menu-item" @select="startEditing(entry)">
                    <Pencil :size="17" :stroke-width="2.4" class="text-violet" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem class="menu-item" @select="deletedEntry = entry">
                    <Trash2 :size="17" :stroke-width="2.4" class="text-pink" />
                    Delete
                  </DropdownMenuItem>
                </template>
                <DropdownMenuItem v-else class="menu-item" @select="flaggedEntry = entry">
                  <Flag :size="17" :stroke-width="2.4" class="text-violet" />
                  Flag
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </li>
      </TransitionGroup>
    </section>
  </TransitionGroup>

  <div
    v-if="!isShowingAllEntries || isLoadingMore"
    ref="moreButton"
    class="flex justify-center py-8"
  >
    <button
      type="button"
      class="btn btn-icon btn-soft"
      aria-label="More"
      :disabled="isLoadingMore"
      @click="loadMore()"
    >
      <LoaderCircle :size="22" :stroke-width="2.6" :class="{ 'animate-spin': isLoadingMore }" />
    </button>
  </div>
  <div v-else class="h-10" />

  <AppDialog
    v-model="isFlagging"
    title="flag an issue"
    description="Did you make a mistake, or does something seem off? Help sort it out with a super quick explanation of what you think is wrong."
  >
    <template #title-icon><Flag :size="24" :stroke-width="2.6" class="text-violet" /></template>
    <button type="button" class="btn btn-primary btn-lg mt-2" @click="openLiveChat()">flag</button>
  </AppDialog>

  <AppDialog v-model="isEditing" title="edit entry" :description="editedWho || undefined">
    <form autocomplete="off" class="flex flex-col gap-4" @submit.prevent="saveEntry()">
      <div class="flex flex-col gap-1.5">
        <label for="edit-entry-amount" class="lbl">{{ store.label('Amount') }}</label>
        <input
          id="edit-entry-amount"
          v-model="editedValue"
          type="number"
          inputmode="numeric"
          step="1"
          min="1"
          max="9999"
          class="pill num text-[28px] font-black tracking-[-0.035em] italic"
          :aria-invalid="!isEditedValueValid"
          aria-describedby="edit-entry-error"
        />
        <span
          id="edit-entry-error"
          aria-live="polite"
          class="pl-1.5 text-sm font-bold text-orange-ink empty:hidden"
          >{{ isEditedValueValid ? '' : 'Whole numbers from 1 to 9,999, please!' }}</span
        >
      </div>
      <button type="submit" class="btn btn-primary btn-lg" :disabled="!isEditedValueValid">
        save
      </button>
    </form>
  </AppDialog>

  <AppDialog
    v-model="isDeleting"
    title="delete entry"
    description="Did you make a mistake? You can remove this entry, then log a new one if you need to."
  >
    <button type="button" class="btn btn-pink btn-lg mt-2" @click="deleteEntry()">delete</button>
  </AppDialog>
</template>

<style scoped>
@reference '../style.css';

/* quiet icon buttons at the end of a row */
/* each row is a button that opens its menu: it tints and squishes a touch when pressed */
.ActivityItem-row {
  transition:
    background-color 0.2s,
    scale 0.3s var(--ease-spring);
}
.ActivityItem-row:hover,
.ActivityItem-row[data-state='open'] {
  @apply bg-ink/[0.03];
}
.ActivityItem-row:active {
  scale: 0.985;
}
.ActivityItem-row:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 3px var(--color-violet);
}

/* the edit / delete / flag menu on each row */
.menu-item {
  @apply flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[14px] px-3 text-[15px] font-bold outline-none select-none;
  transition: background-color 0.15s;
}
/* a ring as well as the tint, so the keyboard's place is easy to see */
.menu-item[data-highlighted] {
  @apply bg-violet-soft text-violet;
  box-shadow: inset 0 0 0 2px var(--color-violet);
}

/* rows: rise in turn on first load, slide down in at the top when they arrive live */
.feed-enter-active {
  transition:
    opacity 0.35s ease-out,
    translate 0.55s var(--ease-spring);
  transition-delay: calc(var(--i, 0) * 45ms);
}
.feed-enter-from {
  opacity: 0;
  translate: 0 var(--from, 14px);
}
.feed-move,
.day-move {
  transition: transform 0.45s var(--ease-out);
}

.day-enter-active {
  transition: opacity 0.3s ease-out;
}
.day-enter-from {
  opacity: 0;
}

/* tags pop on just after their row */
.tag.anim-pop {
  --delay: 220ms;
}
</style>
