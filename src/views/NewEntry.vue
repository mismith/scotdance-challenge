<template>
  <div class="NewEntry flex-page">
    <v-form autocomplete="off" class="px-4 py-6" @submit.prevent="handleAddEntry()">
      <Picker
        v-model="groupId"
        :label="$root.labels.Group"
        outlined
        rounded
        clearable
        :items="groups"
        item-text="name"
        :item-value="idKey"
        :disabled="!currentChallengeId"
        :add-new="name => groupToEdit = {
          name: capitalize(name),
          color: colors[groups.length % colors.length],
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
        :items="participants"
        item-text="name"
        :item-value="idKey"
        :disabled="!currentChallengeId || !currentGroupId"
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
        :disabled="!currentChallengeId || !currentGroupId || !currentParticipantId"
        :error="value !== null && value <= 0"
      />

      <v-btn
        type="submit"
        rounded
        x-large
        block
        color="primary"
        :disabled="!currentChallengeId || !currentGroupId || !currentParticipantId || value <= 0"
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

    <v-snackbar v-model="hasSuccessMessage">
      <div class="title ma-auto" style="text-transform: capitalize;">
        {{ successMessage }}!
      </div>
    </v-snackbar>
  </div>
</template>

<script>
import Vue from 'vue';
import { mapGetters, mapActions } from 'vuex';
import palette from 'vuetify/lib/util/colors';
import compliments from '@/store/compliments';
import {
  firestore,
  firestoreRefs,
  idKey,
  capitalize,
  findByIdKey,
} from '@/plugins/firebase';
import Picker from '@/components/Picker.vue';
import EditGroup from '@/components/EditGroup.vue';
import AddCompliment from '@/components/AddCompliment.vue';

export default Vue.extend({
  name: 'NewEntry',
  props: {
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
    ...mapGetters([
      'challenges',
      'groups',
      'participants',
    ]),

    currentChallengeId() {
      const challenge = this.challenges.find(({ [idKey]: id }) => id === this.challengeId);
      return challenge && challenge[idKey];
    },
    currentGroupId() {
      const group = this.groups.find(({ [idKey]: id }) => id === this.groupId);
      return group && group[idKey];
    },
    currentParticipantId() {
      const participant = this.participants.find(({ [idKey]: id }) => id === this.participantId);
      return participant && participant[idKey];
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
    currentChallengeId: {
      async handler(challengeId) {
        this.bindGroups({
          mutateQuery: challengeId
            ? (query) => query.where('challengeId', '==', challengeId)
            : undefined,
        });
        this.groupId = null;
        this.participantId = null;
      },
      immediate: true,
    },
    currentGroupId: {
      async handler(groupId) {
        this.bindParticipants({
          mutateQuery: groupId
            ? (query) => query.where('groupId', '==', groupId)
            : undefined,
        });
        this.participantId = null;
      },
      immediate: true,
    },
    currentParticipantId: {
      handler(participantId) {
        if (window.$crisp) {
          const challenge = findByIdKey(this.challenges, this.challengeId);
          const group = findByIdKey(this.groups, this.groupId);
          const participant = findByIdKey(this.participants, participantId);
          window.$crisp.push(['set', 'session:data', [[
            ['Challenge', (challenge && challenge.name) || ''],
            ['Group', (group && group.name) || ''],
            ['Participant', (participant && participant.name) || ''],
          ]]]);
        }
      },
      immediate: true,
    },
  },
  methods: {
    capitalize,
    ...mapActions([
      'bindGroups',
      'bindParticipants',
    ]),

    getRandomCompliment() {
      return compliments[Math.round(Math.random() * compliments.length - 1)];
    },

    async handleAdd(item, refKey) {
      return firestoreRefs[refKey].add({
        createdAt: firestore.FieldValue.serverTimestamp(),
        ...item,
      });
    },
    async handleAddGroup(group) {
      const { id } = await this.handleAdd(group, 'groups');
      this.groupId = id;
    },
    async handleAddEntry() {
      try {
        this.isAddEntryLoading = true;
        await this.handleAdd({
          challengeId: this.challengeId,
          groupId: this.groupId,
          participantId: this.participantId,
          value: Number(this.value),
        }, 'entries');
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
