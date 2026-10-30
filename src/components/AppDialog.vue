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
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="sheet-overlay fixed inset-0 z-50 bg-ink/50" />
      <DialogContent
        v-bind="description ? {} : { 'aria-describedby': undefined }"
        class="sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col gap-2 overflow-y-auto overscroll-contain rounded-t-[32px] px-[18px] pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_-20px_rgb(21_19_26/0.5)] sm:inset-0 sm:m-auto sm:h-fit sm:w-[440px] sm:rounded-[32px] sm:pt-5"
        :class="tone === 'ink' ? 'on-color bg-ink text-white' : 'bg-paper text-ink'"
        @open-auto-focus="focusFirstField"
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
