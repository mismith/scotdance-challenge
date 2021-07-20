<template>
  <div class="AddCompliment">
    <v-btn icon large color="primary" @click="isOpen = true">
      <v-icon>mdi-heart-outline</v-icon>
    </v-btn>

    <v-dialog v-model="isOpen" max-width="300">
      <v-card>
        <v-form @submit.prevent="handleAddCompliment()">
          <v-card-title>
            <div class="flex">
              Spread the Love
              <v-icon color="primary" class="ml-1 mt-n1">mdi-heart</v-icon>
            </div>
            <v-btn icon class="mr-n2" @click="isOpen = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <p>
              Want to help motivate others?<br />
              Add your own positivity to the mix!
            </p>

            <v-text-field
              v-model="newCompliment"
              label="Your Praise"
              placeholder="e.g. well done"
              rounded
              outlined
              hide-details
              class="mt-6 mb-2"
            />
          </v-card-text>
          <v-card-actions class="justify-center pt-0 pa-4">
            <v-btn
              type="submit"
              rounded
              block
              x-large
              color="primary"
              :disabled="!toCompliment(newCompliment)"
              :loading="submitting"
            >
              Submit
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import Vue from 'vue';
import { firestore, db, idKey } from '@/plugins/firebase';

export default Vue.extend({
  name: 'AddCompliment',
  data() {
    return {
      idKey,

      isOpen: false,
      newCompliment: undefined,
      submitting: false,
      debounceTimeout: undefined,
    };
  },
  watch: {
    async newCompliment(newCompliment) {
      await this.handleInput(this.toCompliment(newCompliment));
    },
    isOpen(isOpen) {
      if (!isOpen) {
        this.newCompliment = null;
      }
    },
  },
  methods: {
    toast(message, delay = 0) {
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }
      this.debounceTimeout = setTimeout(async () => {
        this.$emit('input', message);
      }, delay);
    },
    handleInput(value) {
      if (value) {
        this.$emit('input', null);
        this.toast(value, 1000);
      }
    },
    toCompliment(text) {
      return (text || '').trim().toLowerCase().replace(/!$/, '');
    },
    async handleAddCompliment() {
      try {
        this.submitting = true;
        const text = this.toCompliment(this.newCompliment);
        await db.collection('complimentsSubmitted').add({
          text,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        this.newCompliment = null;
        this.isOpen = false;

        if (window.$crisp) {
          window.$crisp.push(['do', 'message:send', [
            'text',
            `Compliment Submitted: ${text}`,
          ]]);
        }
      } finally {
        this.submitting = false;
        this.toast('submitted 🙇 thank you', 300);
      }
    },
  },
});
</script>
