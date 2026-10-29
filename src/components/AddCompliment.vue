<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import compliments from '@/lib/compliments'
import { crisp } from '@/lib/utils'

const emit = defineEmits<{ message: [message: string | null] }>()
const store = useAppStore()

const isOpen = ref(false)
const newCompliment = ref<string | null>(null)
const isSubmitting = ref(false)

const sanitized = computed(() => (newCompliment.value || '').trim().toLowerCase().replace(/!$/, ''))
const rules = [
  () => Boolean(sanitized.value) || 'Required',
  () => !compliments.includes(sanitized.value) || 'Already added — try another one!',
]
const isValid = computed(() => rules.every((rule) => rule() === true))

let debounceTimeout: ReturnType<typeof setTimeout> | undefined
function toast(message: string, delay = 0) {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => emit('message', message), delay)
}

// preview the compliment as it would appear after someone's entry
watch(sanitized, (text) => {
  if (text) {
    emit('message', null)
    toast(text, 1000)
  }
})
watch(isOpen, (open) => {
  if (!open) newCompliment.value = null
})

async function handleAddCompliment() {
  try {
    isSubmitting.value = true
    const text = sanitized.value
    await store.addCompliment(text)
    newCompliment.value = null
    isOpen.value = false

    crisp('do', 'message:send', ['text', `Compliment Submitted: ${text}`])
    crisp('do', 'chat:hide')
  } finally {
    isSubmitting.value = false
    toast('submitted 🙇 thank you', 300)
  }
}
</script>

<template>
  <div class="AddCompliment">
    <v-btn
      icon
      variant="text"
      size="large"
      color="primary"
      aria-label="Spread the Love"
      @click="isOpen = true"
    >
      <v-icon>mdi-heart-outline</v-icon>
    </v-btn>

    <v-dialog v-model="isOpen" max-width="300">
      <v-card>
        <v-form @submit.prevent="handleAddCompliment()">
          <v-card-title class="d-flex align-center">
            <div class="flex-grow-1">
              Spread the Love
              <v-icon color="primary" class="ml-1 mt-n1">mdi-heart</v-icon>
            </div>
            <v-btn icon variant="text" density="comfortable" class="mr-n2" @click="isOpen = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <p>
              Want to help motivate others?<br />
              Add your own positivity to the mix!
            </p>

            <v-text-field
              v-model="newCompliment"
              label="Your Compliment"
              placeholder="e.g. well done"
              variant="outlined"
              rounded
              :rules="rules"
              autocomplete="off"
              class="mt-6"
            />
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
              :loading="isSubmitting"
            >
              Submit
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </div>
</template>
