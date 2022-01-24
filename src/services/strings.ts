export function capitalize(text: string) {
  const str = (text || '').trim()
  if (str) {
    const words = str.split(' ')
    for (let i = 0; i < words.length; i += 1) {
      words[i] = words[i][0].toUpperCase() + words[i].substr(1)
    }
    return words.join(' ')
  }
  return str
}

export function pluralize(count: number, word: string, suffix = 's') {
  return count === 1 ? word : `${word}${suffix}`
}
