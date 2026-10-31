<script setup lang="ts">
import AnimatedNumber from '@/components/AnimatedNumber.vue'

export interface PodiumItem {
  id: string
  rank: number
  name: string
  /** a smaller line under the name */
  note?: string
  color?: string | null
  value: number
}

defineProps<{
  items: PodiumItem[]
  /** each place's class, for finding it in tests */
  itemClass?: string
}>()

// podium places by rank index: 1st in the middle on lime, then 2nd left, 3rd right
const ordinals = ['1st', '2nd', '3rd']
// big totals step down to fit their block: `cqi` is the block's width (it's a size container)
const numSize = (index: number, value: number) => {
  const chars = value.toLocaleString().length
  return `min(${places[index]!.num}px, calc((100cqi - 14px) / ${(chars * 0.58).toFixed(2)}))`
}
const places = [
  { col: 'col-start-2', avatar: 58, letter: 28, step: 124, num: 40, delay: 360 },
  { col: 'col-start-1', avatar: 46, letter: 22, step: 94, num: 30, delay: 180 },
  { col: 'col-start-3', avatar: 42, letter: 20, step: 72, num: 26, delay: 0 },
]
const fallbackColors = ['#D4FF3A', '#4CD964', '#3DA9FF']
const stepColor = (index: number, color?: string | null) =>
  index === 0 ? '#D4FF3A' : color || fallbackColors[index]!
const avatarColor = (index: number, color?: string | null) => color || fallbackColors[index]!
// a group colour too dark to see on the dark stage gets a soft light edge
const isTooDark = (color: string) => luminance(color) < 0.03
const edgeOn = (color: string) => (isTooDark(color) ? 'rgb(255 255 255 / 0.35)' : color)

// ink or white, whichever has more contrast on a `#rrggbb` colour (WCAG luminance)
const luminance = (hex: string) => {
  const [r, g, b] = (hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)?.slice(1) ?? []).map(
    (part) => {
      const c = parseInt(part, 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    },
  )
  if (r === undefined || g === undefined || b === undefined) return 1
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const INK_LUMINANCE = 0.0068 // #15131A
const readableOn = (color: string) => {
  const l = luminance(color)
  return (l + 0.05) / (INK_LUMINANCE + 0.05) >= 1.05 / (l + 0.05) ? 'var(--color-ink)' : '#fff'
}
</script>

<template>
  <ol
    class="on-color mx-4 mt-3 grid h-[268px] grid-cols-3 items-end gap-2 overflow-hidden rounded-[28px] bg-ink px-3.5 pt-[18px]"
    aria-label="Top three"
  >
    <li
      v-for="(item, index) in items.slice(0, 3)"
      :key="item.id"
      class="row-start-1 flex min-w-0 flex-col items-center gap-1.5 text-white"
      :class="[places[index]!.col, itemClass]"
      :data-rank="item.rank"
    >
      <svg
        v-if="index === 0"
        class="podium-crown"
        width="34"
        height="22"
        viewBox="0 0 34 22"
        aria-hidden="true"
      >
        <path d="M2 20 L4 5 L12 12 L17 2 L22 12 L30 5 L32 20 Z" fill="#D4FF3A" />
      </svg>
      <span
        class="podium-avatar flex shrink-0 items-center justify-center rounded-full hd leading-none"
        :class="{ 'podium-glow': index === 0 }"
        :style="{
          width: `${places[index]!.avatar}px`,
          height: `${places[index]!.avatar}px`,
          fontSize: `${places[index]!.letter}px`,
          background: avatarColor(index, item.color),
          color: readableOn(avatarColor(index, item.color)),
          boxShadow:
            index === 0
              ? '0 0 0 3px var(--color-ink), 0 0 0 6px #D4FF3A, 0 0 26px #D4FF3A88'
              : `0 0 0 3px var(--color-ink), 0 0 0 5px ${edgeOn(avatarColor(index, item.color))}`,
          '--delay': `${places[index]!.delay + 380}ms`,
        }"
        aria-hidden="true"
      >
        {{ item.name[0]?.toUpperCase() }}
      </span>
      <span
        class="w-full truncate text-center leading-tight font-extrabold"
        :class="index === 0 ? 'text-[15px]' : 'text-sm'"
      >
        {{ item.name }}
      </span>
      <span
        v-if="item.note"
        class="-mt-1 w-full truncate text-center text-xs leading-tight font-semibold text-white/60"
      >
        {{ item.note }}
      </span>
      <span
        class="podium-step flex w-full flex-col items-center rounded-t-[20px] pt-2.5"
        :style="{
          height: `${places[index]!.step}px`,
          boxShadow: isTooDark(stepColor(index, item.color))
            ? 'inset 0 0 0 2px rgb(255 255 255 / 0.18)'
            : undefined,
          background: stepColor(index, item.color),
          color: readableOn(stepColor(index, item.color)),
          '--delay': `${places[index]!.delay}ms`,
        }"
      >
        <!-- room under the number, so its commas never touch the place -->
        <span
          class="hd max-w-full pb-1 whitespace-nowrap"
          :style="{ fontSize: numSize(index, item.value) }"
        >
          <AnimatedNumber :value="item.value" :duration="1400" />
        </span>
        <span class="text-xs font-extrabold">{{ ordinals[index] }}</span>
      </span>
    </li>
  </ol>
</template>

<style scoped>
/* steps grow up from the floor of the stage; the number inside sizes itself to the step's width */
.podium-step {
  container-type: inline-size;
  transform-origin: 50% 100%;
  animation: podium-grow 0.75s var(--ease-spring) both;
  animation-delay: var(--delay, 0ms);
}
.podium-avatar {
  animation: var(--animate-pop);
  animation-delay: var(--delay, 0ms);
}
.podium-glow {
  animation:
    var(--animate-pop),
    podium-glow 2.6s ease-in-out 1.6s infinite;
  animation-delay: var(--delay, 0ms), 1.6s;
}
.podium-crown {
  transform-origin: 50% 100%;
  animation: podium-crown 0.7s var(--ease-spring) 1.05s both;
}

@keyframes podium-grow {
  from {
    scale: 1 0;
  }
}
@keyframes podium-crown {
  0% {
    opacity: 0;
    translate: 0 -18px;
    rotate: -20deg;
  }
  60% {
    opacity: 1;
    translate: 0 2px;
    rotate: 6deg;
  }
  100% {
    translate: 0 0;
    rotate: 0deg;
  }
}
@keyframes podium-glow {
  50% {
    filter: drop-shadow(0 0 14px #d4ff3a);
  }
}
</style>
