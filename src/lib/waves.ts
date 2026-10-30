// smooth ribbon geometry: a sampled sine wave that rises left to right, turned into cubic
// Béziers with Catmull-Rom, so every band is mathematically even (never hand-drawn)

export type Point = [x: number, y: number]

export interface WaveOptions {
  /** left and right ends; run past the viewBox so the ends never show */
  x0: number
  x1: number
  /** y of the curve at x0 (before the sine) */
  base: number
  /** how much higher the curve ends at x1 than it starts */
  rise: number
  /** sine amplitude */
  amp: number
  /** sine wavelength */
  wl: number
  /** sine phase, in radians */
  phase?: number
  /** distance between samples; defaults to an eighth of the wavelength */
  step?: number
}

/** Sample the rising sine wave */
export function wavePoints({ x0, x1, base, rise, amp, wl, phase = 0, step }: WaveOptions) {
  const n = Math.max(2, Math.round((x1 - x0) / (step || wl / 8)))
  const points: Point[] = []
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    const t = (x - x0) / (x1 - x0)
    points.push([x, base - rise * t + amp * Math.sin((2 * Math.PI * (x - x0)) / wl + phase)])
  }
  return points
}

const f = (n: number) => n.toFixed(1)

/** A smooth path through the points: Catmull-Rom turned into cubic Béziers */
export function bezierPath(points: Point[], move = true) {
  const [first] = points
  if (!first) return ''
  const d = [`${move ? 'M' : 'L'}${f(first[0])} ${f(first[1])}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p0 = points[i - 1] ?? p1
    const p3 = points[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d.push(`C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`)
  }
  return d.join(' ')
}

/**
 * A filled band: the wave on top and the same wave `thick` lower underneath,
 * or filled down to `floor` when one is given
 */
export function bandPath(options: WaveOptions & { thick: number; floor?: number }) {
  const top = wavePoints(options)
  if (options.floor !== undefined) {
    return `${bezierPath(top)} L${f(options.x1)} ${f(options.floor)} L${f(options.x0)} ${f(options.floor)} Z`
  }
  const bottom = top.map(([x, y]): Point => [x, y + options.thick]).reverse()
  return `${bezierPath(top)} ${bezierPath(bottom, false)} Z`
}

export interface RibbonLayout {
  viewBox: string
  /** `none` stretches the bands sideways to fill a strip of fixed height */
  aspect?: 'slice' | 'none'
  /** bands that fit comfortably; more colours squeeze into the same room */
  max: number
  /** the first (top) band; each next one sits `gap` lower */
  band: WaveOptions & { thick: number }
  gap: number
}

// fitted to the approved mocks (Z-Explore card, Y2-Log header, Z-Moment sweep, Z-Ended header)
export const ribbonLayouts = {
  card: {
    viewBox: '0 0 380 170',
    max: 4,
    gap: 18,
    band: {
      x0: -20,
      x1: 380,
      base: 96,
      rise: 64,
      amp: 5,
      wl: 190,
      phase: 0.6,
      step: 30,
      thick: 12,
    },
  },
  header: {
    viewBox: '0 -24 380 112',
    max: 3,
    gap: 15,
    band: {
      x0: -20,
      x1: 380,
      base: 70,
      rise: 46,
      amp: 4,
      wl: 170,
      phase: 0.6,
      step: 30,
      thick: 10,
    },
  },
  // the challenge header's own strip, below all its text: always this tall, stretched to width
  shell: {
    viewBox: '0 0 380 44',
    aspect: 'none',
    max: 3,
    gap: 10.5,
    band: {
      x0: -20,
      x1: 400,
      base: 18,
      rise: 16,
      amp: 2,
      wl: 170,
      phase: 0.6,
      step: 30,
      thick: 7,
    },
  },
  moment: {
    viewBox: '0 0 390 844',
    max: 4,
    gap: 46,
    band: {
      x0: -40,
      x1: 440,
      base: 760,
      rise: 430,
      amp: 9,
      wl: 300,
      phase: 0.5,
      step: 40,
      thick: 36,
    },
  },
  ended: {
    viewBox: '0 -26 380 170',
    max: 3,
    gap: 15,
    band: {
      x0: -20,
      x1: 380,
      base: 108,
      rise: 60,
      amp: 3,
      wl: 240,
      phase: 0.3,
      step: 40,
      thick: 10,
    },
  },
} satisfies Record<string, RibbonLayout>
export type RibbonVariant = keyof typeof ribbonLayouts

/** Ribbon colours for challenges without groups (or groups without colours) */
export const fallbackRibbonColors = ['#D336F4', '#3DA9FF', '#4CD964', '#FF5A4A']

/** Most bands drawn, however many colours there are */
const MAX_BANDS = 10

/**
 * How far to slide a layout's bands so they land back on themselves: one wavelength along,
 * and the rise over that wavelength up (the sine repeats and the rise is a straight line)
 */
export function ribbonDriftVector(variant: RibbonVariant) {
  const { band } = ribbonLayouts[variant]
  return { x: band.wl, y: (-band.rise * band.wl) / (band.x1 - band.x0) }
}

/**
 * The band paths for a layout, optionally nudged (for dancing). `extend` draws one more
 * wavelength off the left edge, so the bands can slide right by `ribbonDriftVector` and
 * still fill the view
 */
export function ribbonPaths(
  variant: RibbonVariant,
  count: number,
  { phaseShift = 0, ampScale = 1, stagger = 0, extend = false } = {},
) {
  const layout = ribbonLayouts[variant]
  const { gap, max } = layout
  const drift = ribbonDriftVector(variant)
  const band = extend
    ? {
        ...layout.band,
        x0: layout.band.x0 - drift.x,
        base: layout.band.base - drift.y,
        rise: layout.band.rise - drift.y,
      }
    : layout.band
  const n = Math.max(1, Math.min(count, MAX_BANDS))
  // every colour shares the same sweep: fewer get a little fatter, more get slimmer
  const span = (max - 1) * gap + band.thick
  let space = gap - band.thick
  let thick: number
  if (n <= max) {
    thick = Math.min((span - (n - 1) * space) / n, band.thick * 1.6)
  } else {
    const ratio = space / band.thick
    thick = span / (n + (n - 1) * ratio)
    space = thick * ratio
  }
  const offset = (span - (n * thick + (n - 1) * space)) / 2
  return Array.from({ length: n }, (_, i) =>
    bandPath({
      ...band,
      thick,
      base: band.base + offset + i * (thick + space),
      amp: band.amp * ampScale,
      phase: band.phase + phaseShift + i * stagger,
    }),
  )
}

// colour maths, to keep every band visible on whatever it sits on
type Rgb = [r: number, g: number, b: number]
function parseHex(color: string): Rgb | null {
  const hex = color.trim().replace(/^#/, '')
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb
}
const toHex = (rgb: Rgb) =>
  `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
const mix = (a: Rgb, b: Rgb, t: number) => a.map((c, i) => c + (b[i]! - c) * t) as Rgb
/** Perceived distance between two colours ("redmean"), 0 to about 765 */
function distance(a: Rgb, b: Rgb) {
  const mean = (a[0] + b[0]) / 2
  const [dr, dg, db] = [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  return Math.sqrt((2 + mean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - mean) / 256) * db * db)
}
const luminance = ([r, g, b]: Rgb) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

/** How far apart a band must be from its background to read as its own colour */
const MIN_DISTANCE = 130

/**
 * Band colours that all show up on `background`: repeats are dropped, and any colour too
 * close to the background is lightened (on dark) or deepened (on light) until it stands out
 */
export function visibleRibbonColors(colors: string[], background: string) {
  const bg = parseHex(background)
  const seen = new Set<string>()
  const out: string[] = []
  for (const color of colors) {
    const key = color.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const rgb = parseHex(color)
    if (!bg || !rgb || distance(rgb, bg) >= MIN_DISTANCE) {
      out.push(color)
      continue
    }
    const toward: Rgb = luminance(bg) < 0.55 ? [255, 255, 255] : [21, 19, 26]
    let t = 0.3
    while (t < 0.9 && distance(mix(rgb, toward, t), bg) < MIN_DISTANCE) t += 0.1
    out.push(toHex(mix(rgb, toward, t)))
  }
  return out
}
