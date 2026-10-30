<script setup lang="ts">
// the payoff after logging: a giant amount, confetti and a compliment sticker, gone after a beat
import { useEventListener } from '@vueuse/core'
import { Flame, Moon, Sunrise, Trophy } from 'lucide-vue-next'
import { type Component, computed, nextTick, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import Ribbons from '@/components/Ribbons.vue'
import type { Moment, MomentTag } from '@/lib/eggs'
import { burst, partyColors, stagger } from '@/lib/motion'

const model = defineModel<Moment | null>({ required: true })
const store = useAppStore()

const colors = computed(() => store.groups.map((group) => group.color))
const amount = computed(() => (model.value ? `+${model.value.value.toLocaleString()}` : ''))
const milestone = computed(() =>
  model.value?.milestone ? `#${model.value.milestone.toLocaleString()}!` : '',
)
const isSpecial = computed(() =>
  Boolean(model.value && (model.value.sixSeven || model.value.milestone)),
)
// the big number shrinks to fit the screen as it gets longer
const bigText = computed(() => milestone.value || amount.value)
const bigStyle = computed(() => ({ '--chars': Math.max(3, bigText.value.length) }))

const tagStyles: Record<MomentTag['kind'], { class: string; icon?: Component }> = {
  streak: { class: 'bg-orange-soft text-orange-ink', icon: Flame },
  best: { class: 'bg-lime text-ink', icon: Trophy },
  night: { class: 'bg-sky-soft text-sky-ink', icon: Moon },
  early: { class: 'bg-butter-soft text-butter-ink', icon: Sunrise },
  rare: { class: 'bg-ink text-lime' },
}

// a few bits of confetti that hang about, placed like the mock (percent of a 390×844 screen)
const sprinkles = [
  { left: 8.7, top: 10.9, w: 14, h: 30, r: 6, rot: -28, color: 'var(--color-lime)' },
  { left: 82, top: 8.8, w: 22, h: 22, r: 999, rot: 0, color: 'var(--color-pink)', blur: 1.5 },
  { left: 75, top: 20.9, w: 12, h: 24, r: 5, rot: 40, color: 'var(--color-orange)' },
  { left: 19.5, top: 24.4, w: 10, h: 10, r: 999, rot: 0, color: '#fff' },
  {
    left: 88,
    top: 34.4,
    w: 36,
    h: 36,
    r: 12,
    rot: 22,
    color: 'var(--color-lime)',
    blur: 4,
    opacity: 0.7,
  },
]

const bigEl = ref<HTMLElement>()
const cardEl = ref<HTMLElement>()

let timeout: ReturnType<typeof setTimeout> | undefined
watch(model, async (moment) => {
  clearTimeout(timeout)
  if (!moment) return
  timeout = setTimeout(() => (model.value = null), isSpecial.value ? 4400 : 3200)

  await nextTick()
  // confetti once the number has landed
  setTimeout(() => {
    if (model.value !== moment || !bigEl.value) return
    const special = moment.milestone || moment.sixSeven
    burst(bigEl.value, {
      shape: 'confetti',
      colors: partyColors,
      count: special ? 56 : 36,
      spread: special ? 260 : 200,
      duration: 1700,
      gravity: 180,
    })
    if (moment.milestone) {
      const { innerWidth: width, innerHeight: height } = window
      burst({ x: width * 0.1, y: height * 0.15 }, { count: 30, spread: 180, gravity: 220 })
      burst({ x: width * 0.9, y: height * 0.15 }, { count: 30, spread: 180, gravity: 220 })
    }
  }, 260)
  if (moment.superRare) {
    setTimeout(() => {
      if (model.value !== moment || !cardEl.value) return
      burst(cardEl.value, {
        shape: 'dots',
        colors: ['#FFB8DA', '#DDF0FF', '#F4FFD6', '#FFF1B8', '#EFE9FF', '#fff'],
        count: 28,
        spread: 190,
      })
    }, 700)
  }
})

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape' && model.value) model.value = null
})
</script>

<template>
  <div role="status" aria-live="polite">
    <!-- read out once; the screen itself is a big dismiss button -->
    <span v-if="model" class="sr-only">
      {{ model.name }} just logged {{ model.value.toLocaleString() }}. {{ model.compliment }}!
      <template v-for="tag in model.tags" :key="tag.kind">{{ tag.text }}. </template>
    </span>
    <Transition name="LoggedMoment">
      <button
        v-if="model"
        type="button"
        class="LoggedMoment on-color fixed inset-0 z-[65] block w-full cursor-pointer overflow-hidden bg-violet text-white"
        aria-label="Dismiss"
        @click="model = null"
      >
        <span class="LoggedMoment__ribbons absolute inset-0" aria-hidden="true">
          <Ribbons variant="moment" :colors="colors" :drift="!isSpecial" :dance="isSpecial" />
        </span>

        <span
          v-for="(bit, i) in sprinkles"
          :key="i"
          aria-hidden="true"
          class="LoggedMoment__sprinkle absolute"
          :style="{
            left: `${bit.left}%`,
            top: `${bit.top}%`,
            width: `${bit.w}px`,
            height: `${bit.h}px`,
            borderRadius: `${bit.r}px`,
            background: bit.color,
            rotate: `${bit.rot}deg`,
            filter: bit.blur ? `blur(${bit.blur}px)` : undefined,
            opacity: bit.opacity,
            ...stagger(i),
          }"
        />

        <span
          class="absolute inset-x-0 flex flex-col items-center px-4 text-center"
          :class="model.milestone ? 'top-[12%]' : 'top-[15.4%]'"
        >
          <span class="anim-rise hd text-[17px] text-lilac" style="--delay: 120ms">
            <template v-if="model.milestone"
              >{{ model.name }} logged the {{ model.milestone.toLocaleString() }}th one.
              hooray!</template
            >
            <template v-else>{{ model.name }} just logged</template>
          </span>

          <span
            ref="bigEl"
            class="LoggedMoment__big hd num block whitespace-nowrap text-lime"
            :style="bigStyle"
          >
            <template v-if="model.milestone">{{ milestone }}</template>
            <template v-else-if="model.sixSeven">
              <span class="sr-only">{{ amount }}</span>
              <span aria-hidden="true" class="mt-[0.1em] inline-flex gap-[0.12em]">
                <span class="LoggedMoment__six inline-block">6</span>
                <span class="LoggedMoment__seven inline-block">7</span>
              </span>
            </template>
            <template v-else>{{ amount }}</template>
          </span>

          <span
            v-if="model.milestone"
            class="anim-pop hd num -mt-1 text-[30px] text-white"
            style="--delay: 520ms"
            >{{ amount }}</span
          >
          <span
            v-else-if="model.sixSeven"
            class="anim-pop hd mt-1 text-[30px] text-white"
            style="--delay: 520ms"
            >six seven!</span
          >
        </span>

        <span
          class="absolute inset-x-12 flex justify-center"
          :class="model.milestone || model.sixSeven ? 'top-[52%]' : 'top-[49.8%]'"
        >
          <span
            ref="cardEl"
            class="LoggedMoment__card anim-sticker relative block w-full max-w-[320px] overflow-hidden rounded-[26px] bg-white px-5 pt-[22px] pb-[18px] text-center text-ink"
            :class="{ 'LoggedMoment__card--rare': model.superRare }"
            style="--delay: 380ms"
          >
            <span class="hand relative block text-[clamp(40px,13vw,56px)] [overflow-wrap:anywhere]">
              {{ model.compliment }}!
            </span>
            <span
              v-if="model.tags.length"
              class="relative mt-2.5 flex flex-wrap items-center justify-center gap-1.5"
            >
              <span
                v-for="(tag, i) in model.tags"
                :key="tag.kind"
                class="tag anim-pop px-2.5 py-[5px] text-[13px]"
                :class="tagStyles[tag.kind].class"
                :style="{ ...stagger(i), '--delay': '760ms' }"
              >
                <component
                  :is="tagStyles[tag.kind].icon"
                  v-if="tagStyles[tag.kind].icon"
                  :size="13"
                  :stroke-width="2.8"
                  aria-hidden="true"
                  :fill="tag.kind === 'streak' ? 'var(--color-orange)' : 'none'"
                  :class="{ 'text-orange': tag.kind === 'streak' }"
                />
                {{ tag.text }}
              </span>
            </span>
          </span>
        </span>

        <span
          class="anim-fade absolute inset-x-0 bottom-[max(34px,env(safe-area-inset-bottom))] text-center text-[14px] font-extrabold text-white/90 italic"
          style="--delay: 1100ms"
        >
          tap anywhere to keep going
        </span>
      </button>
    </Transition>
  </div>
</template>

<style>
/* the screen opens like a bubble from the log button, and floats away when done */
.LoggedMoment {
  clip-path: circle(150% at 50% 72%);
}
.LoggedMoment-enter-active {
  transition: clip-path 0.6s var(--ease-out);
}
.LoggedMoment-enter-from {
  clip-path: circle(0% at 50% 72%);
}
.LoggedMoment-leave-active {
  transition:
    opacity 0.28s ease-in,
    scale 0.28s ease-in;
}
.LoggedMoment-leave-to {
  opacity: 0;
  scale: 1.04;
}

/* the ribbons paint themselves in from the left with a soft, feathered leading edge */
.LoggedMoment__ribbons {
  mask-image: linear-gradient(100deg, #000 42%, transparent 58%);
  mask-size: 300% 100%;
  mask-repeat: no-repeat;
  animation: LoggedMoment-ribbons 1.1s 0.12s var(--ease-out) both;
}
@keyframes LoggedMoment-ribbons {
  from {
    mask-position: 100% 0;
  }
  to {
    mask-position: 0 0;
  }
}

/*
 * the number shrinks to fit as it gets longer: glyphs are ~0.64em wide, and it stays inside
 * ~86% of the screen even at the top of its 1.08× pop, so it never touches the edges
 */
.LoggedMoment__big {
  font-size: min(168px, calc(min(100vw, 36rem) * 0.86 / (1.08 * 0.64 * var(--chars))));
  letter-spacing: -0.04em;
  line-height: 0.9;
  text-shadow: 0 12px 0 rgb(21 19 26 / 0.22);
  animation: LoggedMoment-number 0.75s 0.18s both;
}
/* the bounce lives in the keyframes, with easings that don't overshoot them: 1.08 is the peak */
@keyframes LoggedMoment-number {
  0% {
    opacity: 0;
    scale: 0.2;
    rotate: -12deg;
    animation-timing-function: var(--ease-out);
  }
  50% {
    opacity: 1;
    scale: 1.08;
    rotate: 2deg;
    animation-timing-function: ease-in-out;
  }
  78% {
    scale: 0.98;
    rotate: -0.5deg;
    animation-timing-function: ease-in-out;
  }
  100% {
    scale: 1;
    rotate: 0deg;
  }
}

/* 6 7: one goes up as the other goes down */
.LoggedMoment__six,
.LoggedMoment__seven {
  animation: LoggedMoment-six-seven 0.7s 0.6s ease-in-out infinite alternate both;
}
.LoggedMoment__seven {
  animation-delay: 0.95s;
}
@keyframes LoggedMoment-six-seven {
  from {
    translate: 0 0.07em;
    rotate: -6deg;
  }
  to {
    translate: 0 -0.05em;
    rotate: 6deg;
  }
}

.LoggedMoment__card {
  transform: perspective(700px) rotateX(14deg) rotateZ(-5deg);
  box-shadow: 0 30px 40px -18px rgb(21 19 26 / 0.55);
}
/* super rare: a holographic sticker with a shine running across it */
.LoggedMoment__card--rare {
  background: linear-gradient(
    115deg,
    #ffe3f1 0%,
    #ddf0ff 20%,
    #f4ffd6 40%,
    #fff1b8 60%,
    #efe9ff 80%,
    #ffe3f1 100%
  );
  background-size: 300% 100%;
  animation:
    sticker-in 0.65s var(--ease-spring) 0.38s both,
    LoggedMoment-holo 3s linear infinite;
}
.LoggedMoment__card--rare::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 35%,
    rgb(255 255 255 / 0.75) 48%,
    transparent 61%
  );
  translate: -100% 0;
  animation: LoggedMoment-shine 2.2s 1s ease-in-out infinite;
  pointer-events: none;
}
@keyframes LoggedMoment-holo {
  to {
    background-position: 300% 0;
  }
}
@keyframes LoggedMoment-shine {
  60%,
  100% {
    translate: 100% 0;
  }
}

.LoggedMoment__sprinkle {
  animation:
    pop-in 0.5s var(--ease-spring) both,
    float 3.2s ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * 70ms + 300ms), calc(var(--i, 0) * 400ms + 800ms);
}
</style>
