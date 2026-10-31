<script setup lang="ts">
import { Share, SquarePlus, TextAlignStart } from 'lucide-vue-next'
import AppDialog from '@/components/AppDialog.vue'
import { isInstallCardHidden, isInstallSheetOpen } from '@/lib/install'
import { stagger } from '@/lib/motion'

// Safari's steps on iOS 27, with its icons: the page menu sits at the left of the address bar
const steps = [
  {
    color: 'bg-lime',
    icon: TextAlignStart,
    name: 'Page Menu',
    text: '',
    note: 'at the left of the address bar',
  },
  { color: 'bg-pink-soft', icon: Share, name: '', text: 'Share', note: '' },
  {
    color: 'bg-butter',
    icon: SquarePlus,
    name: '',
    text: 'Add to Home Screen',
    note: "scroll down if it's hidden",
  },
]

// once they've seen how, Explore's card has done its job
function close() {
  isInstallSheetOpen.value = false
  isInstallCardHidden.value = true
}
</script>

<template>
  <AppDialog
    v-model="isInstallSheetOpen"
    title="add to home screen"
    description="Open challenge in one tap, just like an app."
  >
    <ol class="flex flex-col gap-2.5">
      <li
        v-for="(step, index) in steps"
        :key="index"
        class="card anim-rise flex items-center gap-3.5 p-3.5 text-base leading-snug font-bold"
        :style="stagger(index)"
      >
        <span
          class="hd flex size-[34px] shrink-0 items-center justify-center rounded-full text-[18px] text-ink"
          :class="step.color"
          aria-hidden="true"
        >
          {{ index + 1 }}
        </span>
        <span>
          Tap
          <component
            :is="step.icon"
            :size="22"
            :stroke-width="2.6"
            class="inline-block align-[-5px] text-violet"
            v-bind="step.name ? { 'aria-label': step.name } : { 'aria-hidden': 'true' }"
          />
          {{ step.text }}
          <span v-if="step.note" class="block text-sm font-semibold text-hint">
            {{ step.note }}
          </span>
        </span>
      </li>
    </ol>

    <button type="button" class="btn btn-dark w-full" @click="close()">got it!</button>
  </AppDialog>
</template>
