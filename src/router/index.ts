import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ChallengeShell from '@/components/ChallengeShell.vue'
import ActivityView from '@/views/ActivityView.vue'
import ExploreView from '@/views/ExploreView.vue'
import NewEntryView from '@/views/NewEntryView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import StatisticsView from '@/views/StatisticsView.vue'

const title = 'challenge'
const tabNames = ['new', 'activity', 'statistics']

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
    if (tabNames.includes(String(to.name)) && tabNames.includes(String(from.name))) return false
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'home', component: ExploreView, meta: { title } },
    // one shell (header and tabs) around all three tabs, so it stays put while they switch:
    // keyboard focus stays on the tab just pressed. Listed after home, which wins on '/'
    {
      path: '/',
      component: ChallengeShell,
      children: [
        { path: 'new', name: 'new', component: NewEntryView, meta: { title: `Log • ${title}` } },
        {
          path: 'activity',
          name: 'activity',
          component: ActivityView,
          meta: { title: `Activity • ${title}` },
        },
        {
          path: 'statistics',
          name: 'statistics',
          component: StatisticsView,
          meta: { title: `Stats • ${title}` },
        },
      ],
    },
    {
      path: '/private/:challengeId',
      name: 'private',
      redirect: ({ params }) => {
        useAppStore().openChallengeLink(String(params.challengeId), true)
        return { name: 'new', params: {} }
      },
    },
    {
      path: '/public/:challengeId',
      name: 'public',
      redirect: ({ params }) => {
        useAppStore().openChallengeLink(String(params.challengeId), false)
        return { name: 'new', params: {} }
      },
    },
    { path: '/:pathMatch(.*)*', name: '404', component: NotFoundView },
  ],
})

router.afterEach((to) => {
  if (typeof to.meta.title === 'string') document.title = to.meta.title
})

export default router
