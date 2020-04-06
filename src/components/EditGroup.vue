<template>
  <v-dialog v-model="isOpen" max-width="320">
    <v-card class="EditGroup">
      <v-form @submit.prevent="handleDone()">
        <v-card-title>
          <div class="flex">
            {{ isNew ? 'Add' : 'Edit' }} {{ $root.labels.Group }}
          </div>
          <v-btn icon class="mr-n1" @click="isOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text v-if="value">
          <v-text-field
            v-model="value.name"
            label="Name"
            outlined
            rounded
            required
          />
          <v-text-field
            v-model="value.color"
            label="Color"
            outlined
            rounded
            required
            @click="isPickingColor = true"
          >
            <template #append>
              <v-menu
                v-model="isPickingColor"
                :close-on-content-click="false"
                left
                :nudge-right="20"
                offset-y
              >
                <template #activator="{ on }">
                  <v-avatar size="32" :color="value.color" v-on="on" />
                </template>
                <v-card>
                  <v-color-picker v-model="value.color" hide-inputs flat :canvas-height="100" />
                  <v-card-actions class="justify-end">
                    <v-btn text @click="isPickingColor = false">Done</v-btn>
                  </v-card-actions>
                </v-card>
              </v-menu>
            </template>
          </v-text-field>
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
import { idKey } from '@/plugins/firebase';

export default Vue.extend({
  name: 'EditGroup',
  props: {
    value: Object,
  },
  data() {
    return {
      idKey,

      isPickingColor: false,
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
      if (this.value) {
        if (!this.value.name || !this.value.name.trim()) return false;
        if (!this.value.color || !/^#[a-f0-9]{6}$/i.test(this.value.color.trim())) return false;
      }
      return true;
    },
  },
  watch: {
    isOpen(isOpen) {
      if (!isOpen) {
        this.isPickingColor = false;
      }
    },
  },
  methods: {
    handleDone() {
      this.$emit('done', this.value);
      this.$emit('input', null);
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
