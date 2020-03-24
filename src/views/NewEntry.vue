<template>
  <div class="NewEntry">
    <v-breadcrumbs class="px-4">
      <template v-if="currentStep > 0 && challenge">
        <v-breadcrumbs-item href="#" @click="currentStep = 0">
          {{ challenge.name }}
        </v-breadcrumbs-item>
      </template>
      <v-breadcrumbs-item v-else disabled>Challenges</v-breadcrumbs-item>
      <template v-if="currentStep > 1 && group">
        <v-breadcrumbs-divider class="pa-0">
          <v-icon>mdi-chevron-right</v-icon>
        </v-breadcrumbs-divider>
        <v-breadcrumbs-item href="#" @click="currentStep = 1">
          {{ group.name }}
        </v-breadcrumbs-item>
      </template>
      <template v-if="currentStep > 2 && participant">
        <v-breadcrumbs-divider class="pa-0">
          <v-icon>mdi-chevron-right</v-icon>
        </v-breadcrumbs-divider>
        <v-breadcrumbs-item href="#" @click="currentStep = 2">
          {{ participant.name }}
        </v-breadcrumbs-item>
      </template>
    </v-breadcrumbs>
    <v-divider />
    <v-carousel
      v-model="currentStep"
      :show-arrows="false"
      hide-delimiters
      light
      height="100%"
    >
      <v-carousel-item
        v-for="step in steps"
        :key="step[idKey]"
      >
        <v-list>
          <v-list-item
            v-for="item in step.getItems()"
            :key="item[idKey]"
            @click="step.handleSelect(item)"
          >
            <v-list-item-title>
              {{ item.name }}
            </v-list-item-title>
            <v-list-item-action>
              <v-icon>mdi-chevron-right</v-icon>
            </v-list-item-action>
          </v-list-item>
          <v-list-item v-if="!step.getItems().length">
            <v-list-item-subtitle>No items. Add a new one below.</v-list-item-subtitle>
          </v-list-item>
        </v-list>

        <v-form @submit.prevent="step.handleAdd(step)">
          <v-list-item>
            <v-list-item-title>
              <v-text-field
                v-model="step.adding"
                placeholder="Add New"
                aria-autocomplete="none"
              />
            </v-list-item-title>
            <v-list-item-action>
              <v-btn
                type="submit"
                fab
                elevation="1"
                x-small
                color="primary"
                :disabled="!step.adding"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-form>
      </v-carousel-item>
      <v-carousel-item>
        <v-form class="my-auto pa-4" @submit.prevent="handleNewEntry()">
          <v-text-field
            ref="input"
            v-model="newEntryValue"
            type="number"
            min="0"
            rounded
            solo
            placeholder="Add New"
            aria-autocomplete="none"
            class="mb-4 mx-auto"
            style="max-width: 300px;"
          >
            <template #append>
              <v-btn
                type="submit"
                fab
                small
                color="primary"
                elevation="1"
                :disabled="!newEntryValue"
                class="mr-n5"
              >
                <v-icon>mdi-arrow-right</v-icon>
              </v-btn>
            </template>
          </v-text-field>
        </v-form>

      </v-carousel-item>
    </v-carousel>
  </div>
</template>

<script>
import Vue from 'vue';
import {
  firestore,
  idKey,
  findByIdKey,
} from '@/plugins/firebase';

function bindFirestore(type) {
  return {
    [`${type}Id`]: {
      handler(id) {
        this.$localStorage.set(`${type}Id`, id || '');
        this.computeCurrentStep();
      },
      immediate: true,
    },
  };
}

export default Vue.extend({
  name: 'NewEntry',
  props: {
    firestoreRefs: Object,
    challenges: Array,
    groups: Array,
    participants: Array,
    entries: Array,
  },
  data() {
    const defaultChallengeId = this.$localStorage.get('challengeId');
    const defaultGroupId = this.$localStorage.get('groupId');
    const defaultParticipantId = this.$localStorage.get('participantId');

    return {
      idKey,

      currentStep: 0,
      steps: [
        {
          [idKey]: 'challenges',
          getItems: () => this.challenges,
          handleSelect: (item) => {
            this.challengeId = item[idKey];
            this.groupId = null;
            this.participantId = null;
          },
          adding: undefined,
          handleAdd: async (step) => {
            const { id } = await this.firestoreRefs.challenges.add({
              name: step.adding,
            });
            this.challengeId = id;
            this.groupId = null;
            this.participantId = null;
            step.adding = null; // eslint-disable-line no-param-reassign
          },
        },
        {
          [idKey]: 'groups',
          getItems: () => this.groups.filter(
            ({ challengeId }) => challengeId === this.challengeId,
          ),
          handleSelect: (item) => {
            this.groupId = item[idKey];
            this.participantId = null;
          },
          adding: undefined,
          handleAdd: async (step) => {
            const { id } = await this.firestoreRefs.groups.add({
              challengeId: this.challengeId,
              name: step.adding,
            });
            this.groupId = id;
            this.participantId = null;
            step.adding = null; // eslint-disable-line no-param-reassign
          },
        },
        {
          [idKey]: 'participants',
          getItems: () => this.participants.filter(
            ({ challengeId, groupId }) => challengeId === this.challengeId
              && groupId === this.groupId,
          ),
          handleSelect: (item) => {
            this.participantId = item[idKey];
          },
          adding: undefined,
          handleAdd: async (step) => {
            const { id } = await this.firestoreRefs.participants.add({
              challengeId: this.challengeId,
              groupId: this.groupId,
              name: step.adding,
            });
            this.participantId = id;
            step.adding = null; // eslint-disable-line no-param-reassign
          },
        },
      ],

      challengeId: defaultChallengeId,
      groupId: defaultGroupId,
      participantId: defaultParticipantId,
      newEntryValue: undefined,
    };
  },
  computed: {
    challenge() {
      return findByIdKey(this.challenges, this.challengeId);
    },
    group() {
      return findByIdKey(this.groups, this.groupId);
    },
    participant() {
      return findByIdKey(this.participants, this.participantId);
    },
  },
  watch: {
    ...bindFirestore('challenge'),
    ...bindFirestore('group'),
    ...bindFirestore('participant'),

    currentStep: {
      handler(currentStep) {
        if (currentStep === this.steps.length) {
          setTimeout(() => {
            this.$refs.input.focus();
          }, 300);
        }
      },
      immediate: true,
    },
  },
  methods: {
    computeCurrentStep() {
      this.currentStep = [this.challengeId, this.groupId, this.participantId]
        .filter(Boolean)
        .length;
    },

    async handleNewEntry() {
      await this.firestoreRefs.entries.add({
        challengeId: this.challengeId,
        groupId: this.groupId,
        participantId: this.participantId,
        value: Number(this.newEntryValue),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      this.newEntryValue = null;
    },
  },
  created() {
    this.computeCurrentStep();
  },
});
</script>

<style lang="scss">
.NewEntry {
  display: flex;
  flex-direction: column;
  height: 100%;

  .v-carousel {
    flex: auto;

    .v-carousel__item {
      .v-responsive__content {
        display: flex;
        flex-direction: column;
      }
    }
  }
  .v-input {
    .v-input__control,
    .v-input__slot {
      height: 100%;
    }
  }
}
</style>
