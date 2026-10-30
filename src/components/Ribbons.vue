<script setup lang="ts">
// smooth rising ribbons in a challenge's own colours (geometry in src/lib/waves.ts)
import { useDocumentVisibility, useElementVisibility } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { prefersReducedMotion } from '@/lib/motion'
import {
  type RibbonLayout,
  type RibbonVariant,
  fallbackRibbonColors,
  ribbonDriftVector,
  ribbonLayouts,
  ribbonPaths,
  visibleRibbonColors,
} from '@/lib/waves'

defineOptions({ name: 'ChallengeRibbons' })

const props = withDefaults(
  defineProps<{
    /** band colours, top band first; falls back to the default palette when empty */
    colors?: (string | null | undefined)[]
    variant?: RibbonVariant
    /** what the ribbons sit on; colours too close to it are lightened so every band shows */
    background?: string
    /** unfurl left to right when shown */
    reveal?: boolean
    /** a slow, gentle sway */
    drift?: boolean
    /** a lively wiggle, e.g. for an easter egg */
    dance?: boolean
  }>(),
  {
    colors: () => [],
    variant: 'card',
    background: '#6A3CFF',
    reveal: false,
    drift: false,
    dance: false,
  },
)

const bandColors = computed(() => {
  const colors = props.colors.filter((color): color is string => Boolean(color))
  return visibleRibbonColors(colors.length ? colors : fallbackRibbonColors, props.background)
})
const layout = computed<RibbonLayout>(() => ribbonLayouts[props.variant])

// the sway is a CSS loop sliding the bands by exactly one wavelength along their rise, where
// they land back on themselves: no per-frame path rebuilds, and it pauses while out of sight
const svg = useTemplateRef<SVGSVGElement>('svg')
const isOnScreen = useElementVisibility(svg)
const documentVisibility = useDocumentVisibility()
const driftStyle = computed(() => {
  if (!props.drift) return undefined
  const { x, y } = ribbonDriftVector(props.variant)
  return {
    '--drift-x': `${x}px`,
    '--drift-y': `${y}px`,
    animationPlayState:
      isOnScreen.value && documentVisibility.value === 'visible' ? 'running' : 'paused',
  }
})

// the dance: phase moves along and amplitude grows, for a few seconds at a time
const phaseShift = ref(0)
const ampScale = ref(1)
const stagger = ref(0)
const paths = computed(() =>
  ribbonPaths(props.variant, bandColors.value.length, {
    phaseShift: phaseShift.value,
    ampScale: ampScale.value,
    stagger: stagger.value,
    extend: props.drift,
  }),
)

let frame = 0
let last = 0
function tick(now: number) {
  const dt = last ? Math.min(64, now - last) / 1000 : 0
  last = now
  const dancing = props.dance
  // ease amplitude and per-band offset towards their targets
  const targetAmp = dancing ? 2.6 : 1
  const targetStagger = dancing ? 0.9 : 0
  ampScale.value += (targetAmp - ampScale.value) * Math.min(1, dt * 4)
  stagger.value += (targetStagger - stagger.value) * Math.min(1, dt * 4)
  if (dancing) phaseShift.value -= dt * 5
  const settled = !dancing && Math.abs(ampScale.value - 1) < 0.01 && stagger.value < 0.01
  if (settled) {
    ampScale.value = 1
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
  ampScale.value = 1
  stagger.value = 0
})
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <svg
    ref="svg"
    aria-hidden="true"
    :viewBox="layout.viewBox"
    :preserveAspectRatio="layout.aspect === 'none' ? 'none' : 'xMidYMid slice'"
    class="Ribbons pointer-events-none block size-full"
    :class="{ 'Ribbons-reveal': reveal }"
  >
    <g :class="{ 'Ribbons-drift': drift }" :style="driftStyle">
      <path v-for="(d, i) in paths" :key="i" :d="d" :fill="bandColors[i]" :style="{ '--i': i }" />
    </g>
  </svg>
</template>

<style>
.Ribbons-reveal path {
  animation: unfurl 0.9s var(--ease-out) both;
  animation-delay: calc(var(--i, 0) * 90ms + 80ms);
}
.Ribbons-drift {
  animation: ribbons-drift 18s linear infinite;
}
@keyframes ribbons-drift {
  to {
    transform: translate(var(--drift-x), var(--drift-y));
  }
}
</style>
