import Vue from 'vue';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import VueLocalStorage from 'vue-localstorage';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import VueInfiniteScroll from 'vue-infinite-scroll';
import get from 'lodash.get';

import { $package } from '@/config';
import router from '@/router';
import store, { State } from '@/store';
import vuetify from '@/plugins/vuetify';
import { firebase } from '@/plugins/firebase';
import App from '@/App.vue';

Vue.config.productionTip = false;

Vue.use(VueLocalStorage, {
  namespace: $package.name,
  bind: true,
});
Vue.use(VueInfiniteScroll);

new Vue({
  router,
  store,
  vuetify,
  methods: {
    getLabel(key: keyof State['labels']) {
      return get(store.getters.currentChallenge, ['labels', key]) || store.state.labels[key] || '';
    },
  },
  created() {
    firebase.auth().onAuthStateChanged((me) => {
      store.commit('setMe', me);
    });
    try {
      firebase.auth().signInAnonymously();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(error);
    }
  },
  render: (h) => h(App),
}).$mount('#app');
