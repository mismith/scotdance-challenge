export function capitalize(text: string) {
  return (text || '')
    .trim()
    .split(' ')
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(' ')
}

export function pluralize(count: number, word: string, suffix = 's') {
  return count === 1 ? word : `${word}${suffix}`
}
