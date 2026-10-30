<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import DateField from '@/components/DateField.vue'
import type { Challenge, LabelKey } from '@/lib/firebase'

export type EditableChallenge = Pick<
  Challenge,
  'name' | 'description' | 'startAt' | 'endAt' | 'private' | 'labels'
>
type Field = 'description' | 'startAt' | 'endAt' | 'labels'

const value = defineModel<Partial<Challenge> | null | undefined>()
const emit = defineEmits<{
  add: [challenge: EditableChallenge]
  save: [challenge: EditableChallenge]
}>()
const store = useAppStore()

const challenge = ref<EditableChallenge>({ name: '' })
const showFields = ref<Partial<Record<Field, boolean>>>({})
const labelKeys: LabelKey[] = ['Group', 'Participant', 'Amount']

const isOpen = computed({
  get: () => Boolean(value.value),
  set(open) {
    if (!open) value.value = null
  },
})
const isNew = computed(() => Boolean(value.value && !value.value.id))
const isValid = computed(() => Boolean(challenge.value.name?.trim()))

watch(
  value,
  (to) => {
    // only the fields this form edits, so stats and ids are never written back
    const { name = '', description, startAt, endAt, private: isPrivate, labels } = to || {}
    challenge.value = { name, description, startAt, endAt, private: isPrivate, labels }
    showFields.value = {}
  },
  { immediate: true },
)

function hasValue(field: Field) {
  const fieldValue = value.value?.[field]
  if (fieldValue && typeof fieldValue === 'object') return Object.values(fieldValue).some(Boolean)
  return Boolean(fieldValue)
}
function showField(field: Field) {
  return showFields.value[field] ?? hasValue(field)
}
function setLabel(key: LabelKey, label: string | null) {
  challenge.value.labels = { ...challenge.value.labels, [key]: label || null }
}

function handleSubmit() {
  // Firestore rejects `undefined` values
  const data = Object.fromEntries(
    Object.entries(challenge.value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as EditableChallenge
  if (isNew.value) emit('add', data)
  else emit('save', data)
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="320">
    <v-card class="EditChallenge">
      <v-form autocomplete="off" @submit.prevent="handleSubmit()">
        <v-card-title class="d-flex align-center">
          <div class="flex-grow-1">{{ isNew ? 'Add' : 'Edit' }} {{ store.label('Challenge') }}</div>
          <v-btn icon variant="text" density="comfortable" class="mr-n2" @click="isOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="challenge.name"
            label="Name *"
            variant="outlined"
            rounded
            required
          />
          <v-textarea
            v-if="showField('description')"
            v-model="challenge.description"
            label="Description"
            variant="outlined"
            rounded
            auto-grow
          />
          <DateField v-if="showField('startAt')" v-model="challenge.startAt" label="Start Date" />
          <DateField v-if="showField('endAt')" v-model="challenge.endAt" label="End Date" />
          <div v-if="showField('labels')" class="mb-10">
            <v-list-subheader class="mb-1 pl-6">Label Overrides</v-list-subheader>
            <v-text-field
              v-for="key in labelKeys"
              :key="key"
              :model-value="challenge.labels?.[key] || null"
              :label="key"
              variant="outlined"
              rounded
              clearable
              density="compact"
              hide-details
              class="mb-2"
              @update:model-value="setLabel(key, $event)"
            />
          </div>
          <div class="d-flex align-center mb-4">
            <label for="challenge-private" class="mr-2">Private</label>
            <v-tooltip location="top" max-width="296">
              <template #activator="{ props: tooltipProps }">
                <v-icon size="small" v-bind="tooltipProps">mdi-help-circle-outline</v-icon>
              </template>
              <div>
                Private challenges must be 'unlocked' by each participant via an Access Link, so
                they are ideal when entries are limited to specific participants.
              </div>
            </v-tooltip>
            <v-icon class="ml-auto mr-2">mdi-shield-lock</v-icon>
            <v-switch
              id="challenge-private"
              v-model="challenge.private"
              :disabled="!isNew"
              inset
              color="primary"
              density="compact"
              hide-details
              class="flex-grow-0"
            />
          </div>

          <div class="d-flex flex-wrap ga-1">
            <v-chip
              v-if="!showField('startAt')"
              size="small"
              prepend-icon="mdi-plus"
              @click="showFields.startAt = true"
            >
              Start Date
            </v-chip>
            <v-chip
              v-if="!showField('endAt')"
              size="small"
              prepend-icon="mdi-plus"
              @click="showFields.endAt = true"
            >
              End Date
            </v-chip>
            <v-chip
              v-if="!showField('description')"
              size="small"
              prepend-icon="mdi-plus"
              @click="showFields.description = true"
            >
              Description
            </v-chip>
            <v-chip
              v-if="!showField('labels')"
              size="small"
              prepend-icon="mdi-cursor-text"
              @click="showFields.labels = true"
            >
              Labels
            </v-chip>
          </div>

          <div v-if="value?.createdAt" class="my-4">
            <div class="text-overline">Created</div>
            {{ value.createdAt.toDate().toLocaleString() }}
          </div>
          <div v-if="value?.updatedAt" class="my-4">
            <div class="text-overline">Updated</div>
            {{ value.updatedAt.toDate().toLocaleString() }}
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
            {{ isNew ? 'Add' : 'Save' }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>
