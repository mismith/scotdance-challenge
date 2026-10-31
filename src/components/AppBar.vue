<script setup lang="ts">
import HelpButton from '@/components/HelpButton.vue'
import ScotDanceAccount from '@/components/ScotDanceAccount.vue'
</script>

<template>
  <!-- every page's top bar: help and you sit in exactly the same spot wherever you go,
       clear of the soft edge iOS draws under the status bar -->
  <div class="flex items-center gap-1 px-3 pt-5">
    <slot />
    <HelpButton class="ml-auto" />
    <ScotDanceAccount class="bg-chip" />
  </div>
</template>
