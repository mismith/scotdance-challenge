<script setup lang="ts">
// ScotDance.app's mark: Scott, a Highland dancer mid leap. In currentColor, or as the
// app icon (white on its blue disc) with `badge`. Copied from scotdance's favicon.svg.
defineProps<{ badge?: boolean }>()
</script>

<template>
  <svg :viewBox="badge ? '0 0 1024 1024' : '0 52 512 432'" aria-hidden="true">
    <circle v-if="badge" cx="512" cy="512" r="512" fill="#0065bd" />
    <g
      :transform="badge ? 'translate(512 512) scale(1.6539) translate(-256 -300)' : undefined"
      :fill="badge ? '#fff' : 'currentColor'"
    >
      <g :stroke="badge ? '#fff' : 'currentColor'" stroke-width="88">
        <line x1="256" y1="300" x2="47.53" y2="162.02" />
        <line x1="256" y1="300" x2="464.47" y2="162.02" />
        <line x1="256" y1="300" x2="47.53" y2="437.98" />
        <line x1="256" y1="300" x2="464.47" y2="437.98" />
      </g>
      <circle cx="256" cy="300" r="48" />
      <circle cx="256" cy="129" r="68" />
    </g>
  </svg>
</template>
