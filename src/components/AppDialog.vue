<script setup lang="ts">
// a bottom sheet that rises on phones, a centred card on bigger screens
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { ref } from 'vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    /** 'ink' for the dark sheet (e.g. sharing) */
    tone?: 'paper' | 'ink'
  }>(),
  { description: undefined, tone: 'paper' },
)
const open = defineModel<boolean>({ required: true })

// start in the first field to type in, rather than on the close button
function focusFirstField(event: Event) {
  const field = (event.target as HTMLElement | null)?.querySelector<HTMLElement>(
    'input:not([type=radio]):not([type=color]):not([readonly]), textarea',
  )
  if (!field) return
  event.preventDefault()
  field.focus()
}

// drag the top of the sheet down to close it, as on iOS: far enough or fast enough closes it,
// otherwise it springs back. Only for the bottom sheet (phones), not the centred card
const dragY = ref(0)
const isDragging = ref(false)
let drag: { y: number; time: number; id: number } | null = null
function handlePointerDown(event: PointerEvent) {
  if (!event.isPrimary || !window.matchMedia('(width < 40rem)').matches) return
  drag = { y: event.clientY, time: event.timeStamp, id: event.pointerId }
}
function handlePointerMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  const dy = event.clientY - drag.y
  if (!isDragging.value) {
    if (Math.abs(dy) < 6) return // still a tap (e.g. on the close button)
    isDragging.value = true
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
  }
  dragY.value = dy > 0 ? dy : dy / 5 // a little give upwards, then it resists
}
function handlePointerUp(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  const speed = dragY.value / Math.max(1, event.timeStamp - drag.time)
  const shouldClose = isDragging.value && (dragY.value > 120 || (speed > 0.5 && dragY.value > 30))
  drag = null
  isDragging.value = false
  if (shouldClose) open.value = false
  else dragY.value = 0
}
// a fresh sheet starts in place
function handleClosed() {
  dragY.value = 0
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="sheet-overlay fixed inset-0 z-50 bg-ink/50" />
      <DialogContent
        v-bind="description ? {} : { 'aria-describedby': undefined }"
        class="sheet fixed inset-x-0 bottom-[var(--visible-bottom,0px)] z-50 flex max-h-[calc(var(--visible-height,100dvh)*0.92)] flex-col gap-2 overflow-y-auto overscroll-contain rounded-t-[32px] px-[18px] pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_-20px_rgb(21_19_26/0.5)] sm:inset-0 sm:m-auto sm:h-fit sm:w-[440px] sm:rounded-[32px] sm:pt-5"
        :class="[
          tone === 'ink' ? 'on-color bg-ink text-white' : 'bg-paper text-ink',
          { 'is-dragging': isDragging },
        ]"
        :style="dragY ? { transform: `translateY(${dragY}px)` } : undefined"
        @open-auto-focus="focusFirstField"
        @close-auto-focus="handleClosed"
      >
        <!-- the handle and title are where the sheet can be dragged down from -->
        <div
          class="sheet-grip -mx-[18px] -mt-2.5 flex flex-col px-[18px] pt-2.5"
          @pointerdown="handlePointerDown"
          @pointermove="handlePointerMove"
          @pointerup="handlePointerUp"
          @pointercancel="handlePointerUp"
        >
          <div
            class="h-[5px] w-[42px] shrink-0 self-center rounded-full sm:hidden"
            :class="tone === 'ink' ? 'bg-white/20' : 'bg-handle'"
            aria-hidden="true"
          />
          <div class="mt-1.5 flex items-center gap-2 sm:mt-0">
            <slot name="title-icon" />
            <DialogTitle class="hd min-w-0 flex-1 text-[32px]">
              {{ title }}
            </DialogTitle>
            <DialogClose class="btn btn-icon btn-ghost -mr-2.5" aria-label="Close">
              <X :size="24" :stroke-width="2.6" />
            </DialogClose>
          </div>
        </div>
        <DialogDescription
          v-if="description"
          class="mb-1.5 text-[15px] font-semibold"
          :class="tone === 'ink' ? 'text-[#C9C3D3]' : 'text-muted'"
        >
          {{ description }}
        </DialogDescription>
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
/* springs back after a short drag; follows the finger exactly while dragging */
.sheet {
  transition: transform 0.4s var(--ease-spring);
}
.sheet.is-dragging {
  transition: none;
}
@media (width < 40rem) {
  .sheet-grip {
    touch-action: none;
  }
}
</style>
