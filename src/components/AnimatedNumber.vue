<script setup lang="ts">
import { TransitionPresets, useTransition } from '@vueuse/core'
import { ref, watch } from 'vue'

const props = defineProps<{ value: number; duration?: number }>()

// start from zero so the total counts up on arrival, like it always has
const target = ref(0)
const output = useTransition(target, {
  duration: props.duration ?? 2000,
  transition: TransitionPresets.easeOutQuad,
})
watch(
  () => props.value,
  (value) => (target.value = value || 0),
  { immediate: true },
)
</script>

<template>
  <span>{{ Math.round(output).toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</span>
</template>
