<script setup lang="ts">
// the Challenge logo: three even, round-shouldered steps in white, centred on a violet tile
// (same geometry as assets/Challenge.icon/Assets/steps.svg and public/icon.svg)
withDefaults(
  defineProps<{
    size?: number
    /** draw the steps in when shown */
    draw?: boolean
  }>(),
  { size: 42, draw: false },
)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 1024 1024"
    aria-hidden="true"
    class="StepsMark shrink-0"
    :class="{ 'StepsMark-draw': draw }"
  >
    <rect width="1024" height="1024" rx="230" fill="#6A3CFF" />
    <path
      fill="none"
      stroke="#fff"
      stroke-width="72"
      stroke-linecap="round"
      stroke-linejoin="miter"
      pathLength="1"
      d="M232 792 V717.3 A112 112 0 0 1 344 605.3 H418.7 V530.7 A112 112 0 0 1 530.7 418.7 H605.3 V344 A112 112 0 0 1 717.3 232 H792"
    />
  </svg>
</template>

<style>
.StepsMark-draw path {
  stroke-dasharray: 1;
  animation: steps-draw 0.9s var(--ease-out) 0.15s both;
}
@keyframes steps-draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}
</style>
