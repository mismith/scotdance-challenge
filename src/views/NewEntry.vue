<template>
  <div class="NewEntry flex-page">
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
        :disabled="!challengeId"
        :add-new="name => groupToEdit = {
          name: capitalize(name),
          color: colors[relevantGroups.length % colors.length],
          challengeId,
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
        :disabled="!challengeId || !groupId"
        :add-new="name => handleAdd({
          name: capitalize(name),
          challengeId,
          groupId,
        }, 'participants')"
      />
      <v-text-field
        v-model="value"
        type="number"
        step="1"
        min="1"
        max="9999"
        rounded
        outlined
        :placeholder="`Add New ${$root.labels.Entry}`"
        :disabled="!challengeId || !groupId || !participantId"
        :error="value !== undefined && value !== null && !isValid"
      />

      <v-btn
        type="submit"
        rounded
        x-large
        block
        color="primary"
        :disabled="!isValid"
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
import { mapGetters, mapState } from 'vuex';
import palette from 'vuetify/lib/util/colors';
import { getEmojiFlag } from 'countries-list';
import compliments from '@/store/compliments';
import {
  firestore,
  firestoreRefs,
  idKey,
  capitalize,
} from '@/plugins/firebase';
import Picker from '@/components/Picker.vue';
import EditGroup from '@/components/EditGroup.vue';
import AddCompliment from '@/components/AddCompliment.vue';

export default Vue.extend({
  name: 'NewEntry',
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
    ...mapState([
      'challengeId',
    ]),
    ...mapGetters([
      'challenges',
      'groups',
      'participants',
    ]),

    groupId: {
      get() {
        return this.$store.state.groupId;
      },
      set(groupId) {
        return this.$store.commit('setGroupId', groupId);
      },
    },
    participantId: {
      get() {
        return this.$store.state.participantId;
      },
      set(participantId) {
        return this.$store.commit('setParticipantId', participantId);
      },
    },

    relevantGroups() {
      return this.groups.map((item) => {
        // eslint-disable-next-line no-param-reassign
        item.$name = `${item.name}${item.country ? ` ${getEmojiFlag(item.country)}` : ''}`;
        return item;
      });
    },
    relevantParticipants() {
      return this.participants.filter(({ groupId }) => groupId === this.groupId);
    },

    isValid() {
      return this.challengeId
        && this.groupId
        && this.participantId
        && Number(this.value) > 0
        && Number(this.value) <= 9999;
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
    capitalize,

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
      if (this.isAddEntryLoading) return; // don't allow dupes
      if (!this.isValid) return; // don't allow invalids

      try {
        this.isAddEntryLoading = true;
        await this.handleAdd({
          challengeId: this.challengeId,
          groupId: this.groupId,
          participantId: this.participantId,
          value: Number(this.value) || 0,
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
