<template>
  <v-carousel
    light
    hide-delimiters
    height="100%"
    class="Home"
  >
    <v-carousel-item>
      <v-sheet height="100%" class="flex-page align-center justify-center">
        <h1 class="display-2">challenge</h1>
        <h2 class="title">motivate your progress</h2>
        <v-icon color="primary" style="font-size: 220px;">mdi-stairs-box</v-icon>

        <h3 class="body-2" style="opacity: 0.5;">
          <strong>swipe to explore</strong>
          <span class="d-inline-block mx-3">/</span>
          <strong>get started below</strong>
        </h3>
      </v-sheet>
    </v-carousel-item>
    <v-carousel-item
      v-for="slide in slides"
      :key="slide[idKey]"
    >
      <v-sheet height="100%" class="flex-page align-center justify-center">
        <figure>
          <img :src="`/screenshots/${slide[idKey]}.jpg`" :alt="slide.text" />
        </figure>
        <h3 class="subtitle" v-html="slide.text" />
      </v-sheet>
    </v-carousel-item>
  </v-carousel>
</template>

<script>
import Vue from 'vue'
import { idKey } from '@/plugins/firebase'

export default Vue.extend({
  name: 'Home',
  data() {
    return {
      idKey,

      slides: [
        {
          [idKey]: 'entry',
          text: 'log entries to track your efforts',
        },
        {
          [idKey]: 'activity',
          text: 'follow the latest activity by others',
        },
        {
          [idKey]: 'stats',
          text: 'consider your progress relative to peers',
        },
        {
          [idKey]: 'challenge',
          text: 'create your own challenges',
        },
        {
          [idKey]: 'private',
          text: 'share challenges publicly, <br />or make them private',
        },
        // {
        //   [idKey]: 'filters',
        //   text: 'use filters and search to find trends',
        // },
        // {
        //   [idKey]: 'group',
        //   text: 'customize colors and country',
        // },
      ],
    }
  },
})
</script>

<style lang="scss">
.Home {
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
