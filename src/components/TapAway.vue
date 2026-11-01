<script setup lang="ts">
// Behind an open menu, so a tap anywhere else only closes it. On touch, Reka closes a menu on
// the click that follows the tap, and iOS sends no click for a tap on plain page (so the menu
// stayed open); a tap on a button or link would go on to press it. A click listener makes iOS
// send one here, and Reka closes the menu on it as a tap outside.
</script>

<template>
  <div
    class="pointer-events-auto fixed inset-0 z-[59] cursor-pointer"
    aria-hidden="true"
    @click="() => {}"
  />
</template>
