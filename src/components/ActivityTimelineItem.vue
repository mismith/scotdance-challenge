<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { type Entry, findById } from '@/lib/firebase'

const props = defineProps<{ entry: Entry }>()
defineEmits<{ delete: [entry: Entry]; flag: [entry: Entry] }>()
const store = useAppStore()

const challenge = computed(() => findById(store.challenges, props.entry.challengeId))
const group = computed(() => findById(store.groups, props.entry.groupId))
const participant = computed(() => findById(store.participants, props.entry.participantId))
const isMine = computed(() => Boolean(store.me && store.me.uid === props.entry.createdBy))
</script>

<template>
  <v-timeline-item :id="`entry-${entry.id}`" size="small" :dot-color="group?.color" fill-dot>
    <v-card class="ActivityTimelineItem" elevation="2">
      <v-card-title class="d-flex align-center">
        <span class="flex-grow-1" style="font-size: larger"
          >+{{ entry.value.toLocaleString() }}</span
        >

        <template v-if="challenge">
          <small v-if="!store.challengeId && store.challenges.length > 1" class="text-overline">
            {{ challenge.name }}
          </small>
        </template>
        <v-skeleton-loader v-else type="text" width="48" class="inline-skeleton" />

        <v-btn
          v-if="isMine"
          icon
          variant="text"
          size="small"
          class="ml-2"
          aria-label="Delete"
          @click="$emit('delete', entry)"
        >
          <v-icon size="small">mdi-delete-outline</v-icon>
        </v-btn>
        <v-btn
          v-else
          icon
          variant="text"
          size="small"
          class="ml-2"
          aria-label="Flag"
          @click="$emit('flag', entry)"
        >
          <v-icon size="small">mdi-flag-outline</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        by
        <strong v-if="participant">{{ participant.name }}</strong>
        <v-skeleton-loader v-else type="text" width="48" class="inline-skeleton" />
        of
        <strong v-if="group">{{ group.$name }}</strong>
        <v-skeleton-loader v-else type="text" width="48" class="inline-skeleton" />
        at
        <strong v-if="entry.createdAt">{{ entry.createdAt.toDate().toLocaleString() }}</strong>
        <v-skeleton-loader v-else type="text" width="48" class="inline-skeleton" />
      </v-card-text>
    </v-card>
  </v-timeline-item>
</template>

<style>
.ActivityTimelineItem .inline-skeleton {
  display: inline-flex;
  vertical-align: middle;
  margin-bottom: -6px;
  background: transparent;
}
</style>
