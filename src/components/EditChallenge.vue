<template>
  <v-dialog v-model="isOpen" max-width="320">
    <v-card class="EditChallenge">
      <v-form autocomplete="off" @submit.prevent="handleDone()">
        <v-card-title>
          <div class="flex">
            {{ isNew ? 'Add' : 'Edit' }} {{ $root.getLabel('Challenge') }}
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
          <v-menu
            v-model="isPickingStartAt"
            :close-on-content-click="false"
            offset-y
            nudge-top="24"
            min-width="290"
          >
            <template v-slot:activator="{ on }">
              <v-text-field
                v-model="value.startAt"
                label="Start Date"
                outlined
                rounded
                clearable
                readonly
                append-icon="mdi-calendar"
                @click:append="isPickingStartAt = true"
                v-on="on"
              />
            </template>
            <v-date-picker
              v-model="value.startAt"
              no-title
              @input="isPickingStartAt = false"
            />
          </v-menu>
          <v-menu
            v-model="isPickingEndAt"
            :close-on-content-click="false"
            offset-y
            nudge-top="24"
            min-width="290"
          >
            <template v-slot:activator="{ on }">
              <v-text-field
                v-model="value.endAt"
                label="End Date"
                outlined
                rounded
                clearable
                readonly
                append-icon="mdi-calendar"
                @click:append="isPickingEndAt = true"
                v-on="on"
              />
            </template>
            <v-date-picker
              v-model="value.endAt"
              no-title
              @input="isPickingEndAt = false"
            />
          </v-menu>
          <v-switch
            v-model="value.private"
            inset
            class="v-input--reverse mt-0 pa-0"
          >
            <template #label>
              <div class="ml-1 mr-2">
                Private
              </div>
              <v-tooltip top max-width="296">
                <template #activator="{ on }">
                  <v-icon small @click.stop v-on="on">mdi-help-circle-outline</v-icon>
                </template>
                <div>
                  Private challenges must be 'unlocked' by each participant via an Access Link,
                  so they are ideal when entries are limited to specific participants.
                </div>
              </v-tooltip>
              <v-icon class="ml-auto">mdi-shield-lock</v-icon>
            </template>
          </v-switch>
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
      isPickingStartAt: false,
      isPickingEndAt: false,
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
