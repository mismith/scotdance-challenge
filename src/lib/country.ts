import { type TCountryCode, countries, getEmojiFlag } from 'countries-list'

const apiKey = '808b260bea35a06a03cdae6bae7092593d5426e05eb134c37837bb59'
export async function fetchCountryCode() {
  const res = await window.fetch(`https://api.ipdata.co/country_code?api-key=${apiKey}`)
  return res.text()
}

function isCountryCode(code?: string | null): code is TCountryCode {
  return Boolean(code && code in countries)
}

export function getFlag(code?: string | null) {
  return isCountryCode(code) ? getEmojiFlag(code) : ''
}

export function getName(code?: string | null) {
  return isCountryCode(code) ? `${countries[code].name} ${getEmojiFlag(code)}` : null
}

export const availableCountries = Object.entries(countries)
  .filter(([, { languages }]) => languages.includes('en'))
  .map(([code, { name }]) => ({ id: code, name, $name: getName(code)! }))
  .sort((a, b) => a.name.localeCompare(b.name))
