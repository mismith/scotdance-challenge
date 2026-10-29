<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: 'Item' })
</script>

<template>
  <div class="text-caption text-center px-4 mb-2">
    <kbd>TIP</kbd> <span>&mdash; Begin typing to add a new {{ label }}</span>
  </div>
</template>
