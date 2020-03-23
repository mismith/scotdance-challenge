<template>
  <div class="Groups">
    <v-list>
      <v-list-item
        v-for="group in groups"
        :key="group[idKey]"
        :to="{ name: 'participants', params: { ...$route.params, groupId: group[idKey] } }"
      >
        <v-list-item-title>
          {{ group.name }}
        </v-list-item-title>
      </v-list-item>
    </v-list>

    <router-view
      v-if="groupId"
      :parent-doc="childCollection.doc(groupId)"
    />
  </div>
</template>

<script>
import { idKey } from '@/plugins/firebase';

export default {
  name: 'Groups',
  props: {
    parentDoc: Object,
  },
  data() {
    return {
      idKey,
      childCollection: this.parentDoc.collection('groups'),
      groups: [],
    };
  },
  firestore() {
    return {
      groups: this.childCollection,
    };
  },
  computed: {
    groupId() {
      return this.$route.params.groupId;
    },
  },
};
</script>
