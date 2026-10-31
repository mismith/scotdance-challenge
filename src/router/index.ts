import { type RouteLocation, createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ChallengeShell from '@/components/ChallengeShell.vue'
import ActivityView from '@/views/ActivityView.vue'
import ExploreView from '@/views/ExploreView.vue'
import NewEntryView from '@/views/NewEntryView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import StatisticsView from '@/views/StatisticsView.vue'

const tabNames = ['new', 'activity', 'statistics']
// challenge links open the entry form, unless they say otherwise (e.g. emailed flags)
const linkTarget = (to: unknown) => (to === 'activity' ? 'activity' : 'new')

/**
 * Back and forward land where you were, like a native app. Waits for the page to be tall enough
 * (lists render after the old page fades out), but never longer than a moment
 */
function settledAt(top: number) {
  return new Promise<{ top: number }>((resolve) => {
    const startedAt = performance.now()
    const check = () => {
      const isTallEnough = document.documentElement.scrollHeight - window.innerHeight >= top
      if (isTallEnough || performance.now() - startedAt > 1500) resolve({ top })
      else requestAnimationFrame(check)
    }
    setTimeout(check, 150)
  })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return settledAt(savedPosition.top)
    // switching tabs keeps the tabs where they are, under your finger
    const isSameChallenge = to.params.challengeId === from.params.challengeId
    if (
      isSameChallenge &&
      tabNames.includes(String(to.name)) &&
      tabNames.includes(String(from.name))
    )
      return false
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'home', component: ExploreView, },
    // one shell (header and tabs) around all three tabs, so it stays put while they switch:
    // keyboard focus stays on the tab just pressed. The challenge is in the URL, so any tab of
    // any challenge can be linked to, and its link opens it (see the beforeEach below)
    {
      path: '/c/:challengeId',
      component: ChallengeShell,
      children: [
        { path: '', redirect: (to) => ({ name: 'new', params: to.params }) },
        { path: 'log', name: 'new', component: NewEntryView, meta: { title: 'Log' } },
        {
          path: 'activity',
          name: 'activity',
          component: ActivityView,
          meta: { title: 'Activity' },
        },
        {
          path: 'stats',
          name: 'statistics',
          component: StatisticsView,
          meta: { title: 'Stats' },
        },
      ],
    },
    // shared links (and printed QR codes) from before the challenge was in every URL
    ...(['private', 'public'] as const).map((name) => ({
      path: `/${name}/:challengeId`,
      name,
      redirect: ({ params, query, hash }: RouteLocation) => ({
        name: linkTarget(query.to),
        params: { challengeId: params.challengeId },
        hash,
      }),
    })),
    // old tab URLs (bookmarks, home-screen icons) open the challenge this device last had open
    ...(['new', 'activity', 'statistics'] as const).map((name) => ({
      path: `/${name}`,
      redirect: ({ query, hash }: RouteLocation) => {
        const { challengeId } = useAppStore()
        return challengeId ? { name, params: { challengeId }, query, hash } : { name: 'home' }
      },
    })),
    {
      path: '/certificate/:participantId',
      name: 'certificate',
      component: () => import('@/views/CertificateView.vue'),
      meta: { title: 'Certificate' },
    },
    {
      path: '/certificates/:challengeId',
      name: 'certificates',
      component: () => import('@/views/CertificateView.vue'),
      meta: { title: 'Certificates' },
    },
    { path: '/:pathMatch(.*)*', name: '404', component: NotFoundView },
  ],
})

// a challenge's URL opens it: this device remembers it as its current one, and a private one
// unlocks (it's how its link works)
router.beforeEach((to) => {
  if (tabNames.includes(String(to.name)) && to.params.challengeId) {
    const store = useAppStore()
    const id = String(to.params.challengeId)
    if (id !== store.challengeId || !store.currentChallenge) store.openChallenge(id)
  }
})

export default router
