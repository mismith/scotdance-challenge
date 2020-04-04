<template>
  <div class="Home flex-page align-center justify-center">
    <h1 class="display-2">challenge</h1>
    <h2 class="title">motivate your progress</h2>
    <v-icon color="primary" style="font-size: 220px;">mdi-stairs-box</v-icon>
  </div>
</template>

<script>
import Vue from 'vue';

export default Vue.extend({
  name: 'Home',
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
});
</script>
