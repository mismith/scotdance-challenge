<template>
  <div class="NewEntry flex-page">
    <Loader v-if="loading" class="ma-auto" />
    <template v-else>
      <v-form autocomplete="off" class="px-4 py-6" @submit.prevent="handleAddEntry()">
        <Picker
          v-model="groupId"
          :label="$root.labels.Group"
          outlined
          rounded
          clearable
          :items="relevantGroups"
          item-text="$name"
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
          @done="group => handleAddGroup(group)"
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
        class="d-flex justify-center pa-6"
        @input="msg => successMessage = msg"
      />
    </template>

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
import compliments from '@/store/compliments';
import {
  firestore,
  firestoreRefs,
  idKey,
  findByIdKey,
} from '@/plugins/firebase';
import Loader from '@/components/Loader.vue';
import Picker from '@/components/Picker.vue';
import EditGroup from '@/components/EditGroup.vue';
import AddCompliment from '@/components/AddCompliment.vue';

export default Vue.extend({
  name: 'NewEntry',
  props: {
    challenges: Array,
    groups: Array,
    participants: Array,
    entries: Array,
    loading: Boolean,
    challengeId: String,
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
    getRandomCompliment() {
      return compliments[Math.round(Math.random() * compliments.length - 1)];
    },

    async handleAdd(item, refKey) {
      return firestoreRefs[refKey].add(item);
    },
    async handleAddGroup(group) {
      const { id } = await this.handleAdd(group, 'groups');
      this.groupId = id;
    },
    async handleAddEntry() {
      try {
        this.isAddEntryLoading = true;
        await firestoreRefs.entries.add({
          challengeId: this.challengeId,
          groupId: this.groupId,
          participantId: this.participantId,
          value: Number(this.value),
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        this.value = null;

        this.successMessage = this.getRandomCompliment();
      } finally {
        setTimeout(() => {
          this.isAddEntryLoading = false;
        }, 500);
      }
    },
  },
  components: {
    Loader,
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
