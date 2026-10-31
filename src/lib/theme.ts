// light or dark: the device's choice unless someone picks one. index.html sets it before first
// paint (same key), so the page never flashes the wrong colours; this keeps it up to date
import { useLocalStorage, usePreferredDark } from '@vueuse/core'
import { watchEffect } from 'vue'

export type ThemeChoice = 'system' | 'light' | 'dark'

/** What this device picked: `system` follows the device's light or dark mode */
export const themeChoice = useLocalStorage<ThemeChoice>('challenge-theme', 'system')

const prefersDark = usePreferredDark()

/** Keep the page's `data-theme` in step with the choice and the device */
export function trackTheme() {
  watchEffect(() => {
    const isDark =
      themeChoice.value === 'dark' || (themeChoice.value !== 'light' && prefersDark.value)
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
  })
}
