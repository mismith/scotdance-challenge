// A Home Screen app wakes up where it was left instead of loading again, so it can keep running
// an old version for days. When it comes back on screen it checks for a newer one, and the next
// time you move between pages it loads that page fresh, so nothing you're typing is lost.
// (`index.html` is never served stale: see the headers in firebase.json.)
import type { Router } from 'vue-router'

let isOutdated = false
let checkedAt = 0

async function check() {
  if (isOutdated || Date.now() - checkedAt < 60_000) return
  checkedAt = Date.now()
  try {
    const response = await fetch('/version.json', { cache: 'no-store' })
    const { version } = await response.json()
    if (version && version !== __APP_VERSION__) isOutdated = true
  } catch {
    // offline or mid-deploy: try again next time
  }
}

export function trackUpdates(router: Router) {
  if (!import.meta.env.PROD) return
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
  router.beforeEach((to, from) => {
    if (!isOutdated || to.path === from.path) return
    window.location.assign(to.fullPath)
    return false
  })
}
