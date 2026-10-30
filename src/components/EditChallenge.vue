<script setup lang="ts">
import { parseISO } from 'date-fns'
import { Calendar, Globe, Lock } from 'lucide-vue-next'
import { computed, nextTick, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import AppDialog from '@/components/AppDialog.vue'
import type { Challenge, LabelKey } from '@/lib/firebase'

export type EditableChallenge = Pick<
  Challenge,
  'name' | 'description' | 'startAt' | 'endAt' | 'private' | 'labels'
>
type Field = 'description' | 'labels'
type DateKey = 'startAt' | 'endAt'

const value = defineModel<Partial<Challenge> | null | undefined>()
const emit = defineEmits<{
  add: [challenge: EditableChallenge]
  save: [challenge: EditableChallenge]
}>()
const store = useAppStore()

const challenge = ref<EditableChallenge>({ name: '' })
const showFields = ref<Partial<Record<Field, boolean>>>({})
const labelKeys: LabelKey[] = ['Group', 'Participant', 'Amount']
const descriptionInput = useTemplateRef<HTMLTextAreaElement>('descriptionInput')
const labelsFieldset = useTemplateRef<HTMLFieldSetElement>('labelsFieldset')

const audiences = [
  {
    private: true,
    icon: Lock,
    title: 'Just my people',
    hint: 'only people with the link can find it',
  },
  {
    private: false,
    icon: Globe,
    title: 'Everyone',
    hint: 'listed in Explore while it runs · needs an end date',
  },
]

const isOpen = computed({
  get: () => Boolean(value.value),
  set(open) {
    if (!open) value.value = null
  },
})
// kept while the sheet closes, so it doesn't flash "edit" and empty fields on the way out
const isNew = ref(false)
const source = shallowRef<Partial<Challenge>>({})
const title = computed(
  () => `${isNew.value ? 'new' : 'edit'} ${store.label('Challenge').toLowerCase()}`,
)
// listed challenges are time-boxed, so they drop out of Explore on their own
const needsEndDate = computed(() => isNew.value && !challenge.value.private)
const endsBeforeStart = computed(() =>
  Boolean(
    challenge.value.startAt &&
    challenge.value.endAt &&
    challenge.value.startAt > challenge.value.endAt,
  ),
)
const isValid = computed(
  () =>
    Boolean(challenge.value.name?.trim()) &&
    (!needsEndDate.value || Boolean(challenge.value.endAt)) &&
    !endsBeforeStart.value,
)
const dateFields = computed(() => [
  {
    key: 'startAt' as DateKey,
    label: 'Starts',
    placeholder: 'right away',
    min: undefined,
    required: false,
  },
  {
    key: 'endAt' as DateKey,
    label: 'Ends',
    placeholder: needsEndDate.value ? 'pick an end date' : 'no end date',
    min: challenge.value.startAt || undefined,
    required: needsEndDate.value,
  },
])

watch(
  value,
  (to) => {
    if (!to) return
    isNew.value = !to.id
    source.value = to
    // only the fields this form edits, so stats and ids are never written back
    const { name = '', description, startAt, endAt, private: isPrivate, labels } = to
    challenge.value = { name, description, startAt, endAt, private: isPrivate, labels }
    showFields.value = {}
  },
  { immediate: true },
)

function hasValue(field: Field) {
  const fieldValue = source.value[field]
  if (fieldValue && typeof fieldValue === 'object') return Object.values(fieldValue).some(Boolean)
  return Boolean(fieldValue)
}
function showField(field: Field) {
  return showFields.value[field] ?? hasValue(field)
}
async function revealField(field: Field) {
  showFields.value[field] = true
  await nextTick()
  if (field === 'description') descriptionInput.value?.focus()
  else labelsFieldset.value?.querySelector('input')?.focus()
}
function setLabel(key: LabelKey, label: string) {
  challenge.value.labels = { ...challenge.value.labels, [key]: label.trim() || null }
}

// e.g. "Mon 1 Mar 2027" (in the reader's own date order)
function formatDay(day?: string | null) {
  if (!day) return ''
  return parseISO(day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
// open the calendar from anywhere on the pill, not just its tiny icon
function openPicker(event: Event) {
  try {
    ;(event.currentTarget as HTMLInputElement).showPicker?.()
  } catch {
    // some browsers only allow it from certain gestures; typing still works
  }
}

function handleSubmit() {
  if (!isValid.value) return
  // Firestore rejects `undefined` values; empty dates are stored as null, like the old app did
  const data = Object.fromEntries(
    Object.entries({
      ...challenge.value,
      name: challenge.value.name.trim(),
      startAt: challenge.value.startAt || null,
      endAt: challenge.value.endAt || null,
      private: Boolean(challenge.value.private),
    }).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as EditableChallenge
  if (isNew.value) emit('add', data)
  else emit('save', data)
}
</script>

<template>
  <AppDialog v-model="isOpen" :title="title">
    <form autocomplete="off" class="flex flex-col gap-3" @submit.prevent="handleSubmit()">
      <label class="group flex flex-col gap-1.5">
        <span class="lbl lowercase">Name</span>
        <input
          v-model="challenge.name"
          class="pill"
          required
          enterkeyhint="next"
          placeholder="e.g. Spring Shuffles"
        />
      </label>

      <fieldset v-if="isNew" class="group flex flex-col gap-2">
        <legend class="lbl mb-1.5 lowercase">Who's it for?</legend>
        <label
          v-for="audience in audiences"
          :key="audience.title"
          class="audience relative flex min-h-[68px] items-center gap-3 rounded-[20px] px-3.5 py-3 outline-violet has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 active:scale-[0.98]"
          :class="
            challenge.private === audience.private
              ? 'bg-violet text-white shadow-lift -translate-y-0.5'
              : 'bg-white text-ink'
          "
        >
          <input
            v-model="challenge.private"
            type="radio"
            name="audience"
            :value="audience.private"
            class="absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0"
          />
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
            :class="challenge.private === audience.private ? 'bg-white/16' : 'bg-paper'"
            aria-hidden="true"
          >
            <component
              :is="audience.icon"
              :size="20"
              :stroke-width="2.5"
              class="transition-colors duration-300"
              :class="challenge.private === audience.private ? 'text-lime' : 'text-ink'"
            />
          </span>
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="hd text-xl lowercase">{{ audience.title }}</span>
            <span
              class="text-[13px] leading-snug font-medium transition-colors duration-300"
              :class="challenge.private === audience.private ? 'text-lilac' : 'text-muted'"
            >
              {{ audience.hint }}
            </span>
          </span>
          <span class="relative size-[22px] shrink-0" aria-hidden="true">
            <Transition name="pop">
              <svg
                v-if="challenge.private === audience.private"
                viewBox="0 0 24 24"
                class="absolute inset-0 size-full"
              >
                <circle cx="12" cy="12" r="10" class="fill-lime" />
                <path
                  d="M7.5 12.5l3 3 6-6"
                  fill="none"
                  class="stroke-ink"
                  stroke-width="2.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span v-else class="absolute inset-0 rounded-full ring-2 ring-handle ring-inset" />
            </Transition>
          </span>
        </label>
      </fieldset>
      <p
        v-else
        class="flex items-center gap-3 rounded-[20px] bg-white px-3.5 py-3 text-[15px] leading-snug font-medium text-muted"
      >
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper text-ink"
          aria-hidden="true"
        >
          <Lock v-if="challenge.private" :size="20" :stroke-width="2.5" />
          <Globe v-else :size="20" :stroke-width="2.5" />
        </span>
        <span v-if="challenge.private">
          <strong class="font-extrabold text-ink">Just your people:</strong>
          only people with the link can find it.
        </span>
        <span v-else>
          <strong class="font-extrabold text-ink">Everyone:</strong>
          listed in Explore while it runs.
        </span>
      </p>

      <label v-for="field in dateFields" :key="field.key" class="group flex flex-col gap-1.5">
        <span class="lbl lowercase">
          {{ field.label }}
          <span v-if="field.key === 'endAt' && !field.required" class="font-medium">
            (optional)
          </span>
        </span>
        <span class="pill relative">
          <input
            v-model="challenge[field.key]"
            type="date"
            class="date-input appearance-none"
            :required="field.required"
            :min="field.min"
            :aria-invalid="field.key === 'endAt' && endsBeforeStart"
            :aria-describedby="field.key === 'endAt' ? 'ends-error' : undefined"
            @click="openPicker"
          />
          <span
            class="date-shown pointer-events-none absolute inset-y-0 left-4 flex items-center"
            :class="{ 'font-semibold text-hint': !challenge[field.key] }"
            aria-hidden="true"
          >
            {{ formatDay(challenge[field.key]) || field.placeholder }}
          </span>
          <Calendar
            :size="18"
            :stroke-width="2.4"
            class="pointer-events-none shrink-0"
            :class="challenge[field.key] ? 'text-muted' : 'text-faint'"
            aria-hidden="true"
          />
        </span>
      </label>
      <!-- always there, so a screen reader hears it arrive -->
      <p
        id="ends-error"
        aria-live="polite"
        class="-mt-1 pl-1.5 text-[13px] font-bold text-orange-ink empty:hidden"
      >
        <Transition name="rise">
          <span v-if="endsBeforeStart">The end comes before the start. Pick a later end date.</span>
        </Transition>
      </p>

      <Transition name="rise">
        <label v-if="showField('description')" class="group flex flex-col gap-1.5">
          <span class="lbl lowercase">Description</span>
          <textarea
            ref="descriptionInput"
            v-model="challenge.description"
            rows="3"
            class="pill h-auto min-h-24 resize-none py-3.5 text-[17px] leading-snug font-semibold"
            placeholder="What are you dancing for?"
          />
        </label>
      </Transition>
      <Transition name="rise">
        <fieldset
          v-if="showField('labels')"
          ref="labelsFieldset"
          class="group flex flex-col gap-1.5"
        >
          <legend class="lbl mb-1.5 lowercase">Rename labels</legend>
          <label v-for="key in labelKeys" :key="key" class="pill">
            <span class="w-24 shrink-0 text-[15px] font-semibold text-muted lowercase">
              {{ key }}
            </span>
            <input
              :value="challenge.labels?.[key] || ''"
              :aria-label="key"
              :placeholder="key"
              @input="setLabel(key, ($event.target as HTMLInputElement).value)"
            />
          </label>
        </fieldset>
      </Transition>
      <div
        v-if="!showField('description') || !showField('labels')"
        class="mt-1 flex flex-wrap gap-2"
      >
        <button
          v-if="!showField('description')"
          type="button"
          class="chip chip-sm lowercase"
          @click="revealField('description')"
        >
          + Description
        </button>
        <button
          v-if="!showField('labels')"
          type="button"
          class="chip chip-sm lowercase"
          @click="revealField('labels')"
        >
          + Rename labels
        </button>
      </div>

      <dl v-if="source.createdAt" class="pl-1.5 text-[13px] font-medium text-hint">
        <dt class="inline font-bold">Created</dt>
        <dd class="inline">{{ source.createdAt.toDate().toLocaleString() }}</dd>
        <template v-if="source.updatedAt">
          <br />
          <dt class="inline font-bold">Updated</dt>
          <dd class="inline">{{ source.updatedAt.toDate().toLocaleString() }}</dd>
        </template>
      </dl>

      <button type="submit" class="btn btn-dark btn-lg mt-2 lowercase" :disabled="!isValid">
        {{ isNew ? 'Create + get the link' : 'Save' }}
      </button>
    </form>
  </AppDialog>
</template>

<style scoped>
/* a disabled ink button reads as a quiet chip, not muddy see-through ink */
.btn-dark:disabled {
  background: var(--color-chip);
  color: var(--color-muted);
  opacity: 1;
}
.audience {
  transition:
    background-color 0.3s,
    color 0.3s,
    box-shadow 0.35s,
    translate 0.45s var(--ease-spring),
    scale 0.25s var(--ease-spring);
}

/* native date inputs, drawn as a friendly pill: the date reads "Mon 1 Mar 2027"
   until you edit it, then the browser's own editor shows */
.date-input {
  color: transparent;
  text-align: left;
}
.date-input:focus {
  color: inherit;
}
.date-input:focus + .date-shown {
  opacity: 0;
}
.date-input::-webkit-date-and-time-value {
  text-align: left;
}
.date-input::-webkit-datetime-edit {
  padding: 0;
}
/* the browser's calendar button sits invisibly over ours */
.date-input::-webkit-calendar-picker-indicator {
  position: absolute;
  right: 8px;
  width: 36px;
  height: 36px;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
