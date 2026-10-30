<script setup lang="ts">
const slides = [
  { id: 'entry', text: 'log entries to track your efforts' },
  { id: 'activity', text: 'follow the latest activity by others' },
  { id: 'stats', text: 'consider your progress relative to peers' },
  { id: 'challenge', text: 'create your own challenges' },
  { id: 'private', text: 'share challenges publicly, <br />or make them private' },
]
</script>

<template>
  <v-carousel hide-delimiters height="100%" class="HomeView">
    <v-carousel-item>
      <v-sheet height="100%" class="flex-page align-center justify-center">
        <h1 class="text-h3">challenge</h1>
        <h2 class="text-h6">motivate your progress</h2>
        <v-icon color="primary" style="font-size: 220px">mdi-stairs-box</v-icon>

        <h3 class="text-body-2" style="opacity: 0.5">
          <strong>swipe to explore</strong>
          <span class="d-inline-block mx-3">/</span>
          <strong>get started below</strong>
        </h3>
      </v-sheet>
    </v-carousel-item>
    <v-carousel-item v-for="slide in slides" :key="slide.id">
      <v-sheet height="100%" class="flex-page align-center justify-center">
        <figure>
          <img :src="`/screenshots/${slide.id}.jpg`" :alt="slide.text" />
        </figure>
        <!-- eslint-disable-next-line vue/no-v-html -- static copy above -->
        <h3 class="text-subtitle-1" v-html="slide.text" />
      </v-sheet>
    </v-carousel-item>
  </v-carousel>
</template>

<style>
.HomeView {
  flex: auto;

  figure {
    max-width: 67%;
    border-radius: 10px;
    overflow: hidden;
    margin: 20px auto;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);

    img {
      max-height: 50vh;
      max-width: 100%;
      vertical-align: middle;
    }
  }

  h3 {
    text-align: center;
    padding: 10px 20px;
  }
}
</style>
