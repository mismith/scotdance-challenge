<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import AppPicker from '@/components/AppPicker.vue'
import { availableCountries, fetchCountryCode } from '@/lib/country'
import type { Group } from '@/lib/firebase'

export type NewGroup = Pick<Group, 'challengeId' | 'name' | 'color' | 'country'>

const value = defineModel<NewGroup | null | undefined>()
const emit = defineEmits<{ add: [group: NewGroup] }>()
const store = useAppStore()

const group = ref<Partial<NewGroup>>({})
const isPickingColor = ref(false)
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

watch(
  value,
  (to) => {
    group.value = { ...to }
    isPickingColor.value = false
    isShowingCountry.value = false
  },
  { immediate: true },
)

async function showCountry() {
  isShowingCountry.value = true
  if (group.value.country === undefined) {
    group.value.country = null
    const country = await fetchCountryCode().catch(() => null)
    if (!group.value.country && country) group.value.country = country
  }
}

function handleSubmit() {
  // Firestore rejects `undefined` values
  const { country, ...rest } = group.value
  emit('add', (country === undefined ? rest : { ...rest, country }) as NewGroup)
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="320">
    <v-card class="EditGroup">
      <v-form autocomplete="off" @submit.prevent="handleSubmit()">
        <v-card-title class="d-flex align-center">
          <div class="flex-grow-1">Add {{ store.label('Group') }}</div>
          <v-btn icon variant="text" density="comfortable" class="mr-n2" @click="isOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="group.name" label="Name *" variant="outlined" rounded required />
          <v-text-field
            v-model="group.color"
            label="Color"
            variant="outlined"
            rounded
            @click="isPickingColor = true"
          >
            <template #append-inner>
              <v-menu
                v-model="isPickingColor"
                :close-on-content-click="false"
                location="bottom end"
              >
                <template #activator="{ props: activatorProps }">
                  <v-avatar size="32" :color="group.color" v-bind="activatorProps" />
                </template>
                <v-card>
                  <v-color-picker
                    :model-value="group.color"
                    mode="hex"
                    :modes="['hex']"
                    hide-inputs
                    flat
                    :canvas-height="100"
                    @update:model-value="group.color = $event"
                  />
                  <v-card-actions class="justify-end">
                    <v-btn variant="text" @click="isPickingColor = false">Done</v-btn>
                  </v-card-actions>
                </v-card>
              </v-menu>
            </template>
          </v-text-field>
          <AppPicker
            v-if="isShowingCountry"
            v-model="group.country"
            :label="store.label('Country')"
            variant="outlined"
            rounded
            :menu-props="{ maxWidth: 288 }"
            :hide-no-data="false"
            :items="availableCountries"
            item-title="$name"
          />

          <div class="d-flex flex-wrap ga-1">
            <v-chip
              v-if="!isShowingCountry"
              size="small"
              prepend-icon="mdi-plus"
              @click="showCountry()"
            >
              Country
            </v-chip>
          </div>
        </v-card-text>
        <v-card-actions class="pt-0 pa-4">
          <v-btn
            type="submit"
            rounded
            block
            size="x-large"
            variant="flat"
            color="primary"
            :disabled="!isValid"
          >
            Add
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>
