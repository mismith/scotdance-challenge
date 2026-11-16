<script setup lang="ts">
import { LoaderCircle as Spinner } from 'lucide-vue-next'
import { type ButtonAction, useButtonAction } from '@/lib/buttonAction'
const props = defineProps<{
  busy?: boolean
  disabled?: boolean
  onClick?: ButtonAction | ButtonAction[]
}>()
const action = useButtonAction(props)
</script>
<template>
  <button
    class="pending-action"
    :disabled="action.disabled.value"
    :aria-busy="action.busy.value || undefined"
    @click="action.click"
  >
    <slot v-if="!action.busy.value" />
    <span v-else class="pending-label"><slot /></span>
    <span v-if="action.busy.value" class="pending-indicator" aria-hidden="true"><Spinner /></span>
  </button>
</template>
<style scoped>
.pending-action {
  position: relative;
}
.pending-label {
  display: contents;
}
.pending-action[aria-busy='true'] > .pending-label {
  color: transparent;
}
.pending-action[aria-busy='true'] > .pending-label :deep(*) {
  opacity: 0;
}
.pending-indicator {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.pending-indicator > svg {
  width: 1.25em;
  height: 1.25em;
  padding: 0;
  animation: pending-spin 1s linear infinite;
}
@keyframes pending-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .pending-indicator > svg {
    animation: none;
  }
}
</style>
