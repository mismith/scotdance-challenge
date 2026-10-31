<script setup lang="ts">
// opens the live chat for help, a problem, feedback or an idea; it replaces Crisp's own bubble
import { MessageCircleQuestionMark } from 'lucide-vue-next'
import { openChat } from '@/lib/utils'
</script>

<template>
  <button
    type="button"
    class="btn btn-icon btn-ghost"
    aria-label="Help and feedback"
    title="Help and feedback"
    @click="openChat()"
  >
    <MessageCircleQuestionMark :size="22" :stroke-width="2.6" />
  </button>
</template>
