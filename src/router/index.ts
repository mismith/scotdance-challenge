import Vue from 'vue';
import VueRouter from 'vue-router';
import Challenges from '@/views/Challenges.vue';
import Groups from '@/views/Groups.vue';
import Participants from '@/views/Participants.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    redirect: '/challenges',
  },
  {
    path: '/challenges',
    name: 'challenges',
    component: Challenges,
    children: [
      {
        path: ':challengeId/groups',
        name: 'groups',
        component: Groups,
        children: [
          {
            path: ':groupId/participants',
            name: 'participants',
            component: Participants,
            children: [
              {
                path: ':participantId/entries',
                name: 'entries',
              },
            ],
          },
        ],
      },
    ],
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
