import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ActivityView from '@/views/ActivityView.vue'
import HomeView from '@/views/HomeView.vue'
import NewEntryView from '@/views/NewEntryView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import StatisticsView from '@/views/StatisticsView.vue'

const title = 'challenge'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title } },
    {
      path: '/activity',
      name: 'activity',
      component: ActivityView,
      meta: { title: `Activity • ${title}` },
    },
    { path: '/new', name: 'new', component: NewEntryView, meta: { title: `New • ${title}` } },
    {
      path: '/statistics',
      name: 'statistics',
      component: StatisticsView,
      meta: { title: `Stats • ${title}` },
    },
    {
      path: '/private/:challengeId',
      name: 'private',
      redirect: ({ params }) => {
        useAppStore().openChallengeLink(String(params.challengeId), true)
        return { name: 'new' }
      },
    },
    {
      path: '/public/:challengeId',
      name: 'public',
      redirect: ({ params }) => {
        useAppStore().openChallengeLink(String(params.challengeId), false)
        return { name: 'new' }
      },
    },
    { path: '/:pathMatch(.*)*', name: '404', component: NotFoundView },
  ],
})

router.afterEach((to) => {
  if (typeof to.meta.title === 'string') document.title = to.meta.title
})

export default router
