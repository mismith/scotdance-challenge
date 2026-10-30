<script setup lang="ts">
import { bandPath } from '@/lib/waves'

// a little ribbon that has flopped over: the same smooth bands as the ribbons, sloping down
const bands = ['#6A3CFF', '#FF5FA8', '#3DA9FF'].map((color, i) => ({
  color,
  d: bandPath({
    x0: 24,
    x1: 296,
    base: 52 + i * 16,
    rise: -44,
    amp: 7,
    wl: 120,
    phase: 0.6,
    step: 15,
    thick: 11,
  }),
}))
</script>

<template>
  <main
    class="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 pb-[env(safe-area-inset-bottom)] text-center"
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 320 150"
      class="NotFound-wave block w-full max-w-[300px] overflow-visible"
    >
      <path
        v-for="(band, i) in bands"
        :key="band.color"
        :d="band.d"
        :fill="band.color"
        :style="{ '--i': i }"
      />
      <ellipse cx="170" cy="144" rx="120" ry="5" fill="#15131A" opacity=".08" />
    </svg>
    <h1 class="hd anim-rise text-[40px] text-balance" style="--delay: 250ms">
      this page wandered off
    </h1>
    <p class="anim-rise text-base font-semibold text-muted" style="--delay: 320ms">
      Let's dance back to the challenges and keep counting!
    </p>
    <router-link
      :to="{ name: 'home' }"
      class="btn btn-primary anim-pop mt-1"
      style="--delay: 420ms"
    >
      back to challenges
    </router-link>
  </main>
</template>

<style>
/* the wave unfurls, then flops down and settles with a little bounce */
.NotFound-wave {
  transform-origin: 20% 30%;
  animation: notfound-flop 1.1s var(--ease-spring) both;
}
.NotFound-wave path {
  animation: unfurl 0.8s var(--ease-out) both;
  animation-delay: calc(var(--i, 0) * 90ms);
}
@keyframes notfound-flop {
  0% {
    rotate: -18deg;
    translate: 0 -16px;
  }
  45% {
    rotate: 4deg;
    translate: 0 4px;
  }
  70% {
    rotate: -2deg;
  }
}
</style>
