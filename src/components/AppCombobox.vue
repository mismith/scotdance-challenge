<script lang="ts">
export const ADD_NEW_KEY = '__new__'
</script>

<script setup lang="ts" generic="T extends { id: string }">
// a searchable picker that offers to add whatever was typed when nothing matches it exactly
import { ChevronDown, Plus } from 'lucide-vue-next'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from 'reka-ui'
import { computed, ref, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    items: T[]
    itemTitle?: string
    /** a number to show at the end of each option, e.g. a dancer's running total */
    itemNumber?: (item: T) => number | string | null | undefined
    placeholder?: string
    disabled?: boolean
    addNew?: (text: string) => unknown
    /** where an added item goes, e.g. the group a new dancer joins: `add “Is” to 4:30` */
    addTo?: string
  }>(),
  {
    itemTitle: 'name',
    itemNumber: undefined,
    placeholder: undefined,
    disabled: false,
    addNew: undefined,
    addTo: undefined,
  },
)
defineSlots<{
  /** an option's content (left part) */
  item?: (props: { item: T }) => unknown
  /** an option's number (right part); overrides `itemNumber` */
  number?: (props: { item: T }) => unknown
  /** before the text in the field, e.g. the chosen group's colour dot */
  leading?: (props: { item: T | undefined }) => unknown
}>()
const model = defineModel<string>({ default: '' })
const search = ref('')
const id = useId()

const title = (item?: T) =>
  item ? String((item as Record<string, unknown>)[props.itemTitle] ?? '') : ''
const selected = computed(() => props.items.find((item) => item.id === model.value))
const query = computed(() => search.value.trim().toLowerCase())
const filtered = computed(() =>
  query.value
    ? props.items.filter((item) => title(item).toLowerCase().includes(query.value))
    : props.items,
)
const canAdd = computed(
  () =>
    Boolean(props.addNew && query.value) &&
    !props.items.some((item) => title(item).toLowerCase() === query.value),
)
const numberOf = (item: T) => {
  const value = props.itemNumber?.(item)
  return typeof value === 'number' ? value.toLocaleString() : (value ?? '')
}

async function handleUpdate(value: unknown) {
  if (value === ADD_NEW_KEY && props.addNew) {
    const added = await props.addNew(search.value.trim())
    const addedId = added && typeof added === 'object' ? (added as { id?: string }).id : added
    model.value = typeof addedId === 'string' ? addedId : ''
    return
  }
  model.value = typeof value === 'string' ? value : ''
}
</script>

<template>
  <div class="group flex flex-col gap-1.5">
    <label :for="id" class="lbl" :class="{ 'opacity-45': disabled }">{{ label }}</label>
    <ComboboxRoot
      :model-value="model || undefined"
      :disabled="disabled"
      ignore-filter
      open-on-click
      reset-search-term-on-blur
      @update:model-value="handleUpdate"
    >
      <ComboboxAnchor class="pill pr-1" :class="{ 'opacity-45': disabled }">
        <slot name="leading" :item="selected" />
        <ComboboxInput
          :id="id"
          v-model="search"
          :display-value="(value: string) => title(items.find((item) => item.id === value))"
          :placeholder="placeholder ?? `pick or add a ${label.toLowerCase()}`"
          class="h-full min-w-0 flex-1 truncate bg-transparent outline-none placeholder:font-semibold placeholder:text-hint"
        />
        <ComboboxTrigger
          class="flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-transform duration-300 data-[state=open]:rotate-180"
          :aria-label="`Show ${label}`"
        >
          <ChevronDown :size="20" :stroke-width="2.6" />
        </ComboboxTrigger>
      </ComboboxAnchor>
      <ComboboxPortal>
        <ComboboxContent
          position="popper"
          :side-offset="8"
          :collision-padding="12"
          class="popover z-[60] max-h-[min(20rem,var(--reka-combobox-content-available-height))] w-(--reka-combobox-trigger-width) overflow-hidden rounded-[20px] bg-card shadow-[var(--shadow-float)]"
        >
          <ComboboxViewport class="flex flex-col gap-0.5 p-1.5">
            <ComboboxItem
              v-for="item in filtered"
              :key="item.id"
              :value="item.id"
              class="group/option flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-[14px] px-3.5 text-[17px] font-bold transition-colors duration-150 data-[highlighted]:bg-violet-soft data-[highlighted]:text-violet data-[highlighted]:shadow-[inset_0_0_0_2px_var(--color-violet)] data-[state=checked]:text-violet"
            >
              <span class="min-w-0 flex-1 truncate">
                <slot name="item" :item="item">{{ title(item) }}</slot>
              </span>
              <!-- visual only: options are named by their title alone -->
              <span
                v-if="$slots.number || itemNumber"
                aria-hidden="true"
                class="hd num shrink-0 text-lg text-hint group-data-[highlighted]/option:text-violet"
              >
                <slot name="number" :item="item">{{ numberOf(item) }}</slot>
              </span>
            </ComboboxItem>
            <ComboboxItem
              v-if="canAdd"
              :value="ADD_NEW_KEY"
              class="flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-[14px] px-3.5 text-[17px] text-violet transition-colors duration-150 data-[highlighted]:bg-violet-soft data-[highlighted]:shadow-[inset_0_0_0_2px_var(--color-violet)]"
              :class="{ 'mt-0.5 rounded-t-none border-t border-line': filtered.length }"
            >
              <Plus :size="18" :stroke-width="3" aria-hidden="true" />
              <span class="hd min-w-0 truncate"
                >add “{{ search.trim() }}”<template v-if="addTo"> to {{ addTo }}</template></span
              >
            </ComboboxItem>
            <div v-if="!filtered.length && !canAdd" class="px-3.5 py-3 font-semibold text-muted">
              {{ items.length ? 'no matches' : `type to add the first ${label.toLowerCase()}` }}
            </div>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>
  </div>
</template>
