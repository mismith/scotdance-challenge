<template>
  <div class="NewEntry flex-page">
    <v-form class="px-4 py-6" @submit.prevent="handleAddEntry()">
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
        :add-new="name => groupToEdit = {
          name: capitalize(name),
          color: colors[relevantGroups.length % colors.length],
          challengeId: this.challengeId,
        }"
      />
      <EditGroup
        v-model="groupToEdit"
        @done="group => handleAdd(group, 'groups')"
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
        :loading="isAddEntryLoading"
      >
        Submit
      </v-btn>
    </v-form>

    <v-spacer />
    <AddCompliment
      :firestore-refs="firestoreRefs"
      :compliments="compliments"
      class="d-flex justify-center pa-6"
      @input="msg => successMessage = msg"
    />

    <v-snackbar v-model="hasSuccessMessage">
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
import EditGroup from '@/components/EditGroup.vue';
import AddCompliment from '@/components/AddCompliment.vue';

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

      groupToEdit: undefined,

      value: undefined,
      isAddEntryLoading: false,
      successMessage: undefined,
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

    hasSuccessMessage: {
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
  },
  methods: {
    has(...keys) {
      return keys.every((key) => findByIdKey(
        this[`relevant${key[0].toUpperCase()}${key.split('').slice(1).join('')}s`],
        this[`${key}Id`],
      ));
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
    async handleAddEntry() {
      try {
        this.isAddEntryLoading = true;
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
          this.isAddEntryLoading = false;
        }, 500);
      }
    },
  },
  components: {
    Picker,
    EditGroup,
    AddCompliment,
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
