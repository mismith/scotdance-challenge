<template>
  <div class="NewEntry flex-page">
    <v-form class="px-4 py-6" @submit.prevent="handleNewEntry()">
      <Picker
        v-model="groupId"
        :label="$root.labels.Group"
        outlined
        rounded
        clearable
        :items="relevantGroups"
        item-text="name"
        :item-value="idKey"
        :disabled="!has('challenge')"
        :add-new="name => handleAdd({
          name: capitalize(name),
          color: colors[relevantGroups.length % colors.length],
          challengeId: this.challengeId,
        }, 'groups')"
      />
      <Picker
        v-model="participantId"
        :label="$root.labels.Participant"
        outlined
        rounded
        clearable
        :items="relevantParticipants"
        item-text="name"
        :item-value="idKey"
        :disabled="!has('challenge', 'group')"
        :add-new="name => handleAdd({
          name: capitalize(name),
          challengeId: this.challengeId,
          groupId: this.groupId,
        }, 'participants')"
      />
      <v-text-field
        v-model="value"
        type="number"
        min="0"
        rounded
        outlined
        :placeholder="`Add New ${$root.labels.Entry}`"
        :disabled="!has('challenge', 'group', 'participant')"
        :error="value !== null && value <= 0"
      />

      <v-btn
        type="submit"
        rounded
        x-large
        block
        color="primary"
        :disabled="!(has('challenge', 'group', 'participant') && value > 0)"
        :loading="adding"
      >
        Submit
      </v-btn>
    </v-form>

    <v-spacer />

    <footer class="d-flex justify-center pa-6">
      <v-btn icon large color="primary" @click="isSubmittingCompliment = true">
        <v-icon>mdi-heart-outline</v-icon>
      </v-btn>

      <v-dialog v-model="isSubmittingCompliment" max-width="300">
        <v-card>
          <v-form @submit.prevent="handleNewCompliment()">
            <v-card-title>
              <div class="flex">
                Spread the Love
                <v-icon color="primary" class="ml-1 mt-n1">mdi-heart</v-icon>
              </div>
              <v-btn icon class="mr-n2" @click="isSubmittingCompliment = false">
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
            <v-card-actions class="justify-center">
              <v-btn
                type="submit"
                rounded
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
    </footer>

    <v-snackbar v-model="isSuccess">
      <div class="title ma-auto" style="text-transform: capitalize;">
        {{ successMessage }}!
      </div>
    </v-snackbar>
  </div>
</template>

<script>
import Vue from 'vue';
import palette from 'vuetify/lib/util/colors';
import {
  firestore,
  idKey,
  findByIdKey,
} from '@/plugins/firebase';
import Picker from '@/components/Picker.vue';

export default Vue.extend({
  name: 'NewEntry',
  props: {
    firestoreRefs: Object,
    challenges: Array,
    groups: Array,
    participants: Array,
    entries: Array,
    compliments: Array,
    loading: Boolean,
    currentChallengeId: String,
  },
  localStorage: {
    groupId: {
      type: String,
    },
    participantId: {
      type: String,
    },
  },
  data() {
    return {
      idKey,
      colors: [
        'red',
        'orange',
        'yellow',
        'green',
        'blue',
        'indigo',
        'purple',
      ].map((color) => palette[color].base),

      value: undefined,
      adding: false,
      successMessage: undefined,

      isSubmittingCompliment: false,
      newCompliment: undefined,
      submitting: false,
    };
  },
  computed: {
    challengeId() {
      return this.currentChallengeId;
    },

    relevantChallenges() {
      return this.challenges;
    },
    relevantGroups() {
      return this.groups.filter(({ challengeId }) => challengeId === this.challengeId);
    },
    relevantParticipants() {
      return this.participants.filter(({ challengeId, groupId }) => (
        challengeId === this.challengeId && groupId === this.groupId
      ));
    },

    isSuccess: {
      get() {
        return Boolean(this.successMessage);
      },
      set(on) {
        if (!on) this.successMessage = null;
      },
    },
  },
  watch: {
    challengeId() {
      this.groupId = null;
      this.participantId = null;
    },
    groupId() {
      this.participantId = null;
    },

    async newCompliment(newCompliment) {
      this.successMessage = null;
      await this.$nextTick();
      this.successMessage = this.toCompliment(newCompliment);
    },
  },
  methods: {
    has(...keys) {
      return keys.every((key) => findByIdKey(
        this[`relevant${key[0].toUpperCase()}${key.split('').slice(1).join('')}s`],
        this[`${key}Id`],
      ));
    },
    getRandomCompliment() {
      return this.compliments[Math.round(Math.random() * this.compliments.length - 1)];
    },
    capitalize(text) {
      let str = (text || '').trim();
      if (str) {
        str = str.split(' ');
        for (let i = 0, x = str.length; i < x; i += 1) {
          str[i] = str[i][0].toUpperCase() + str[i].substr(1);
        }
        return str.join(' ');
      }
      return str;
    },

    async handleAdd(item, refKey) {
      return this.firestoreRefs[refKey].add(item);
    },
    async handleNewEntry() {
      try {
        this.adding = true;
        await this.firestoreRefs.entries.add({
          challengeId: this.challengeId,
          groupId: this.groupId,
          participantId: this.participantId,
          value: Number(this.value),
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        this.value = null;

        this.successMessage = this.getRandomCompliment().text;
      } finally {
        setTimeout(() => {
          this.adding = false;
        }, 500);
      }
    },

    toCompliment(text) {
      return (text || '').trim().toLowerCase().replace(/!$/, '');
    },
    async handleNewCompliment() {
      try {
        this.submitting = true;
        await this.firestoreRefs.complimentsSubmitted.add({
          text: this.toCompliment(this.newCompliment),
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        this.newCompliment = null;
        this.isSubmittingCompliment = false;

        this.successMessage = null;
        await this.$nextTick();
        this.successMessage = 'thanks';
      } finally {
        setTimeout(() => {
          this.submitting = false;
        }, 500);
      }
    },
  },
  components: {
    Picker,
  },
});
</script>

<style lang="scss">
.NewEntry {
  .v-snack {
    margin-bottom: 64px;
  }
}
</style>
