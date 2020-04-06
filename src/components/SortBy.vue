<template>
  <v-menu min-width="128" offset-y>
    <template #activator="{ on }">
      <v-btn icon v-on="on"><v-icon>mdi-sort-variant</v-icon></v-btn>
    </template>

    <v-list>
      <v-subheader>Sort by</v-subheader>
      <v-list-item
        v-for="by in items"
        :key="by.name"
        :class="{ 'v-list-item--active': value === by[idKey] }"
        @click="$emit('input', by[idKey])"
      >
        {{ by.name }}
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
import Vue from 'vue';
import { idKey } from '@/plugins/firebase';

export default Vue.extend({
  name: 'SortBy',
  props: {
    value: String,
    items: Array,
  },
  data() {
    return {
      idKey,
    };
  },
});
</script>
