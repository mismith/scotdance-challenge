import Vue from 'vue';
// eslint-disable-next-line
// @ts-ignore
import VueLocalStorage from 'vue-localstorage';
import App from './App.vue';
import router from './router';
import store from './store';
import vuetify from './plugins/vuetify';

Vue.config.productionTip = false;

Vue.use(VueLocalStorage, {
  namespace: 'scotdance-challenge',
  bind: true,
});

new Vue({
  router,
  store,
  vuetify,
  render: (h) => h(App),
}).$mount('#app');
