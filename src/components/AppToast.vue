<script setup lang="ts">
import { watch } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

let timeout: ReturnType<typeof setTimeout> | undefined
watch(
  () => store.toast,
  (message) => {
    clearTimeout(timeout)
    if (message) timeout = setTimeout(() => store.notify(null), 5000)
  },
)
</script>

<template>
  <!-- clear of the status bar and the soft blur iOS draws just below it -->
  <div
    role="status"
    aria-live="polite"
    class="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+2rem)] z-[70] flex justify-center px-4"
  >
    <Transition name="toast">
      <button
        v-if="store.toast"
        :key="store.toast"
        type="button"
        class="on-color pointer-events-auto max-w-sm rounded-[24px] bg-ink px-5 py-3 text-left text-[15px] font-bold text-white shadow-[var(--shadow-float)]"
        @click="store.notify(null)"
      >
        {{ store.toast }}
      </button>
    </Transition>
  </div>
</template>

<style>
.toast-enter-active {
  transition:
    opacity 0.2s ease-out,
    translate 0.5s var(--ease-spring),
    scale 0.5s var(--ease-spring);
}
.toast-leave-active {
  position: absolute;
  transition:
    opacity 0.2s ease-in,
    translate 0.2s ease-in,
    scale 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  translate: 0 -24px;
  scale: 0.8;
}
.toast-leave-to {
  opacity: 0;
  translate: 0 -12px;
  scale: 0.9;
}
</style>
