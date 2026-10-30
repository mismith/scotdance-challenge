import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ChallengeShell from '@/components/ChallengeShell.vue'
import ActivityView from '@/views/ActivityView.vue'
import ExploreView from '@/views/ExploreView.vue'
import NewEntryView from '@/views/NewEntryView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import StatisticsView from '@/views/StatisticsView.vue'

const title = 'challenge'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
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
