<template>
  <v-app class="App">
    <v-content>
      <router-view />
    </v-content>

    <v-bottom-navigation app grow>
      <v-btn :to="{ name: 'activity' }">
        <span>Activity</span>
        <v-icon>mdi-progress-clock</v-icon>
      </v-btn>
      <v-btn depressed x-large color="primary" :to="{ name: 'new' }">
        <span>New Entry</span>
        <v-icon>mdi-plus</v-icon>
      </v-btn>
      <v-btn :to="{ name: 'statistics' }">
        <span>Stats</span>
        <v-icon>mdi-chart-line-variant</v-icon>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'App',
});
</script>

<style lang="scss">
.App {
  .v-bottom-navigation {
    .v-btn {
      height: inherit !important;

      &.v-size--x-large {
        height: 110% !important;
        align-self: flex-end;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;

        &.primary {
          color: #fff !important;
        }
      }
    }
  }
}
</style>
