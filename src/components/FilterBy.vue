<template>
  <v-menu max-width="400" offset-y :close-on-content-click="false">
    <template #activator="{ on }">
      <v-btn icon v-on="on">
        <v-badge :value="isDirty" dot overlap>
          <v-icon>mdi-filter-variant</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-form autocomplete="off">
      <v-sheet class="pb-4">
        <v-subheader>Filter by</v-subheader>
        <Picker
          v-if="allGroups"
          v-model="currentCountryIds"
          :label="$root.getLabel('Country')"
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
        <Picker
          v-if="filteredGroups"
          v-model="currentGroupIds"
          :label="$root.getLabel('Group')"
          outlined
          rounded
          clearable
          multiple
          dense
          hide-details
          :placeholder="`All ${$root.getLabel('Group')}s`"
          :menu-props="{ width: '100%', offsetY: true }"
          :hide-no-data="false"
          :items="filteredGroups"
          :item-value="idKey"
          item-text="$name"
          class="mt-4 mx-4"
        />
        <v-text-field
          v-if="searchable"
          type="search"
          v-model="currentSearchQuery"
          :label="$root.getLabel('Participant')"
          outlined
          rounded
          clearable
          multiple
          dense
          hide-details
          placeholder="Search"
          class="mt-4 mx-4"
        />

        <slot />
      </v-sheet>
    </v-form>
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
    allGroups: Array,
    countryIds: Array,

    filteredGroups: Array,
    groupIds: Array,

    searchable: Boolean,
    searchQuery: String,
  },
  data() {
    return {
      idKey,
    };
  },
  computed: {
    countryCodes() {
      return (this.allGroups || [])
        .map(({ country }) => country)
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);
    },
    relevantCountries() {
      return availableCountries
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

    currentGroupIds: {
      get() {
        return this.groupIds;
      },
      set(groupIds) {
        this.$emit('update:group-ids', groupIds);
      },
    },

    currentSearchQuery: {
      get() {
        return this.searchQuery;
      },
      set(searchQuery) {
        this.$emit('update:searchQuery', searchQuery);
      },
    },

    isDirty() {
      return (this.currentCountryIds && this.currentCountryIds.length)
        || (this.currentGroupIds && this.currentGroupIds.length)
        || (this.searchable && this.currentSearchQuery);
    },
  },
  components: {
    Picker,
  },
});
</script>
