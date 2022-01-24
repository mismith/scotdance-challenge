<template>
  <div class="NewEntry flex-page">
    <div v-if="!currentChallenge" class="d-flex flex-column align-center ma-auto">
      <v-icon x-large class="mb-3">mdi-chevron-up</v-icon>
      Select a {{ $root.getLabel('Challenge').toLowerCase() }} first
    </div>
    <template v-else>
      <ChallengeProgress v-if="currentChallenge" :challenge="currentChallenge" />

      <v-form autocomplete="off" class="px-4 py-6" @submit.prevent="handleAddEntry()">
        <Picker
          v-model="groupId"
          :label="$root.getLabel('Group')"
          outlined
          rounded
          clearable
          required
          :items="relevantGroups"
          item-text="$name"
          :item-value="idKey"
          :disabled="!isChallengeActive || !challengeId"
          :add-new="name => groupToEdit = {
            name: capitalize(name),
            color: colors[relevantGroups.length % colors.length],
            challengeId,
          }"
        >
          <template #prepend-item>
            <AddNewTip :label="$root.getLabel('Group').toLowerCase()" />
          </template>
        </Picker>
        <EditGroup
          v-model="groupToEdit"
          @add="group => handleAddGroup(group)"
        />

        <Picker
          v-model="participantId"
          :label="$root.getLabel('Participant')"
          outlined
          rounded
          clearable
          required
          :items="relevantParticipants"
          item-text="name"
          :item-value="idKey"
          :disabled="!isChallengeActive || !challengeId || !groupId"
          :add-new="name => handleAdd({
            name: capitalize(name),
            challengeId,
            groupId,
          }, 'participants')"
        >
          <template #prepend-item>
            <AddNewTip :label="$root.getLabel('Participant').toLowerCase()" />
          </template>
        </Picker>
        <v-text-field
          v-model="value"
          :label="$root.getLabel('Amount')"
          type="number"
          step="1"
          min="1"
          max="9999"
          rounded
          outlined
          required
          :disabled="!isChallengeActive || !challengeId || !groupId || !participantId"
          :error="value !== undefined && value !== null && !isValid"
        />

        <v-btn
          type="submit"
          rounded
          x-large
          block
          color="primary"
          :disabled="!isChallengeActive || !isValid"
          :loading="isAddEntryLoading"
        >
          Submit
        </v-btn>
      </v-form>

      <v-spacer />
      <AddCompliment
        class="d-flex justify-center pb-6"
        @input="msg => successMessage = msg"
      />

      <v-snackbar v-model="hasSuccessMessage">
        <div class="title text-center ma-auto" style="text-transform: capitalize;">
          {{ successMessage }}!
        </div>
      </v-snackbar>
    </template>
  </div>
</template>

<script>
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import palette from 'vuetify/lib/util/colors'
import compliments from '@/store/compliments'
import {
  firestore,
  firestoreRefs,
  idKey,
} from '@/plugins/firebase'
import { capitalize } from '@/services/strings'
import ChallengeProgress from '@/components/ChallengeProgress.vue'
import Picker from '@/components/Picker.vue'
import EditGroup from '@/components/EditGroup.vue'
import AddCompliment from '@/components/AddCompliment.vue'
import AddNewTip from '@/components/AddNewTip.vue'
import { isChallengeActive } from '../services/date'

export default Vue.extend({
  name: 'NewEntry',
  components: {
    ChallengeProgress,
    Picker,
    EditGroup,
    AddCompliment,
    AddNewTip,
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
    }
  },
  computed: {
    ...mapState([
      'me',
      'challengeId',
    ]),
    ...mapGetters([
      'challenges',
      'groups',
      'participants',
      'currentChallenge',
    ]),

    groupId: {
      get() {
        return this.$store.state.groupId
      },
      set(groupId) {
        return this.$store.commit('setGroupId', groupId)
      },
    },
    participantId: {
      get() {
        return this.$store.state.participantId
      },
      set(participantId) {
        return this.$store.commit('setParticipantId', participantId)
      },
    },

    relevantGroups() {
      return this.groups
    },
    relevantParticipants() {
      return this.participants.filter(({ groupId }) => groupId === this.groupId)
    },

    isValid() {
      return this.challengeId
        && this.groupId
        && this.participantId
        && Number(this.value) > 0
        && Number(this.value) <= 9999
    },
    isChallengeActive() {
      return isChallengeActive(this.currentChallenge)
    },

    hasSuccessMessage: {
      get() {
        return Boolean(this.successMessage)
      },
      set(on) {
        if (!on) this.successMessage = null
      },
    },
  },
  watch: {
    challengeId() {
      this.groupId = null
      this.participantId = null
    },
    groupId() {
      this.participantId = null
    },
  },
  methods: {
    capitalize,

    getRandomCompliment() {
      return compliments[Math.round(Math.random() * compliments.length - 1)]
    },

    async handleAdd(item, refKey) {
      const newItem = {
        createdAt: firestore.FieldValue.serverTimestamp(),
        createdBy: this.me && this.me.uid,
        ...item,
      }
      if (this.currentChallenge.private) {
        newItem.private = this.currentChallenge.private
      }
      return firestoreRefs[refKey].add(newItem)
    },
    async handleAddGroup(group) {
      const { id } = await this.handleAdd(group, 'groups')
      this.groupId = id
      this.groupToEdit = null
    },
    async handleAddEntry() {
      if (this.isAddEntryLoading) return // don't allow dupes
      if (!this.isValid) return // don't allow invalids
      if (!this.isChallengeActive) return // don't allow submissions to inactive challenges
      if (!this.currentChallenge) return // can't add to non-existing challenge

      try {
        this.isAddEntryLoading = true
        const entry = {
          challengeId: this.challengeId,
          groupId: this.groupId,
          participantId: this.participantId,
          value: Number(this.value) || 0,
        }
        await this.handleAdd(entry, 'entries')
        this.value = null

        this.successMessage = this.getRandomCompliment()
      } finally {
        setTimeout(() => {
          this.isAddEntryLoading = false
        }, 500)
      }
    },
  },
})
</script>
