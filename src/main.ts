import Vue from 'vue';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import VueLocalStorage from 'vue-localstorage';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import VueInfiniteScroll from 'vue-infinite-scroll';
import { Promised } from 'vue-promised';
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
Vue.component('Promised', Promised);

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

      Country: 'Country',
    },
  }),
  render: (h) => h(App),
}).$mount('#app');
