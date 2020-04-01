<template>
  <div class="NewEntry flex-page">
    <v-form class="px-4 py-6" @submit.prevent="handleNewEntry()">
      <Picker
        v-model="challengeId"
        :label="$root.labels.Challenge"
        outlined
        rounded
        clearable
        autocapitalize="words"
        :items="relevantChallenges"
        item-text="name"
        :item-value="idKey"
        :add-new="name => handleAdd({
          name: trim(name),
        }, 'challenges')"
      />
      <Picker
        v-model="groupId"
        :label="$root.labels.Group"
        outlined
        rounded
        clearable
        autocapitalize="words"
        :items="relevantGroups"
        item-text="name"
        :item-value="idKey"
        :disabled="!has('challenge')"
        :add-new="name => handleAdd({
          name: trim(name),
          challengeId: this.challengeId,
        }, 'groups')"
      />
      <Picker
        v-model="participantId"
        :label="$root.labels.Participant"
        outlined
        rounded
        clearable
        autocapitalize="words"
        :items="relevantParticipants"
        item-text="name"
        :item-value="idKey"
        :disabled="!has('challenge', 'group')"
        :add-new="name => handleAdd({
          name: trim(name),
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
        autocapitalize="words"
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

    <v-snackbar
      v-model="isSuccess"
      :timeout="3000"
    >
      <div class="title ma-auto" style="text-transform: capitalize;">
        {{ successMessage }}!
      </div>
    </v-snackbar>
  </div>
</template>

<script>
import Vue from 'vue';
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
  },
  localStorage: {
    challengeId: {
      type: String,
      default: '',
    },
    groupId: {
      type: String,
      default: '',
    },
    participantId: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      idKey,

      value: undefined,
      adding: false,
      successMessage: undefined,
    };
  },
  computed: {
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
    relevantChallenges: {
      handler(challenges) {
        if (challenges && challenges.length === 1) {
          this.challengeId = challenges[0][idKey];
        }
      },
      immediate: true,
    },
    challengeId() {
      this.groupId = null;
      this.participantId = null;
    },
    groupId() {
      this.participantId = null;
    },
  },
  methods: {
    has(...keys) {
      return keys.every((key) => findByIdKey(this[`relevant${key[0].toUpperCase()}${key.split('').slice(1).join('')}s`], this[`${key}Id`]));
    },
    getRandomCompliment() {
      return this.compliments[Math.round(Math.random() * this.compliments.length - 1)];
    },
    trim(text) {
      return (text || '').trim();
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
