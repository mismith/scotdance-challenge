const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]

/** The milestone a new entry takes a participant's total past, if any */
export function getMilestone(before: number, after: number) {
  return [...milestones].reverse().find((milestone) => before < milestone && after >= milestone)
}

/** Whether an amount looks like a slip of the finger (40 for 4) next to someone's usual */
export function isUnusual(value: number, usual: number | null) {
  return usual !== null && value >= 10 && value > usual * 5
}
