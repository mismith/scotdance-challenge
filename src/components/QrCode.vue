<script setup lang="ts">
// a real, scannable QR code, drawn as soft rounded dots with rounded corner eyes
import { QrCodeDataType, encode } from 'uqr'
import { computed } from 'vue'

const props = withDefaults(defineProps<{ value: string; label?: string }>(), {
  label: 'QR code',
})

const DOT = 0.88
const DOT_RADIUS = 0.3

function roundedRect(x: number, y: number, size: number, radius: number) {
  const side = size - radius * 2
  return (
    `M${x + radius} ${y}h${side}a${radius} ${radius} 0 0 1 ${radius} ${radius}v${side}` +
    `a${radius} ${radius} 0 0 1 -${radius} ${radius}h-${side}` +
    `a${radius} ${radius} 0 0 1 -${radius} -${radius}v-${side}` +
    `a${radius} ${radius} 0 0 1 ${radius} -${radius}z`
  )
}

const qr = computed(() => {
  const { data, types, size } = encode(props.value, { ecc: 'M', border: 0 })
  const inset = (1 - DOT) / 2
  let dots = ''
  data.forEach((row, y) =>
    row.forEach((isDark, x) => {
      if (isDark && types[y]?.[x] !== QrCodeDataType.Position) {
        dots += roundedRect(x + inset, y + inset, DOT, DOT_RADIUS)
      }
    }),
  )
  // the three corner "eyes": a rounded ring with a rounded centre
  const eyes = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ]
    .map(
      ([x = 0, y = 0]) =>
        roundedRect(x, y, 7, 2.2) +
        roundedRect(x + 1, y + 1, 5, 1.4) +
        roundedRect(x + 2, y + 2, 3, 1),
    )
    .join('')
  return { size, dots, eyes }
})
</script>

<template>
  <svg
    :viewBox="`0 0 ${qr.size} ${qr.size}`"
    role="img"
    :aria-label="label"
    shape-rendering="geometricPrecision"
  >
    <path :d="qr.eyes" fill="currentColor" fill-rule="evenodd" />
    <path :d="qr.dots" fill="currentColor" />
  </svg>
</template>
