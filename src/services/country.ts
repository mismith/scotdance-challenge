import { countries, getEmojiFlag } from 'countries-list';

export { countries, getEmojiFlag };

const apiKey = '808b260bea35a06a03cdae6bae7092593d5426e05eb134c37837bb59';
export async function fetchCountryCode() {
  const res = await window.fetch(`https://api.ipdata.co/country_code?api-key=${apiKey}`);
  const countryCode = await res.text();
  return countryCode;
}
