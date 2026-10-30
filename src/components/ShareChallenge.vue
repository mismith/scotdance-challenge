<script setup lang="ts">
// the dark share sheet: a QR code to print, the link to copy, and the phone's own share menu
import { useClipboard } from '@vueuse/core'
import { Check, Lock, Megaphone, Share } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import AppDialog from '@/components/AppDialog.vue'
import QrCode from '@/components/QrCode.vue'
import type { Challenge } from '@/lib/firebase'

const props = defineProps<{ challenge: Challenge }>()
const isOpen = defineModel<boolean>({ required: true })
const store = useAppStore()
const router = useRouter()
const { copy, copied, isSupported: canCopy } = useClipboard({ legacy: true })
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

const url = computed(() => {
  const { href } = router.resolve({
    name: props.challenge.private ? 'private' : 'public',
    params: { challengeId: props.challenge.id },
  })
  return `${window.location.origin}${href}`
})
const challengeLabel = computed(() => store.label('Challenge').toLowerCase())

async function share() {
  if (!canShare) return copy(url.value)
  try {
    await navigator.share({
      title: props.challenge.name,
      text: `Come dance with us in ${props.challenge.name}!`,
      url: url.value,
    })
  } catch (error) {
    // closing the share menu is fine; anything else, copy the link instead
    if ((error as Error | null)?.name !== 'AbortError') copy(url.value)
  }
}
</script>

<template>
  <AppDialog
    v-model="isOpen"
    tone="ink"
    :title="challenge.private ? 'just your people' : 'share the fun'"
  >
    <template #title-icon>
      <Lock
        v-if="challenge.private"
        :size="24"
        :stroke-width="2.6"
        class="shrink-0 text-lime"
        aria-hidden="true"
      />
      <Megaphone
        v-else
        :size="24"
        :stroke-width="2.6"
        class="shrink-0 text-lime"
        aria-hidden="true"
      />
    </template>

    <div class="mt-1.5 flex items-center gap-3.5">
      <div class="qr anim-pop shrink-0 rounded-2xl bg-white p-2.5 text-ink">
        <QrCode :value="url" label="QR code for the link" class="size-[100px]" />
      </div>
      <p class="anim-fade text-sm leading-snug font-semibold text-[#C9C3D3]" style="--delay: 120ms">
        <template v-if="challenge.private">
          it's a private {{ challengeLabel }}: anyone with this link or code can join. print the
          code for the studio wall, or send the link to your group.
        </template>
        <template v-else>
          anyone can join! this link or code takes them straight to your {{ challengeLabel }}. print
          the code for the studio wall, or send the link to your friends.
        </template>
      </p>
    </div>

    <div
      class="mt-2 flex h-[52px] items-center gap-2 rounded-full bg-ink-soft pr-1.5 pl-4 transition-shadow has-[input:focus-visible]:shadow-[inset_0_0_0_3px_var(--color-violet)]"
    >
      <input
        class="h-full min-w-0 flex-1 truncate bg-transparent text-sm font-semibold text-white outline-none"
        readonly
        aria-label="Access Link"
        :value="url"
        @focus="($event.target as HTMLInputElement).select()"
      />
      <button
        v-if="canCopy"
        type="button"
        class="btn btn-lime h-11 gap-1 px-3.5 text-[15px] lowercase"
        @click="copy(url)"
      >
        <Transition name="pop" mode="out-in">
          <span v-if="copied" key="copied" class="flex items-center gap-1">
            <Check :size="16" :stroke-width="3.2" aria-hidden="true" />
            Copied!
          </span>
          <span v-else key="copy">Copy</span>
        </Transition>
      </button>
      <!-- the button's own label change isn't reliably read out, so say it here too -->
      <span class="sr-only" aria-live="polite">{{ copied ? 'Link copied' : '' }}</span>
    </div>

    <div class="mt-1 flex gap-2">
      <button
        v-if="canShare || canCopy"
        type="button"
        class="btn btn-primary h-[58px] flex-1 lowercase [--focus:#fff]"
        @click="share()"
      >
        <Share :size="20" :stroke-width="2.8" aria-hidden="true" />
        Share…
      </button>
      <button type="button" class="btn h-[58px] flex-1 lowercase" @click="isOpen = false">
        Got It
      </button>
    </div>
  </AppDialog>
</template>

<style scoped>
.qr {
  --delay: 180ms;
  box-shadow: 0 14px 26px -14px rgb(0 0 0 / 0.7);
}
</style>
