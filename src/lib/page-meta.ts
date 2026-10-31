// each page's title says where you are ("PDB Challenge · Stats"). Search engines only list
// Explore: challenges are full of dancers' names, and they're for sharing by link, not for search
import { watchEffect } from 'vue'
import type { Router } from 'vue-router'
import { useAppStore } from '@/stores/app'

const site = 'ScotDance Challenge'

export function trackPageMeta(router: Router) {
  const store = useAppStore()
  const robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex'
  watchEffect(() => {
    const route = router.currentRoute.value
    const page = typeof route.meta.title === 'string' ? route.meta.title : ''
    const challenge = route.name === 'certificate' || route.params.challengeId ? store.currentChallenge?.name : ''
    document.title = [challenge, page].filter(Boolean).join(' · ') || site
    if (route.name === 'home') robots.remove()
    else document.head.append(robots)
  })
}
