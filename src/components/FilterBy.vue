<template>
  <v-menu max-width="400" offset-y :close-on-content-click="false">
    <template #activator="{ on }">
      <v-btn icon v-on="on">
        <v-badge :value="currentCountryIds.length || dirty" dot overlap>
          <v-icon>mdi-filter-variant</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-sheet class="pb-4">
      <v-subheader>Filter by</v-subheader>
      <Picker
        v-model="currentCountryIds"
        label="Country"
        outlined
        rounded
        clearable
        multiple
        dense
        hide-details
        placeholder="All Countries"
        :menu-props="{ width: '100%', offsetY: true }"
        :hide-no-data="false"
        :items="relevantCountries"
        :item-value="idKey"
        item-text="$name"
        class="mx-4"
      />

      <slot />
    </v-sheet>
  </v-menu>
</template>

<script>
import Vue from 'vue';
import { availableCountries } from '@/services/country';
import { idKey } from '@/plugins/firebase';
import Picker from '@/components/Picker.vue';

export default Vue.extend({
  name: 'FilterBy',
  props: {
    countryIds: Array,
    groups: Array,
    dirty: Boolean,
  },
  data() {
    return {
      idKey,
      availableCountries,
    };
  },
  computed: {
    countryCodes() {
      return (this.groups || [])
        .map(({ country }) => country)
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);
    },
    relevantCountries() {
      return this.availableCountries
        .filter(({ [idKey]: code }) => this.countryCodes.includes(code));
    },
    currentCountryIds: {
      get() {
        return this.countryIds;
      },
      set(countryIds) {
        this.$emit('update:country-ids', countryIds);
      },
    },
  },
  components: {
    Picker,
  },
});
</script>
