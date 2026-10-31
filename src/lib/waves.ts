// smooth ribbon geometry: sampled curves turned into cubic Béziers with Catmull-Rom, so every
// band is mathematically even (never hand-drawn)

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

// the ribbons are each challenge's climb: its running total, day by day, as a smooth curve
// that only ever rises (every practice is a step)

/** What a ribbon's entries need: when, and how much */
export interface ClimbEntry {
  createdAt?: { toDate(): Date } | null
  value: number
}

/** How many days of a challenge's climb the ribbons show, at most */
export const CLIMB_DAYS = 28

/**
 * Each day's total, oldest first, from the first day with entries (or `maxDays` before the
 * last) to the last: quiet days in between are 0, so they draw as flats
 */
export function dailyTotals(entries: ClimbEntry[], maxDays = CLIMB_DAYS, now = new Date()) {
  const dayOf = (date: Date) =>
    Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000)
  const totals = new Map<number, number>()
  for (const { createdAt, value } of entries) {
    // just added, so not back from the server yet: it's today's
    const day = dayOf(createdAt?.toDate() ?? now)
    totals.set(day, (totals.get(day) ?? 0) + (Number(value) || 0))
  }
  if (!totals.size) return []
  const days = [...totals.keys()]
  const last = Math.max(...days)
  const first = Math.max(Math.min(...days), last - maxDays + 1)
  return Array.from({ length: last - first + 1 }, (_, i) => Math.max(0, totals.get(first + i) ?? 0))
}

/** A challenge with too little logged to have a climb of its own shows the logo's three steps */
const FIRST_STEPS = [0, 1, 0, 1, 0, 1, 0]

/**
 * The climb's shape, from 0 at the start to 1 at the end: a monotone cubic through the running
 * total (Fritsch–Carlson), so it eases through every day and never dips
 */
export function climbShape(days: number[]) {
  const busyDays = days.filter((day) => day > 0).length
  const daily = busyDays < 2 ? FIRST_STEPS : days
  const ys = [0]
  for (const day of daily) ys.push(ys.at(-1)! + day)
  const max = ys.at(-1)!
  const n = ys.length
  const h = 1 / (n - 1)
  const ms = ys.slice(1).map((y, i) => (y - ys[i]!) / max / h)
  const tangents = ys.map((_, i) => {
    if (i === 0) return ms[0]!
    if (i === n - 1) return ms[n - 2]!
    const [a, b] = [ms[i - 1]!, ms[i]!]
    return a <= 0 || b <= 0 ? 0 : 2 / (1 / a + 1 / b)
  })
  return (t: number) => {
    const i = Math.min(n - 2, Math.max(0, Math.floor(t / h)))
    const s = Math.min(1, Math.max(0, (t - i * h) / h))
    const [y0, y1] = [ys[i]! / max, ys[i + 1]! / max]
    const s2 = s * s
    const s3 = s2 * s
    return (
      (2 * s3 - 3 * s2 + 1) * y0 +
      (s3 - 2 * s2 + s) * h * tangents[i]! +
      (-2 * s3 + 3 * s2) * y1 +
      (s3 - s2) * h * tangents[i + 1]!
    )
  }
}

export interface RibbonLayout {
  viewBox: string
  /** `none` stretches the bands sideways to fill a strip of fixed height */
  aspect?: 'slice' | 'none'
  /** bands that fit comfortably; more colours squeeze into the same room */
  max: number
  /** the first (top) band: from x0 to x1, climbing from `bottom` to `top` */
  band: { x0: number; x1: number; bottom: number; top: number; thick: number }
  /** each next band sits this much lower */
  gap: number
  /** how far the bands wiggle when they dance, and over what wavelength */
  wobble: { amp: number; wl: number }
}

// the climb runs from the bottom left to the top right; whatever sits on top fades it out
export const ribbonLayouts = {
  // behind the Explore hero card's top and title
  card: {
    viewBox: '0 0 380 250',
    max: 4,
    gap: 18,
    band: { x0: -20, x1: 400, bottom: 190, top: 24, thick: 12 },
    wobble: { amp: 8, wl: 190 },
  },
  // the empty-state card's strip
  header: {
    viewBox: '0 -24 380 112',
    max: 3,
    gap: 15,
    band: { x0: -20, x1: 400, bottom: 66, top: 0, thick: 10 },
    wobble: { amp: 6, wl: 170 },
  },
  // the bottom of the challenge header, behind its total: always this tall, stretched to width
  shell: {
    viewBox: '0 0 380 92',
    aspect: 'none',
    max: 3,
    gap: 10.5,
    band: { x0: -20, x1: 400, bottom: 70, top: 8, thick: 7 },
    wobble: { amp: 3, wl: 170 },
  },
  // the just-logged screen: the last stretch of the climb, big across the bottom
  moment: {
    viewBox: '0 0 390 844',
    max: 4,
    gap: 46,
    band: { x0: -40, x1: 430, bottom: 780, top: 450, thick: 36 },
    wobble: { amp: 12, wl: 300 },
  },
} satisfies Record<string, RibbonLayout>
export type RibbonVariant = keyof typeof ribbonLayouts

/** Ribbon colours for challenges without groups (or groups without colours) */
export const fallbackRibbonColors = ['#D336F4', '#3DA9FF', '#4CD964', '#FF5A4A']

/** Most bands drawn, however many colours there are */
const MAX_BANDS = 10

/**
 * The band paths for a layout, all following the climb of `days`. `wobble` (0 to 1) adds a
 * dancing wiggle along them, moved along by `phaseShift` and offset per band by `stagger`
 */
export function ribbonPaths(
  variant: RibbonVariant,
  count: number,
  days: number[],
  { wobble = 0, phaseShift = 0, stagger = 0 } = {},
) {
  const layout: RibbonLayout = ribbonLayouts[variant]
  const { band, gap, max } = layout
  const shape = climbShape(days)
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
  const samples = 80
  const width = band.x1 - band.x0
  return Array.from({ length: n }, (_, i) => {
    const top = Array.from({ length: samples + 1 }, (_, j): Point => {
      const x = band.x0 + (width * j) / samples
      const wiggle =
        wobble *
        layout.wobble.amp *
        Math.sin((2 * Math.PI * (x - band.x0)) / layout.wobble.wl + phaseShift + i * stagger)
      const y = band.bottom - (band.bottom - band.top) * shape(j / samples)
      return [x, y + offset + i * (thick + space) + wiggle]
    })
    const bottom = top.map(([x, y]): Point => [x, y + thick]).reverse()
    return `${bezierPath(top)} ${bezierPath(bottom, false)} Z`
  })
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
