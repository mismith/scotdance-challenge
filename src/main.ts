import Vue from 'vue';
// eslint-disable-next-line
// @ts-ignore
import VueLocalStorage from 'vue-localstorage';
// eslint-disable-next-line
// @ts-ignore
import VueInfiniteScroll from 'vue-infinite-scroll';
import App from './App.vue';
import router from './router';
import store from './store';
import vuetify from './plugins/vuetify';

Vue.config.productionTip = false;

Vue.use(VueLocalStorage, {
  namespace: 'scotdance-challenge',
  bind: true,
});
Vue.use(VueInfiniteScroll);

new Vue({
  router,
  store,
  vuetify,
  data: () => ({
    labels: {
      Challenge: 'Challenge',
      Group: 'Studio',
      Participant: 'Dancer',
      Entry: 'Entry',
    },
  }),
  computed: {
    isDebugging() {
      return window.location.hostname === 'localhost';
    },
  },
  render: (h) => h(App),
}).$mount('#app');
