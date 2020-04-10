import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '@/views/Home.vue';
import Activity from '@/views/Activity.vue';
import NewEntry from '@/views/NewEntry.vue';
import Statistics from '@/views/Statistics.vue';

Vue.use(VueRouter);

const title = 'challenge';
const routes = [
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
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

router.beforeEach(async (to, from, next) => {
  if (to?.meta?.title) {
    document.title = to.meta.title;
  }
  return next();
});

export default router;
