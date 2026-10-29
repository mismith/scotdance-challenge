<script setup lang="ts">
// text field + date picker menu, storing dates as `yyyy-MM-dd` strings like the old app did
import { format, parse } from 'date-fns'
import { computed, ref } from 'vue'

defineProps<{ label: string }>()
const model = defineModel<string | null>()
const isPicking = ref(false)

const date = computed({
  get: () => (model.value ? parse(model.value, 'yyyy-MM-dd', new Date()) : null),
  set(value: Date | null) {
    model.value = value ? format(value, 'yyyy-MM-dd') : null
    isPicking.value = false
  },
})
</script>

<template>
  <v-menu v-model="isPicking" :close-on-content-click="false" min-width="290">
    <template #activator="{ props: activatorProps }">
      <v-text-field
        v-model="model"
        :label="label"
        variant="outlined"
        rounded
        clearable
        readonly
        append-inner-icon="mdi-calendar"
        v-bind="activatorProps"
      />
    </template>
    <v-date-picker v-model="date" hide-header />
  </v-menu>
</template>
