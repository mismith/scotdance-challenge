<template>
  <v-dialog v-model="isOpen" max-width="320">
    <v-card class="EditGroup">
      <v-form autocomplete="off" @submit.prevent="handleSubmit()">
        <v-card-title>
          <div class="flex">
            {{ isNew ? 'Add' : 'Edit' }} {{ $root.getLabel('Group') }}
          </div>
          <v-btn icon class="mr-n1" @click="isOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text v-if="group">
          <v-text-field
            v-model="group.name"
            label="Name *"
            outlined
            rounded
            required
          />
          <v-text-field
            v-model="group.color"
            label="Color"
            outlined
            rounded
            @click="isPickingColor = true"
          >
            <template #append>
              <v-menu
                v-model="isPickingColor"
                :close-on-content-click="false"
                left
                :nudge-bottom="16"
                :nudge-right="20"
                offset-y
              >
                <template #activator="{ on }">
                  <v-avatar size="32" :color="group.color" v-on="on" />
                </template>
                <v-card>
                  <v-color-picker v-model="group.color" hide-inputs flat :canvas-height="100" />
                  <v-card-actions class="justify-end">
                    <v-btn text @click="isPickingColor = false">Done</v-btn>
                  </v-card-actions>
                </v-card>
              </v-menu>
            </template>
          </v-text-field>
          <Picker
            v-if="showField('country')"
            v-model="group.country"
            :label="$root.getLabel('Country')"
            outlined
            rounded
            :menu-props="{ maxWidth: 288 }"
            :hide-no-data="false"
            :items="availableCountries"
            :item-value="idKey"
            item-text="$name"
          />

          <div class="d-flex flex-wrap">
            <v-chip
              v-if="!showField('country')"
              small
              class="mr-1 mb-1"
              @click="showField('country', true)"
            >
              <v-icon left small>mdi-plus</v-icon>
              Country
            </v-chip>
          </div>
        </v-card-text>
        <v-card-actions class="justify-center pt-0 pa-4">
          <v-btn
            type="submit"
            rounded
            block
            x-large
            color="primary"
            :disabled="!isValid"
          >
            {{ isNew ? 'Add' : 'Save' }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script>
import Vue from 'vue';
import get from 'lodash.get';
import { availableCountries, fetchCountryCode } from '@/services/country';
import { idKey } from '@/plugins/firebase';
import Picker from '@/components/Picker.vue';

export default Vue.extend({
  name: 'EditGroup',
  components: {
    Picker,
  },
  props: {
    value: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      idKey,
      availableCountries,
      group,
      isPickingColor: false,
      showFields: {},
    };
  },
  computed: {
    isOpen: {
      get() {
        return this.value;
      },
      set(isOpen) {
        if (!isOpen) {
          this.$emit('input', null);
        }
      },
    },
    isNew() {
      return this.value && !this.value[idKey];
    },
    isValid() {
      if (this.group) {
        if (!this.group.name || !this.group.name.trim()) return false;
        if (!this.group.color || !/^#[a-f0-9]{6}$/i.test(this.group.color.trim())) return false;
      }
      return true;
    },
  },
  watch: {
    value: {
      handler(value) {
        this.group = { ...value };
      },
      immediate: true,
    },
    isOpen(isOpen) {
      if (!isOpen) {
        this.group = {};
        this.isPickingColor = false;
        this.showFields = {};
      }
    },
  },
  methods: {
    async autoFillCountry() {
      if (this.group && this.group.country === undefined) {
        this.$set(this.group, 'country', null);
        const country = await fetchCountryCode();
        if (!this.group.country) {
          this.$set(this.group, 'country', country);
        }
      }
    },
    showField(field, set = undefined) {
      if (set !== undefined) {
        this.$set(this.showFields, field, set);

        if (set) {
          this.autoFillCountry();
        }
      }
      return get(this.showFields, field, false);
    },

    handleSubmit() {
      this.$emit('add', this.group);
    },
  },
});
</script>

<style lang="scss">
.EditGroup {
  .v-text-field {
    .v-avatar {
      margin-top: -5px;
      margin-right: -11px;
    }
  }
}
</style>
