import Vue from 'vue';

declare module '*.vue' {
  export default Vue;
}

declare module 'vue/types/vue' {
  interface VueConstructor {
    localStorage: any;
  }
}
declare module 'vue/types/options' {
  interface ComponentOptions<V extends Vue> {
    localStorage?: any;
  }
}

declare global {
  interface Window {
    $crisp: any;
  }
}
