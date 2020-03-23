<template>
  <div class="Participants">
    <v-list>
      <v-list-item
        v-for="participant in participants"
        :key="participant[idKey]"
        :to="{ name: 'entries', params: { ...$route.params, participantId: participant[idKey] } }"
      >
        <v-list-item-title>
          {{ participant.name }}
        </v-list-item-title>
      </v-list-item>
    </v-list>

    <router-view
      v-if="participantId"
      :parent-doc="childCollection.doc(participantId)"
    />
  </div>
</template>

<script>
import { idKey } from '@/plugins/firebase';

export default {
  name: 'Participants',
  props: {
    parentDoc: Object,
  },
  data() {
    return {
      idKey,
      childCollection: this.parentDoc.collection('participants'),
      participants: [],
    };
  },
  firestore() {
    return {
      participants: this.childCollection,
    };
  },
  computed: {
    participantId() {
      return this.$route.params.participantId;
    },
  },
};
</script>
