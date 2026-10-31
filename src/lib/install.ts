// putting the app on the Home Screen: iPhones and iPads only do it from Safari's Share sheet (so
// they get the steps), Android offers its own install prompt. The icon always opens Explore
// (`start_url` in public/manifest.webmanifest)
import { useLocalStorage } from '@vueuse/core'
import { computed, ref, shallowRef } from 'vue'

interface InstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// already opened from the Home Screen (iOS says so with `navigator.standalone`)
export const isStandalone =
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as { standalone?: boolean }).standalone === true
// iPadOS says it's a Mac, but one with a touch screen
export const isIos =
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
// phones and tablets: a computer has no Home Screen to speak of
const isTouch = matchMedia('(pointer: coarse)').matches

const installPrompt = shallowRef<InstallPromptEvent | null>(null)
window.addEventListener('beforeinstallprompt', (event) => {
  // ours instead of the browser's own banner
  event.preventDefault()
  installPrompt.value = event as InstallPromptEvent
})
window.addEventListener('appinstalled', () => (installPrompt.value = null))

/** Whether this device can put the app on its Home Screen (and hasn't yet) */
export const canInstall = computed(
  () => !isStandalone && isTouch && (isIos || Boolean(installPrompt.value)),
)
/** The how-to sheet, for iPhones and iPads */
export const isInstallSheetOpen = ref(false)
/** Explore's card can be put away; the account menu always has the option */
export const isInstallCardHidden = useLocalStorage('scotdance-challenge.installCardHidden', false)

export async function install() {
  const event = installPrompt.value
  if (!event) {
    isInstallSheetOpen.value = true
    return
  }
  // each prompt can only be shown once
  installPrompt.value = null
  const { outcome } = await event.prompt()
  if (outcome === 'accepted') isInstallCardHidden.value = true
}
