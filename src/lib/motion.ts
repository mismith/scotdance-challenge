// shared motion: everything here goes still when the device asks for reduced motion
import { readonly, ref } from 'vue'

const query =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null
const reduced = ref(Boolean(query?.matches))
query?.addEventListener('change', (event) => (reduced.value = event.matches))

/** Whether the device asks for reduced motion (reactive) */
export const prefersReducedMotion = readonly(reduced)

/** Palette colours for confetti and little hearts */
export const partyColors = ['#D4FF3A', '#FF5FA8', '#3DA9FF', '#FF6A2B', '#FFD23F', '#6A3CFF']

export const easing = {
  /** overshoots a little, for things that pop */
  spring: 'cubic-bezier(.34, 1.56, .64, 1)',
  /** fast start, long gentle stop */
  out: 'cubic-bezier(.22, 1, .36, 1)',
  in: 'cubic-bezier(.55, 0, 1, .45)',
}

/** `style` for a list item, so `.anim-*` classes stagger by index */
export const stagger = (index: number) => ({ '--i': Math.min(index, 12) })

/** Element.animate that does nothing (and resolves at once) under reduced motion */
export function animate(
  element: Element | null | undefined,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: KeyframeAnimationOptions = {},
) {
  if (!element || reduced.value || !('animate' in element)) return Promise.resolve()
  const animation = element.animate(keyframes, { easing: easing.out, duration: 400, ...options })
  return animation.finished.then(
    () => undefined,
    () => undefined,
  )
}

const heartPath =
  'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z'

export interface BurstOptions {
  /** 'confetti' (strips and dots), 'hearts' or 'dots' */
  shape?: 'confetti' | 'hearts' | 'dots'
  colors?: string[]
  count?: number
  /** how far pieces fly, in px */
  spread?: number
  duration?: number
  /** confetti falls a little after flying out */
  gravity?: number
}

/**
 * Throw confetti or little hearts out from an element's centre (or a viewport point).
 * Pieces sit in a fixed, click-through layer and clean themselves up.
 */
export function burst(origin: Element | { x: number; y: number }, options: BurstOptions = {}) {
  if (reduced.value || typeof document === 'undefined') return Promise.resolve()
  const {
    shape = 'confetti',
    colors = partyColors,
    count = shape === 'hearts' ? 8 : 24,
    spread = shape === 'hearts' ? 64 : 160,
    duration = shape === 'hearts' ? 900 : 1400,
    gravity = shape === 'hearts' ? 10 : 90,
  } = options
  let x: number
  let y: number
  if ('getBoundingClientRect' in origin) {
    const rect = origin.getBoundingClientRect()
    x = rect.left + rect.width / 2
    y = rect.top + rect.height / 2
  } else {
    ;({ x, y } = origin)
  }

  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:80;overflow:hidden'
  document.body.append(layer)

  const flights = Array.from({ length: count }, (_, i) => {
    const color = colors[i % colors.length]!
    const piece = document.createElement('span')
    const size = shape === 'hearts' ? 10 + Math.random() * 8 : 6 + Math.random() * 6
    piece.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${
      shape === 'confetti' && i % 3 ? size * 2 : size
    }px;margin:${-size / 2}px 0 0 ${-size / 2}px;`
    if (shape === 'hearts') {
      piece.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="${color}"><path d="${heartPath}"/></svg>`
    } else {
      piece.style.background = color
      piece.style.borderRadius = shape === 'dots' || i % 3 === 0 ? '999px' : '3px'
    }
    layer.append(piece)

    // spread evenly round the circle, with a little wobble
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
    const distance = spread * (0.55 + Math.random() * 0.45)
    const dx = Math.cos(angle) * distance
    const dy = Math.sin(angle) * distance
    const spin = (Math.random() - 0.5) * (shape === 'hearts' ? 60 : 720)
    return piece.animate(
      [
        { transform: 'translate(0, 0) scale(.3) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) scale(1) rotate(${spin / 2}deg)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate(${dx * 1.1}px, ${dy * 1.1 + gravity}px) scale(.8) rotate(${spin}deg)`,
          opacity: 0,
        },
      ],
      { duration: duration * (0.8 + Math.random() * 0.4), easing: easing.out, fill: 'forwards' },
    ).finished
  })

  return Promise.allSettled(flights).then(() => layer.remove())
}

/** A soft ring that grows out from an element and fades, like a ripple */
export function ripple(element: Element | null | undefined, color = '#FFB8DA', size = 96) {
  if (!element || reduced.value) return Promise.resolve()
  const rect = element.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const ring = document.createElement('span')
  ring.setAttribute('aria-hidden', 'true')
  ring.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border-radius:999px;box-shadow:inset 0 0 0 3px ${color};pointer-events:none;z-index:80`
  document.body.append(ring)
  return ring
    .animate(
      [
        { transform: 'scale(.2)', opacity: 1 },
        { transform: 'scale(1)', opacity: 0 },
      ],
      { duration: 650, easing: easing.out, fill: 'forwards' },
    )
    .finished.then(
      () => ring.remove(),
      () => ring.remove(),
    )
}
