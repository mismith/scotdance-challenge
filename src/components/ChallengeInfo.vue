<script setup lang="ts">
import { isAfter } from 'date-fns'
import { CalendarCheck, CalendarPlus, Globe, Lock, Sparkles } from 'lucide-vue-next'
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import AppDialog from '@/components/AppDialog.vue'
import { getChallengeEndDate, getChallengeStartDate } from '@/lib/date'
import type { Challenge } from '@/lib/firebase'
import { stagger } from '@/lib/motion'

const props = defineProps<{ challenge: Challenge }>()
const isOpen = defineModel<boolean>({ required: true })
const store = useAppStore()

const tense = (date: Date) => (isAfter(date, new Date()) ? 's' : 'ed')
const day = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const facts = computed(() => {
  const startDate = getChallengeStartDate(props.challenge)
  const endDate = getChallengeEndDate(props.challenge)
  const createdAt = props.challenge.createdAt?.toDate()
  return [
    startDate && { icon: CalendarPlus, term: `Start${tense(startDate)}`, value: day(startDate) },
    endDate && { icon: CalendarCheck, term: `End${tense(endDate)}`, value: day(endDate) },
    createdAt && { icon: Sparkles, term: 'Created', value: day(createdAt) },
  ].filter((fact) => Boolean(fact)) as { icon: typeof Sparkles; term: string; value: string }[]
})
</script>

<template>
  <AppDialog v-model="isOpen" :title="`${store.label('Challenge').toLowerCase()} info`">
    <section class="card anim-rise flex flex-col gap-2 p-5">
      <h3 class="hd text-[28px] [overflow-wrap:anywhere]">{{ challenge.name }}</h3>
      <p
        v-if="challenge.description"
        class="text-[15px] leading-snug font-medium whitespace-pre-wrap text-muted"
      >
        {{ challenge.description }}
      </p>
      <p class="flex items-center gap-1.5 text-[13px] font-bold text-muted">
        <Lock v-if="challenge.private" :size="15" :stroke-width="2.6" aria-hidden="true" />
        <Globe v-else :size="15" :stroke-width="2.6" aria-hidden="true" />
        {{ challenge.private ? 'Just for people with the link' : 'Anyone can find it' }}
      </p>
    </section>

    <dl v-if="facts.length" class="card flex flex-col px-5 py-1">
      <div
        v-for="(fact, index) in facts"
        :key="fact.term"
        class="anim-rise flex items-center gap-3 border-line py-3 not-last:border-b"
        :style="stagger(index + 1)"
      >
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-soft text-violet"
          aria-hidden="true"
        >
          <component :is="fact.icon" :size="20" :stroke-width="2.4" />
        </span>
        <dt class="flex-1 text-[15px] font-bold text-muted lowercase">{{ fact.term }}</dt>
        <dd class="text-right text-[15px] font-extrabold">{{ fact.value }}</dd>
      </div>
    </dl>

    <button type="button" class="btn btn-dark btn-lg mt-2 lowercase" @click="isOpen = false">
      Got It
    </button>
  </AppDialog>
</template>
