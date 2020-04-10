<template>
  <v-dialog v-model="isOpen" max-width="320">
    <v-card class="EditChallenge">
      <v-form autocomplete="off" @submit.prevent="handleDone()">
        <v-card-title>
          <div class="flex">
            {{ isNew ? 'Add' : 'Edit' }} {{ $root.labels.Challenge }}
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
  name: 'EditChallenge',
  props: {
    value: Object,
  },
  data() {
    return {
      idKey,
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
      }
      return true;
    },
  },
  methods: {
    handleDone() {
      this.$emit('done', this.value);
      this.$emit('input', null);
    },
  },
  components: {
  },
});
</script>

<style lang="scss">
</style>
