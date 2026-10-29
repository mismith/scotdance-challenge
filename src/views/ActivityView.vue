<script setup lang="ts">
import { useElementVisibility } from '@vueuse/core'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useAppStore } from '@/stores/app'
import ActivityTimelineItem from '@/components/ActivityTimelineItem.vue'
import AnimatedNumber from '@/components/AnimatedNumber.vue'
import ChallengeProgress from '@/components/ChallengeProgress.vue'
import type { Entry } from '@/lib/firebase'
import { crisp } from '@/lib/utils'

const INCREMENT = 20

const store = useAppStore()
const { smAndDown } = useDisplay()

const limit = ref(0)
const isLoadingMore = ref(false)
const flaggedEntry = ref<Entry | null>(null)
const deletedEntry = ref<Entry | null>(null)
const editedEntry = ref<Entry | null>(null)
const editedValue = ref<string | number | null>(null)

const isShowingAllEntries = computed(() => store.entries.length < limit.value)

const isFlagging = computed({
  get: () => Boolean(flaggedEntry.value),
  set: (on) => !on && (flaggedEntry.value = null),
})
const isEditing = computed({
  get: () => Boolean(editedEntry.value),
  set: (on) => !on && (editedEntry.value = null),
})
const isEditedValueValid = computed(
  () => Number(editedValue.value) > 0 && Number(editedValue.value) <= 9999,
)
const isDeleting = computed({
  get: () => Boolean(deletedEntry.value),
  set: (on) => !on && (deletedEntry.value = null),
})

async function loadMore() {
  if (isShowingAllEntries.value || isLoadingMore.value) return

  isLoadingMore.value = true
  limit.value += INCREMENT
  await store.bindEntries(store.challengeId || undefined, limit.value)
  isLoadingMore.value = false
}

watch(
  () => store.challengeId,
  () => {
    limit.value = 0
    loadMore()
  },
  { immediate: true },
)

// infinite scroll: keep loading while the "more" button is (nearly) on screen
const moreButton = useTemplateRef<{ $el: HTMLElement }>('moreButton')
const isMoreButtonVisible = useElementVisibility(() => moreButton.value?.$el, {
  rootMargin: '0px 0px 100px 0px',
})
watch([isMoreButtonVisible, isLoadingMore], ([visible, loading]) => {
  if (visible && !loading) loadMore()
})

function openLiveChat() {
  if (flaggedEntry.value) {
    crisp('do', 'message:send', ['text', `Flagged Entry ID: ${flaggedEntry.value.id}`])
  }
  crisp('do', 'chat:open')
  flaggedEntry.value = null
}
function startEditing(entry: Entry) {
  editedEntry.value = entry
  editedValue.value = entry.value
}
async function saveEntry() {
  if (!editedEntry.value || !isEditedValueValid.value) return
  await store.updateEntry(editedEntry.value.id, Number(editedValue.value))
  editedEntry.value = null
}
async function deleteEntry() {
  if (deletedEntry.value) await store.deleteEntry(deletedEntry.value.id)
  deletedEntry.value = null
}
</script>

<template>
  <div class="ActivityView flex-page">
    <div v-if="!store.entries.length" class="d-flex flex-column align-center ma-auto">
      <v-icon size="x-large">mdi-cancel</v-icon>
      No entries yet
      <div class="mt-2"><router-link :to="{ name: 'new' }">Add one</router-link></div>
    </div>
    <template v-else>
      <ChallengeProgress v-if="store.currentChallenge" :challenge="store.currentChallenge" />
      <div
        v-if="store.currentChallenge"
        class="d-flex align-center my-4 mr-auto text-primary"
        :style="{
          flexDirection: smAndDown ? 'row' : 'column',
          marginLeft: smAndDown ? '16px' : 'auto',
        }"
      >
        <span class="text-h4">
          <AnimatedNumber :value="store.currentChallenge.$total ?? 0" />
        </span>
        <small class="ma-2">total</small>
      </div>
      <v-timeline
        :side="smAndDown ? 'end' : undefined"
        :density="smAndDown ? 'compact' : undefined"
        truncate-line="both"
        class="ActivityView__timeline px-6"
      >
        <ActivityTimelineItem
          v-for="entry in store.entries"
          :key="entry.id"
          :entry="entry"
          @edit="startEditing(entry)"
          @flag="flaggedEntry = entry"
          @delete="deletedEntry = entry"
        />
      </v-timeline>
    </template>
    <v-btn
      v-if="!isShowingAllEntries || isLoadingMore"
      ref="moreButton"
      icon
      size="small"
      color="primary"
      aria-label="More"
      :loading="isLoadingMore"
      class="mr-auto mb-10"
      :style="{ marginLeft: smAndDown ? '28px' : 'auto' }"
      @click="loadMore()"
    >
      <v-icon>mdi-dots-vertical</v-icon>
    </v-btn>

    <v-dialog v-model="isFlagging" max-width="320">
      <v-card>
        <v-card-title class="d-flex align-center">
          Flag An Issue <v-icon color="primary" class="ml-2">mdi-flag</v-icon>
          <v-spacer />
          <v-btn
            icon
            variant="text"
            density="comfortable"
            class="mr-n2"
            @click="isFlagging = false"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pb-2">
          <p class="mb-4">Did you make a mistake, or does something seem off?</p>
          <p>Help sort things out with a super quick explanation of what you think is wrong.</p>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn
            rounded
            block
            size="x-large"
            variant="flat"
            color="primary"
            @click="openLiveChat()"
          >
            Flag
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="isEditing" max-width="320">
      <v-card>
        <v-form autocomplete="off" @submit.prevent="saveEntry()">
          <v-card-title class="d-flex align-center">
            Edit Item <v-icon color="primary" class="ml-2">mdi-pencil</v-icon>
            <v-spacer />
            <v-btn
              icon
              variant="text"
              density="comfortable"
              class="mr-n2"
              @click="isEditing = false"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text class="pb-0">
            <v-text-field
              v-model="editedValue"
              :label="store.label('Amount')"
              type="number"
              step="1"
              min="1"
              max="9999"
              variant="outlined"
              rounded
              autofocus
              :error="!isEditedValueValid"
            />
          </v-card-text>
          <v-card-actions class="pa-4 pt-0">
            <v-btn
              type="submit"
              rounded
              block
              size="x-large"
              variant="flat"
              color="primary"
              :disabled="!isEditedValueValid"
            >
              Save
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
    <v-dialog v-model="isDeleting" max-width="320">
      <v-card>
        <v-card-title class="d-flex align-center">
          Delete Item <v-icon color="primary" class="ml-2">mdi-delete</v-icon>
          <v-spacer />
          <v-btn
            icon
            variant="text"
            density="comfortable"
            class="mr-n2"
            @click="isDeleting = false"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pb-2">
          <p class="mb-4">Did you make a mistake, or does something seem off?</p>
          <p>You can remove this item—then submit a new one, if necessary.</p>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn rounded block size="x-large" variant="flat" color="primary" @click="deleteEntry()">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style>
.ActivityView__timeline.v-timeline {
  height: auto;
}
</style>
