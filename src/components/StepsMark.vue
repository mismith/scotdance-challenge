<script setup lang="ts">
// the Challenge logo: a white ribbon climbing three smooth steps, edge to edge across a violet
// tile (the climb every new challenge's ribbons start with)
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
    <clipPath id="steps-mark-tile">
      <rect width="1024" height="1024" rx="230" />
    </clipPath>
    <rect width="1024" height="1024" rx="230" fill="#6A3CFF" />
    <path
      clip-path="url(#steps-mark-tile)"
      fill="none"
      stroke="#fff"
      stroke-width="160"
      pathLength="1"
      d="M-128 768H104C200.8 768 183.2 597.3 280 597.3H424C520.8 597.3 503.2 426.7 600 426.7H744C840.8 426.7 823.2 256 920 256H1152"
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
