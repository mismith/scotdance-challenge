<template>
  <div class="caption text-center px-4 mb-2">
    <kbd>TIP</kbd> <span>&mdash; Begin typing to add a new {{ label }}</span>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'AddNewTip',
  props: {
    label: {
      type: String,
      default: 'Item',
    },
  },
})
</script>
