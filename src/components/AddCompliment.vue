<script setup lang="ts">
// the hidden heart: anyone can add their own compliment to the ones shown after logging
import { computed, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import AppDialog from '@/components/AppDialog.vue'
import compliments from '@/lib/compliments'
import { animate, burst, partyColors, prefersReducedMotion, ripple } from '@/lib/motion'
import { crisp } from '@/lib/utils'

const heartPath =
  'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z'

const store = useAppStore()

const isOpen = ref(false)
const isFound = ref(false)
const isPlaying = ref(false)
const newCompliment = ref('')
const isSubmitting = ref(false)
const heartEl = ref<SVGSVGElement>()
const sendEl = ref<HTMLButtonElement>()

const sanitized = computed(() => newCompliment.value.trim().toLowerCase().replace(/!$/, ''))
const error = computed(() =>
  compliments.includes(sanitized.value) ? "That one's already in there. Try another!" : null,
)
const isValid = computed(() => Boolean(sanitized.value) && !error.value)

// a different example each time, from the compliments dancers already see: short ones that
// read well with a "!" after them
const examples = compliments.filter((c) => c.length <= 24 && !/[!?.]$/.test(c))
const pickExample = () => examples[Math.floor(Math.random() * examples.length)] ?? 'well done'
const example = ref(pickExample())

watch(isOpen, (open) => {
  if (open) {
    example.value = pickExample()
    return
  }
  newCompliment.value = ''
  isFound.value = false
})

// squish, fill pink, pop with little hearts and a ripple, then the sheet rises
async function handleFind() {
  if (isPlaying.value) return
  isFound.value = true
  if (prefersReducedMotion.value) {
    isOpen.value = true
    return
  }
  isPlaying.value = true
  const heart = heartEl.value
  setTimeout(() => {
    if (!heart) return
    burst(heart, { shape: 'hearts', colors: partyColors, count: 8, spread: 56, duration: 800 })
    ripple(heart, '#FFB8DA', 96)
  }, 220)
  await animate(
    heart,
    [
      { transform: 'scale(1, 1)' },
      { transform: 'scale(1.25, 0.82)', offset: 0.28 },
      { transform: 'scale(2.1, 2.1)', offset: 0.55 },
      { transform: 'scale(0.9, 0.9)', offset: 0.8 },
      { transform: 'scale(1, 1)' },
    ],
    { duration: 620, easing: 'ease-in-out' },
  )
  isPlaying.value = false
  isOpen.value = true
}

async function handleAddCompliment() {
  if (!isValid.value || isSubmitting.value) return
  try {
    isSubmitting.value = true
    const text = sanitized.value
    await store.addCompliment(text)
    if (sendEl.value) {
      burst(sendEl.value, { shape: 'hearts', colors: partyColors, count: 12, spread: 90 })
    }
    isOpen.value = false
    crisp('do', 'message:send', ['text', `Compliment Submitted: ${text}`])
    crisp('do', 'chat:hide')
    setTimeout(() => store.notify('sent! thank you for spreading the love 💖'), 300)
  } catch (error) {
    store.notifyFailed(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <button
      type="button"
      class="AddCompliment flex size-11 items-center justify-center rounded-full"
      :class="{ 'AddCompliment--found': isFound }"
      aria-label="Spread the Love"
      @click="handleFind()"
    >
      <svg ref="heartEl" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path :d="heartPath" stroke-width="2.2" stroke-linejoin="round" />
      </svg>
    </button>

    <AppDialog
      v-model="isOpen"
      title="spread the love"
      description="Write a compliment. It'll pop up for someone after they log."
    >
      <template #title-icon>
        <svg
          class="anim-pop shrink-0"
          style="--delay: 250ms"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="var(--color-pink)"
          aria-hidden="true"
        >
          <path :d="heartPath" />
        </svg>
      </template>
      <form class="flex flex-col gap-2" @submit.prevent="handleAddCompliment()">
        <label for="compliment" class="sr-only">Your compliment</label>
        <input
          id="compliment"
          v-model="newCompliment"
          class="pill"
          placeholder="your compliment"
          autocomplete="off"
          maxlength="80"
          :aria-invalid="Boolean(error)"
          aria-describedby="compliment-error"
        />
        <span
          id="compliment-error"
          class="min-h-0 pl-1.5 text-sm font-bold text-orange-ink empty:hidden"
          aria-live="polite"
          >{{ error }}</span
        >

        <div
          class="mt-1.5 mb-1 -rotate-[1.5deg] rounded-[20px] bg-card p-3.5 text-center"
          aria-hidden="true"
        >
          <span class="block text-xs font-bold text-hint">how it'll look</span>
          <Transition name="pop" mode="out-in">
            <span
              :key="sanitized ? 'typed' : 'empty'"
              class="hand block text-[38px] [overflow-wrap:anywhere]"
              :class="{ 'text-faint': !sanitized }"
            >
              {{ sanitized || example }}!
            </span>
          </Transition>
        </div>

        <button
          ref="sendEl"
          type="submit"
          class="btn btn-pink btn-lg h-[60px] text-[21px]"
          :disabled="!isValid || isSubmitting"
        >
          send it
        </button>
      </form>
    </AppDialog>
  </div>
</template>

<style>
/* quiet until it's found: a light grey outline, then pink */
.AddCompliment svg {
  fill: transparent;
  stroke: #c9c1d3;
  transition:
    fill 0.18s ease-out,
    stroke 0.18s ease-out;
}
.AddCompliment:hover svg {
  stroke: #b3a9c0;
}
/* once tapped it's all pink, outline too, even while still hovered (a tap leaves :hover on) */
.AddCompliment.AddCompliment--found svg {
  fill: var(--color-pink);
  stroke: var(--color-pink);
  transition-duration: 0.1s;
}
</style>
