<script setup lang="ts">
import { computed } from 'vue'
import { type GroupItem, useAppStore } from '@/stores/app'
import AppPicker from '@/components/AppPicker.vue'
import { availableCountries } from '@/lib/country'

const props = withDefaults(
  defineProps<{ allGroups: GroupItem[]; filteredGroups?: GroupItem[]; searchable?: boolean }>(),
  { filteredGroups: undefined, searchable: false },
)
const countryIds = defineModel<string[]>('countryIds', { default: () => [] })
const groupIds = defineModel<string[]>('groupIds', { default: () => [] })
const searchQuery = defineModel<string | null>('searchQuery', { default: null })
const store = useAppStore()

const relevantCountries = computed(() => {
  const codes = new Set(props.allGroups.map(({ country }) => country).filter(Boolean))
  return availableCountries.filter(({ id }) => codes.has(id))
})
const isDirty = computed(
  () =>
    Boolean(countryIds.value?.length) ||
    Boolean(props.filteredGroups && groupIds.value?.length) ||
    Boolean(props.searchable && searchQuery.value),
)
</script>

<template>
  <v-menu max-width="400" :close-on-content-click="false">
    <template #activator="{ props: activatorProps }">
      <v-btn icon variant="text" aria-label="Filter by" v-bind="activatorProps">
        <v-badge :model-value="isDirty" dot color="primary">
          <v-icon>mdi-filter-variant</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-form autocomplete="off">
      <v-sheet class="pb-4" min-width="280" elevation="4" rounded>
        <v-list-subheader class="px-4">Filter by</v-list-subheader>
        <AppPicker
          v-model="countryIds"
          :label="store.label('Country')"
          variant="outlined"
          rounded
          clearable
          multiple
          density="compact"
          hide-details
          placeholder="All Countries"
          :hide-no-data="false"
          :items="relevantCountries"
          item-title="$name"
          class="mx-4"
        />
        <AppPicker
          v-if="filteredGroups"
          v-model="groupIds"
          :label="store.label('Group')"
          variant="outlined"
          rounded
          clearable
          multiple
          density="compact"
          hide-details
          :placeholder="`All ${store.label('Group')}s`"
          :hide-no-data="false"
          :items="filteredGroups"
          item-title="$name"
          class="mt-4 mx-4"
        />
        <v-text-field
          v-if="searchable"
          v-model="searchQuery"
          type="search"
          :label="store.label('Participant')"
          variant="outlined"
          rounded
          clearable
          density="compact"
          hide-details
          placeholder="Search"
          class="mt-4 mx-4"
        />
      </v-sheet>
    </v-form>
  </v-menu>
</template>
