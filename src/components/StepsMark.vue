<script setup lang="ts">
// the Challenge logo: soft white steps, centred on a violet tile
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
      stroke-width="80"
      stroke-linecap="round"
      stroke-linejoin="round"
      pathLength="1"
      d="M278 707 L388 707 Q408 707 408 687 L408 597 Q408 577 428 577 L518 577 Q538 577 538 557 L538 467 Q538 447 558 447 L648 447 Q668 447 668 427 L668 337 Q668 317 688 317 L746 317"
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
