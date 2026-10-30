import split from 'runes2'

// exponentially curb values so that outliers are less prominent in chart axes
export const flatten = (value: number) => value ** (1 / 2)
export const unflatten = (value: number) => Math.round(value ** 2)

const SI_SYMBOL = ['', 'k', 'M', 'G', 'T', 'P', 'E']
export function abbreviateNumber(number: number) {
  const tier = Math.floor(Math.log10(number) / 3)
  if (!tier || tier < 0) return number

  const scaled = number / 10 ** (tier * 3)
  return `${scaled.toFixed(1)}${SI_SYMBOL[tier]}`
}

export function truncateLabel(label: string, limit = 22) {
  if (!label) return label

  const chars = split(label.trim())
  if (chars.length <= limit) return label

  const truncate = (num: number) => chars.slice(0, num).join('').trim()
  const lastChar = chars[chars.length - 1]!
  if (!/[\w\s]/.test(lastChar)) {
    // last char is emoji-like (e.g. a flag); keep it in place
    return `${truncate(limit - 2)}…${lastChar}`
  }
  return `${truncate(limit - 1)}…`
}
