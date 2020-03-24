import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '@/views/Home.vue';
import Activity from '@/views/Activity.vue';
import NewEntry from '@/views/NewEntry.vue';
import Statistics from '@/views/Statistics.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
  },
  {
    path: '/activity',
    name: 'activity',
    component: Activity,
  },
  {
    path: '/new',
    name: 'new',
    component: NewEntry,
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: Statistics,
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
