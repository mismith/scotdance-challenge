<template>
  <div class="NewEntry flex-page">
    <v-form class="px-4 py-6" @submit.prevent="handleNewEntry()">
      <Picker
        v-model="challengeId"
        label="Challenge"
        outlined
        rounded
        :items="relevantChallenges"
        item-text="name"
        :item-value="idKey"
        :add-new="name => handleAdd({ name }, 'challenges')"
      />
      <Picker
        v-model="groupId"
        label="Group"
        outlined
        rounded
        :items="relevantGroups"
        item-text="name"
        :item-value="idKey"
        :disabled="!has('challenge')"
        :add-new="name => handleAdd({ name, challengeId: this.challengeId }, 'groups')"
      />
      <Picker
        v-model="participantId"
        label="Participant"
        outlined
        rounded
        :items="relevantParticipants"
        item-text="name"
        :item-value="idKey"
        :disabled="!has('challenge', 'group')"
        :add-new="name => handleAdd({
          name,
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
        placeholder="Add New Entry"
        :disabled="!has('challenge', 'group', 'participant')"
      />

      <v-btn
        type="submit"
        rounded
        x-large
        block
        color="primary"
        :disabled="!(has('challenge', 'group', 'participant') && value)"
        :loading="loading"
      >
        Submit
      </v-btn>
    </v-form>
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
      loading: false,
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
  },
  watch: {
    relevantChallenges(challenges) {
      if (challenges && challenges.length === 1) {
        this.challengeId = challenges[0][idKey];
      }
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
    async handleAdd(item, refKey) {
      return this.firestoreRefs[refKey].add(item);
    },
    async handleNewEntry() {
      try {
        this.loading = true;
        await this.firestoreRefs.entries.add({
          challengeId: this.challengeId,
          groupId: this.groupId,
          participantId: this.participantId,
          value: Number(this.value),
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        this.value = null;
      } finally {
        setTimeout(() => {
          this.loading = false;
        }, 500);
      }
    },
  },
  components: {
    Picker,
  },
});
</script>
