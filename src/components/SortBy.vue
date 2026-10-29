<script setup lang="ts">
export interface SortOption {
  id: string
  name: string
  keys: string[]
  dirs?: ('asc' | 'desc')[]
}

defineProps<{ items: SortOption[] }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <v-menu min-width="128">
    <template #activator="{ props: activatorProps }">
      <v-btn icon variant="text" aria-label="Sort by" v-bind="activatorProps">
        <v-icon>mdi-sort-variant</v-icon>
      </v-btn>
    </template>

    <v-list>
      <v-list-subheader>Sort by</v-list-subheader>
      <v-list-item
        v-for="by in items"
        :key="by.id"
        :active="model === by.id"
        color="primary"
        @click="model = by.id"
      >
        {{ by.name }}
      </v-list-item>
    </v-list>
  </v-menu>
</template>
