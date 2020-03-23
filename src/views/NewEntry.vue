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
    <v-carousel
      v-model="currentStep"
      :show-arrows="false"
      hide-delimiters
      light
      style="min-width: 300px;"
    >
      <v-carousel-item
        v-for="step in steps"
        :key="step[idKey]"
      >
        <v-list>
          <!-- <v-subheader style="text-align: center; text-transform: capitalize;">
            <v-btn v-if="currentStep" icon @click="currentStep -= 1">
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
            <div class="flex">{{step[idKey]}}</div>
            <v-btn v-if="currentStep" icon style="visibility: hidden;">
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
          </v-subheader> -->

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

        <v-form class="mt-auto" @submit.prevent="step.handleAdd(step)">
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
        <v-form class="pa-4" @submit.prevent>
          <v-text-field
            type="number"
            outlined
            hide-details
            placeholder="New Entry"
            aria-autocomplete="none"
            class="mb-4"
          />
          <v-btn type="submit" color="primary" block x-large>
            Submit
          </v-btn>
        </v-form>

      </v-carousel-item>
    </v-carousel>
  </div>
</template>

<script>
import Vue from 'vue';
import { db, idKey } from '@/plugins/firebase';

function bindFirestore(type, collection, parent = undefined) {
  return {
    [`${type}Id`]: {
      handler(id) {
        const doc = parent ? this[`${parent}Doc`] : db;
        if (id && doc) {
          this[`${type}Doc`] = doc.collection(`${type}s`).doc(id);
        }
      },
      immediate: true,
    },
    [`${type}Doc`]: {
      handler(doc) {
        // if (this[collection]) this.$unbind(collection);
        if (doc) {
          this.$bind(collection, doc.collection(collection));
        }
      },
      immediate: true,
    },
  };
}

export default Vue.extend({
  name: 'NewEntry',
  props: {
  },
  data() {
    return {
      idKey,

      currentStep: 0,
      steps: [
        {
          [idKey]: 'challenges',
          getItems: () => this.challenges,
          handleSelect: (item) => {
            this.challengeId = item[idKey];
            this.currentStep += 1;
          },
          adding: undefined,
          handleAdd: async (step) => {
            const { id } = await db.collection('challenges').add({ name: step.adding });
            this.challengeId = id;
            this.currentStep += 1;
            step.adding = null; // eslint-disable-line no-param-reassign
          },
        },
        {
          [idKey]: 'groups',
          getItems: () => this.groups,
          handleSelect: (item) => {
            this.groupId = item[idKey];
            this.currentStep += 1;
          },
          adding: undefined,
          handleAdd: async (step) => {
            const { id } = await this.challengeDoc.collection('groups').add({ name: step.adding });
            this.groupId = id;
            this.currentStep += 1;
            step.adding = null; // eslint-disable-line no-param-reassign
          },
        },
        {
          [idKey]: 'participants',
          getItems: () => this.participants,
          handleSelect: (item) => {
            this.participantId = item[idKey];
            this.currentStep += 1;
          },
          adding: undefined,
          handleAdd: async (step) => {
            const { id } = await this.groupDoc.collection('participants').add({ name: step.adding });
            this.participantId = id;
            this.currentStep += 1;
            step.adding = null; // eslint-disable-line no-param-reassign
          },
        },
      ],

      challengeId: undefined,
      groupId: undefined,
      participantId: undefined,

      challengeDoc: null,
      groupDoc: null,
      participantDoc: null,

      challenges: [],
      groups: [],
      participants: [],
    };
  },
  firestore: {
    challenges: db.collection('challenges'),
  },
  computed: {
    challenge() {
      return this.challenges.find(({ [idKey]: id }) => id === this.challengeId);
    },
    group() {
      return this.groups.find(({ [idKey]: id }) => id === this.groupId);
    },
    participant() {
      return this.participants.find(({ [idKey]: id }) => id === this.participantId);
    },
  },
  watch: {
    ...bindFirestore('challenge', 'groups'),
    ...bindFirestore('group', 'participants', 'challenge'),
    ...bindFirestore('participant', 'entries', 'group'),

    // currentStep: {
    //   async handler(currentStep) {
    //     console.log(currentStep, this.steps.length, this.$refs.entryInput);
    //     if (currentStep === this.steps.length) {
    //       await this.$nextTick();
    //       this.$refs.entryInput.focus();
    //     }
    //   },
    //   immediate: true,
    // },
  },
  components: {
  },
});
</script>

<style lang="scss">
.NewEntry {
  .v-carousel__item {
    .v-responsive__content {
      display: flex;
      flex-direction: column;
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
