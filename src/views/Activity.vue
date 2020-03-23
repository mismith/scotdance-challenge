<template>
  <div class="Activity">
    {{ challenges }}
  </div>
</template>

<script>
import Vue from 'vue';
import { db, idKey } from '@/plugins/firebase';

export default Vue.extend({
  name: 'Activity',
  data() {
    return {
      idKey,

      challenges: [],
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
  },
});
</script>
