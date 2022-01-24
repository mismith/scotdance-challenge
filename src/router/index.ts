import Vue from 'vue';
import VueRouter from 'vue-router';
import store from '@/store';
import Home from '@/views/Home.vue';
import Activity from '@/views/Activity.vue';
import NewEntry from '@/views/NewEntry.vue';
import Statistics from '@/views/Statistics.vue';

Vue.use(VueRouter);

const title = 'challenge';
const router = new VueRouter({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      meta: {
        title,
      },
    },
    {
      path: '/activity',
      name: 'activity',
      component: Activity,
      meta: {
        title: `Activity • ${title}`,
      },
    },
    {
      path: '/new',
      name: 'new',
      component: NewEntry,
      meta: {
        title: `New • ${title}`,
      },
    },
    {
      path: '/statistics',
      name: 'statistics',
      component: Statistics,
      meta: {
        title: `Stats • ${title}`,
      },
    },
    {
      path: '/private/:challengeId',
      name: 'private',
      beforeEnter({ params: { challengeId } }, from, next) {
        store.dispatch('addPrivateId', challengeId);
        store.state.challengeId = challengeId; // @HACK: is this allowed/dependable?
        return next({ name: 'new' });
      },
    },
    {
      path: '/public/:challengeId',
      name: 'public',
      beforeEnter({ params: { challengeId } }, from, next) {
        store.state.challengeId = challengeId; // @HACK: is this allowed/dependable?
        return next({ name: 'new' });
      },
    },
    {
      path: '*',
      name: '404',
      component: {
        render: (h) => h('h1', { class: 'ma-auto' }, 'Not Found'),
      },
    },
  ],
});

router.beforeEach(async (to, from, next) => {
  if (to?.meta?.title) {
    document.title = to.meta.title;
  }
  return next();
});

export default router;
