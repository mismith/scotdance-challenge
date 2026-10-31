<script setup lang="ts">
// counts up (or down) to a number; jumps straight there when motion is reduced
import { TransitionPresets, useTransition } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { prefersReducedMotion } from '@/lib/motion'

const props = withDefaults(
  defineProps<{
    value: number
    /** ms */
    duration?: number
    /** where to count from on arrival; zero, like it always has */
    from?: number
  }>(),
  { duration: 1600, from: 0 },
)

const target = ref(prefersReducedMotion.value ? props.value || 0 : props.from)
const output = useTransition(target, {
  duration: computed(() => (prefersReducedMotion.value ? 0 : props.duration)),
  transition: TransitionPresets.easeOutCubic,
})
watch(
  () => props.value,
  (value) => (target.value = value || 0),
  { immediate: true },
)
const shown = computed(() => (prefersReducedMotion.value ? target.value : output.value))
</script>

<template>
  <span class="num">{{
    Math.round(shown).toLocaleString(undefined, { maximumFractionDigits: 0 })
  }}</span>
</template>
