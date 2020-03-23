<template>
  <v-app>
    <v-content>
      <router-view />

      <v-bottom-navigation app grow>
        <v-btn :to="{ name: 'new' }">
          <span>New Entry</span>
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </v-bottom-navigation>
    </v-content>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'App',
});
</script>
