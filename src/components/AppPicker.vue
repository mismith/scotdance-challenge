<script lang="ts">
export const ADD_NEW_KEY = '__new__'
</script>

<script setup lang="ts">
// v-autocomplete that offers to add whatever was typed when nothing matches
import { computed, nextTick, ref } from 'vue'

type Item = Record<string, unknown>

const props = withDefaults(
  defineProps<{
    items: object[]
    itemTitle?: string
    itemValue?: string
    hideNoData?: boolean
    noDataText?: string
    addNew?: (text: string) => unknown
    getAddNewText?: (text: string) => string
  }>(),
  {
    itemTitle: 'title',
    itemValue: 'id',
    hideNoData: true,
    noDataText: 'No matches',
    addNew: undefined,
    getAddNewText: (text: string) => `Add "${text}"`,
  },
)
const model = defineModel<unknown>()
const search = ref<string>()

const allItems = computed(() => {
  const query = search.value?.trim().toLowerCase()
  if (!props.addNew || !query) return props.items

  const hasMatches = props.items.some((item) =>
    String((item as Item)[props.itemTitle] ?? '')
      .toLowerCase()
      .includes(query),
  )
  if (hasMatches) return props.items

  return [
    ...props.items,
    { [props.itemValue]: ADD_NEW_KEY, [props.itemTitle]: props.getAddNewText(search.value!) },
  ]
})

async function handleUpdate(value: unknown) {
  if (props.addNew && value === ADD_NEW_KEY) {
    const text = search.value ?? ''
    const added = await props.addNew(text)
    model.value = added && typeof added === 'object' ? (added as Item)[props.itemValue] : added
    // v-autocomplete fills the search with the picked `Add "…"` text; clear it once it's done
    await nextTick()
    if (!model.value) search.value = ''
    return
  }
  model.value = value
}
</script>

<template>
  <v-autocomplete
    v-model:search="search"
    :model-value="model === '' ? null : model"
    :items="allItems"
    :item-title="itemTitle"
    :item-value="itemValue"
    :hide-no-data="hideNoData"
    :no-data-text="noDataText"
    :list-props="{ class: 'AppPicker__list' }"
    @update:model-value="handleUpdate"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </v-autocomplete>
</template>

<style>
/* match the old Vuetify 2 menu items */
.AppPicker__list .v-list-item {
  min-height: 48px;
}
.AppPicker__list .v-list-item-title {
  font-size: 0.8125rem;
  font-weight: 500;
}
</style>
