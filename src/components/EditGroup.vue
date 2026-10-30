<script lang="ts">
// the Pop palette, so new groups' ribbons match the rest of the app
// (no violet: it would vanish on the violet header and moment)
// named, so screen readers say "pink" rather than a hex code
export const groupColors = [
  { value: '#ff5fa8', name: 'pink' },
  { value: '#ff6a2b', name: 'orange' },
  { value: '#ffd23f', name: 'yellow' },
  { value: '#d4ff3a', name: 'lime' },
  { value: '#4cd964', name: 'green' },
  { value: '#3da9ff', name: 'blue' },
  { value: '#d336f4', name: 'purple' },
]
</script>

<script setup lang="ts">
import { Check, ChevronDown, Plus } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import AppDialog from '@/components/AppDialog.vue'
import { availableCountries, fetchCountryCode } from '@/lib/country'
import type { Group } from '@/lib/firebase'
import { stagger } from '@/lib/motion'

export type NewGroup = Pick<Group, 'challengeId' | 'name' | 'color' | 'country'>

const value = defineModel<NewGroup | null | undefined>()
const emit = defineEmits<{ add: [group: NewGroup] }>()
const store = useAppStore()

const group = ref<Partial<NewGroup>>({})
const isShowingCountry = ref(false)

const isOpen = computed({
  get: () => Boolean(value.value),
  set(open) {
    if (!open) value.value = null
  },
})
const isValid = computed(
  () =>
    Boolean(group.value.name?.trim()) && /^#[a-f0-9]{6}$/i.test(group.value.color?.trim() ?? ''),
)
const selectedColor = computed(() => group.value.color?.toLowerCase())
const isCustomColor = computed(
  () =>
    Boolean(selectedColor.value) && !groupColors.some(({ value }) => value === selectedColor.value),
)

watch(
  value,
  (to) => {
    // kept while the sheet closes, so its fields don't empty on the way out
    if (!to) return
    group.value = { ...to }
    isShowingCountry.value = false
  },
  { immediate: true },
)

// a tick that reads on light colours (yellow) as well as dark ones
function checkColor(hex: string) {
  const [r = 0, g = 0, b = 0] = (hex.slice(1).match(/../g) ?? []).map((part) => parseInt(part, 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? 'var(--color-ink)' : '#fff'
}

async function showCountry() {
  isShowingCountry.value = true
  if (group.value.country === undefined) {
    group.value.country = null
    const country = await fetchCountryCode().catch(() => null)
    if (!group.value.country && country) group.value.country = country
  }
}

function handleSubmit() {
  if (!isValid.value) return
  // Firestore rejects `undefined` values
  const { country, ...rest } = group.value
  emit('add', (country === undefined ? rest : { ...rest, country }) as NewGroup)
}
</script>

<template>
  <AppDialog v-model="isOpen" :title="`add ${store.label('Group').toLowerCase()}`">
    <form autocomplete="off" class="flex flex-col gap-3" @submit.prevent="handleSubmit()">
      <label class="group flex flex-col gap-1.5">
        <span class="lbl lowercase">Name</span>
        <input v-model="group.name" class="pill" required placeholder="e.g. Red Team" />
      </label>

      <fieldset class="group flex flex-col gap-1.5">
        <legend class="lbl mb-1.5 lowercase">Colour</legend>
        <!-- two rows of four, so every swatch is a full 44px tap -->
        <div class="grid grid-cols-4 gap-1.5 rounded-[20px] bg-white p-2">
          <span
            v-for="({ value: color, name }, index) in groupColors"
            :key="color"
            class="anim-pop flex justify-center"
            :style="stagger(index)"
          >
            <button
              type="button"
              class="swatch flex aspect-square w-full max-w-11 items-center justify-center rounded-full"
              :class="{ 'is-on': selectedColor === color }"
              :style="{ background: color }"
              :aria-label="name"
              :aria-pressed="selectedColor === color"
              @click="group.color = color"
            >
              <Transition name="pop">
                <Check
                  v-if="selectedColor === color"
                  :size="20"
                  :stroke-width="3.2"
                  :color="checkColor(color)"
                  aria-hidden="true"
                />
              </Transition>
            </button>
          </span>
          <span class="anim-pop flex justify-center" :style="stagger(groupColors.length)">
            <label
              class="swatch relative flex aspect-square w-full max-w-11 items-center justify-center overflow-hidden rounded-full has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet"
              :class="{ 'is-on': isCustomColor }"
              :style="{
                background: isCustomColor
                  ? selectedColor
                  : 'conic-gradient(#ff5fa8, #ff6a2b, #ffd23f, #d4ff3a, #3da9ff, #6a3cff, #ff5fa8)',
              }"
              title="Any colour"
            >
              <input
                v-model="group.color"
                type="color"
                aria-label="Any colour"
                class="absolute inset-0 size-full cursor-pointer opacity-0"
              />
              <Check
                v-if="isCustomColor"
                :size="20"
                :stroke-width="3.2"
                :color="checkColor(selectedColor!)"
                aria-hidden="true"
              />
              <Plus
                v-else
                :size="20"
                :stroke-width="3"
                color="#fff"
                class="drop-shadow-[0_1px_1px_rgb(21_19_26/0.4)]"
                aria-hidden="true"
              />
            </label>
          </span>
        </div>
      </fieldset>

      <Transition name="rise" mode="out-in">
        <label v-if="isShowingCountry" class="group flex flex-col gap-1.5">
          <span class="lbl lowercase">{{ store.label('Country') }}</span>
          <span class="pill relative">
            <select
              v-model="group.country"
              class="h-full min-w-0 flex-1 appearance-none bg-transparent pr-8 outline-none"
            >
              <option :value="null">None</option>
              <option v-for="country in availableCountries" :key="country.id" :value="country.id">
                {{ country.$name }}
              </option>
            </select>
            <ChevronDown
              :size="20"
              :stroke-width="2.6"
              class="pointer-events-none absolute right-4 text-muted"
              aria-hidden="true"
            />
          </span>
        </label>
        <div v-else class="flex">
          <button type="button" class="chip chip-sm lowercase" @click="showCountry()">
            + {{ store.label('Country') }}
          </button>
        </div>
      </Transition>

      <button type="submit" class="btn btn-dark btn-lg mt-2 lowercase" :disabled="!isValid">
        Add
      </button>
    </form>
  </AppDialog>
</template>

<style scoped>
.swatch {
  box-shadow: inset 0 0 0 1px rgb(21 19 26 / 0.08);
  transition:
    scale 0.35s var(--ease-spring),
    box-shadow 0.25s;
}
.swatch:active {
  scale: 0.9;
}
.swatch.is-on {
  scale: 1.14;
  box-shadow: 0 8px 14px -6px rgb(21 19 26 / 0.55);
}
/* a disabled ink button reads as a quiet chip, not muddy see-through ink */
.btn-dark:disabled {
  background: var(--color-chip);
  color: var(--color-muted);
  opacity: 1;
}
</style>
