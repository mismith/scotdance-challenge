import { countries, getEmojiFlag, Country } from 'countries-list'
import orderBy from 'lodash.orderby'
import { idKey } from '@/plugins/firebase'

type CountryCode = keyof typeof countries;
export { countries, getEmojiFlag }

const apiKey = '808b260bea35a06a03cdae6bae7092593d5426e05eb134c37837bb59'
export async function fetchCountryCode() {
  const res = await window.fetch(`https://api.ipdata.co/country_code?api-key=${apiKey}`)
  const countryCode = await res.text()
  return countryCode
}

export const getName = (code: CountryCode, data: Country = countries[code]) => {
  if (data) {
    return `${data.name} ${data.emoji}`
  }
  return null
}

export const availableCountries = orderBy(
  Object.entries(countries)
    .map(([code, data]) => ({
      [idKey]: code,
      $name: getName(code as CountryCode, data),
      ...data,
    }))
    .filter(({ languages }) => languages.includes('en')),
  ['name'],
)
