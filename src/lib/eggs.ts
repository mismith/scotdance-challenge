// little surprises for the moment after logging; pure helpers, so they're easy to test
import { differenceInCalendarDays, startOfDay } from 'date-fns'

/** a once-in-a-while compliment for the "super rare" sticker */
export const superRareCompliments = [
  'legendary dancer alert',
  'the stars are cheering for you',
  'pure sparkle power',
  'you just made the whole studio smile',
  'certified superstar',
  'unicorn-level effort',
  'that was pure magic',
  'gold medal energy',
]

/** how often a compliment comes out super rare */
export const SUPER_RARE_CHANCE = 1 / 50

export type TimeTag = 'night owl' | 'early bird'

export interface MomentTag {
  kind: 'streak' | 'best' | 'night' | 'early' | 'rare'
  text: string
}

export interface Moment {
  value: number
  name: string
  compliment: string
  superRare: boolean
  /** logged exactly 67 */
  sixSeven: boolean
  /** this entry is the challenge's 1,000th */
  milestone: number | null
  tags: MomentTag[]
}

/**
 * Consecutive days with an entry, counting back from today, today's own entry included.
 * Pass the earlier entries' dates; the one being logged now counts as today.
 */
export function streakDays(earlier: (Date | null | undefined)[], now = new Date()) {
  const daysAgo = new Set(
    earlier
      .filter((date): date is Date => Boolean(date))
      .map((date) => differenceInCalendarDays(startOfDay(now), startOfDay(date))),
  )
  let streak = 1
  while (daysAgo.has(streak)) streak++
  return streak
}

/** Beats every earlier entry, and there was at least one to beat */
export function isNewBest(value: number, earlierValues: number[]) {
  return earlierValues.length > 0 && earlierValues.every((earlier) => value > earlier)
}

export const isSixSeven = (value: number) => value === 67

/** The milestone this entry reaches (e.g. 1,000), given the challenge's count before it */
export function milestoneEntry(countBefore: number | null | undefined, milestones = [1000]) {
  const count = (countBefore ?? 0) + 1
  return milestones.includes(count) ? count : null
}

/** "night owl" from 8pm until 5am, "early bird" from 5am until 8am (the moment and Activity) */
export function timeTag(now = new Date()): TimeTag | null {
  const hour = now.getHours()
  if (hour >= 20 || hour < 5) return 'night owl'
  if (hour < 8) return 'early bird'
  return null
}

/** A random compliment, now and then a super rare one */
export function pickCompliment(compliments: string[], random = Math.random) {
  if (random() < SUPER_RARE_CHANCE) {
    return {
      text: superRareCompliments[Math.floor(random() * superRareCompliments.length)]!,
      superRare: true,
    }
  }
  return { text: compliments[Math.floor(random() * compliments.length)] ?? 'yay', superRare: false }
}

/** Everything the moment after logging shows */
export function buildMoment({
  value,
  name,
  compliments,
  earlier,
  countBefore,
  now = new Date(),
  random = Math.random,
}: {
  value: number
  name: string
  compliments: string[]
  /** the dancer's earlier entries (not the one just logged) */
  earlier: { value: number; date: Date | null | undefined }[]
  /** the challenge's entry count before this one */
  countBefore?: number | null
  now?: Date
  random?: () => number
}): Moment {
  const { text, superRare } = pickCompliment(compliments, random)
  const tags: MomentTag[] = []
  if (superRare) tags.push({ kind: 'rare', text: '✦ super rare' })
  const streak = streakDays(
    earlier.map((entry) => entry.date),
    now,
  )
  if (streak >= 2) tags.push({ kind: 'streak', text: `${streak} days in a row` })
  if (
    isNewBest(
      value,
      earlier.map((entry) => entry.value),
    )
  ) {
    tags.push({ kind: 'best', text: 'new best!' })
  }
  const time = timeTag(now)
  if (time) tags.push({ kind: time === 'night owl' ? 'night' : 'early', text: time })

  return {
    value,
    name,
    compliment: text,
    superRare,
    sixSeven: isSixSeven(value),
    milestone: milestoneEntry(countBefore),
    tags,
  }
}
