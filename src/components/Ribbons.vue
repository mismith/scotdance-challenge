<script setup lang="ts">
// a challenge's climb as ribbons in its own colours (geometry in src/lib/waves.ts)
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { prefersReducedMotion } from '@/lib/motion'
import {
  type RibbonLayout,
  type RibbonVariant,
  fallbackRibbonColors,
  ribbonLayouts,
  ribbonPaths,
  visibleRibbonColors,
} from '@/lib/waves'

defineOptions({ name: 'ChallengeRibbons' })

const props = withDefaults(
  defineProps<{
    /** each day's total, oldest first (`dailyTotals`); too few draw the logo's three steps */
    days?: number[]
    /** band colours, top band first; topped up from the default palette */
    colors?: (string | null | undefined)[]
    variant?: RibbonVariant
    /** what the ribbons sit on; colours too close to it are lightened so every band shows */
    background?: string
    /** unfurl left to right when shown */
    reveal?: boolean
    /** a lively wiggle, e.g. for an easter egg */
    dance?: boolean
  }>(),
  {
    days: () => [],
    colors: () => [],
    variant: 'card',
    background: '#6A3CFF',
    reveal: false,
    dance: false,
  },
)

// always a full ribbon, however few groups: their colours first, then the palette's
const MIN_BANDS = 4
const bandColors = computed(() => {
  const colors = props.colors.filter((color): color is string => Boolean(color))
  const visible = visibleRibbonColors([...colors, ...fallbackRibbonColors], props.background)
  return visible.slice(0, Math.max(colors.length, MIN_BANDS))
})
const layout = computed<RibbonLayout>(() => ribbonLayouts[props.variant])

// the dance: a wiggle grows along the climb and moves along it, for a few seconds at a time
const wobble = ref(0)
const phaseShift = ref(0)
const stagger = ref(0)
const paths = computed(() =>
  ribbonPaths(props.variant, bandColors.value.length, props.days, {
    wobble: wobble.value,
    phaseShift: phaseShift.value,
    stagger: stagger.value,
  }),
)

let frame = 0
let last = 0
function tick(now: number) {
  const dt = last ? Math.min(64, now - last) / 1000 : 0
  last = now
  const dancing = props.dance
  // ease the wiggle and per-band offset towards their targets
  wobble.value += ((dancing ? 1 : 0) - wobble.value) * Math.min(1, dt * 4)
  stagger.value += ((dancing ? 0.9 : 0) - stagger.value) * Math.min(1, dt * 4)
  if (dancing) phaseShift.value -= dt * 5
  if (!dancing && wobble.value < 0.01 && stagger.value < 0.01) {
    wobble.value = 0
    stagger.value = 0
    frame = 0
    last = 0
    return
  }
  frame = requestAnimationFrame(tick)
}
watch(
  () => props.dance && !prefersReducedMotion.value,
  (moving) => {
    if (moving && !frame) frame = requestAnimationFrame(tick)
  },
  { immediate: true },
)
watch(prefersReducedMotion, (reduced) => {
  if (!reduced) return
  cancelAnimationFrame(frame)
  frame = 0
  last = 0
  wobble.value = 0
  stagger.value = 0
})
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <svg
    aria-hidden="true"
    :viewBox="layout.viewBox"
    :preserveAspectRatio="layout.aspect === 'none' ? 'none' : 'xMidYMid slice'"
    class="Ribbons pointer-events-none block size-full"
    :class="{ 'Ribbons-reveal': reveal }"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" :fill="bandColors[i]" :style="{ '--i': i }" />
  </svg>
</template>

<style>
.Ribbons-reveal path {
  animation: unfurl 0.9s var(--ease-out) both;
  animation-delay: calc(var(--i, 0) * 90ms + 80ms);
}
</style>
