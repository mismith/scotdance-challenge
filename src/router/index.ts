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
  base: process.env.BASE_URL,
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
      path: '/private/:privateId',
      name: 'private',
      beforeEnter({ params: { privateId } }, from, next) {
        store.dispatch('addPrivateId', privateId);
        store.state.challengeId = privateId; // @HACK: is this allowed/dependable?
        return next({ name: 'new' });
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
