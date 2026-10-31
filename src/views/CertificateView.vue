<script setup lang="ts">
import { doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore'
import { ChevronLeft, LoaderCircle, Printer } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StepsMark from '@/components/StepsMark.vue'
import { getChallengeEndDate } from '@/lib/date'
import { type Challenge, type Group, type Participant, findById, refs } from '@/lib/firebase'

// one dancer's certificate (/certificate/:participantId), or every dancer's in a challenge
// (/certificates/:challengeId), one to a printed page
const route = useRoute()
const router = useRouter()

const participants = ref<Participant[]>([])
const groups = ref<Group[]>([])
const challenge = ref<Challenge | null>(null)
const isLoading = ref(true)

async function load<T>(collection: 'participants' | 'groups' | 'challenges', id?: string) {
  if (!id) return null
  const snapshot = await getDoc(doc(refs[collection], id))
  return snapshot.exists() ? ({ ...snapshot.data(), id } as T) : null
}
// the rules only list a challenge's items by its id
async function list<T>(collection: 'participants' | 'groups', challengeId: string) {
  const snapshot = await getDocs(
    query(refs[collection], where('challengeId', '==', challengeId), orderBy('name')),
  )
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as T)
}
watchEffect(async () => {
  isLoading.value = true
  try {
    const { participantId, challengeId } = route.params
    if (participantId) {
      const participant = await load<Participant>('participants', String(participantId))
      participants.value = participant ? [participant] : []
      const [group, found] = await Promise.all([
        load<Group>('groups', participant?.groupId),
        load<Challenge>('challenges', participant?.challengeId),
      ])
      groups.value = group ? [group] : []
      challenge.value = found
    } else {
      const id = String(challengeId)
      const [found, all, allGroups] = await Promise.all([
        load<Challenge>('challenges', id),
        list<Participant>('participants', id),
        list<Group>('groups', id),
      ])
      challenge.value = found
      participants.value = all.filter(({ $total }) => $total)
      groups.value = allGroups
    }
  } catch (error) {
    console.warn(error)
    participants.value = []
  } finally {
    isLoading.value = false
  }
})

// a custom unit ("steps", "minutes"), not the generic "amount"
const unit = computed(() => challenge.value?.labels?.Amount?.toLowerCase())
const date = computed(() => {
  const end = getChallengeEndDate(challenge.value)
  return (end && end < new Date() ? end : new Date()).toLocaleDateString(undefined, {
    dateStyle: 'long',
  })
})
const print = () => window.print()
// back to wherever it was opened from (Stats), or Explore when opened from a link
function goBack() {
  if ((window.history.state as { back?: unknown } | null)?.back) router.back()
  else router.push({ name: 'home' })
}

// certificates are paper, so always light: dark mode's pale text would print nearly invisible
const root = document.documentElement
let theme: string | undefined
onMounted(() => {
  theme = root.dataset.theme
  root.dataset.theme = 'light'
})
onBeforeUnmount(() => {
  if (theme) root.dataset.theme = theme
})
</script>

<template>
  <main class="CertificateView mx-auto flex min-h-dvh max-w-2xl flex-col items-center gap-6 p-4">
    <div class="CertificateView__bar flex w-full items-center justify-between gap-3">
      <router-link v-slot="{ href }" :to="{ name: 'home' }" custom>
        <a
          :href="href"
          class="btn btn-icon btn-ghost bg-chip"
          aria-label="Back"
          @click.prevent="goBack()"
        >
          <ChevronLeft :size="26" :stroke-width="2.8" />
        </a>
      </router-link>
      <button
        v-if="!isLoading && challenge && participants.length"
        type="button"
        class="btn btn-primary"
        @click="print()"
      >
        <Printer :size="20" :stroke-width="2.6" aria-hidden="true" />
        print{{ participants.length > 1 ? ` all ${participants.length}` : '' }}
      </button>
    </div>
    <LoaderCircle
      v-if="isLoading"
      :size="32"
      :stroke-width="2.6"
      class="m-auto animate-spin text-violet"
    />
    <div v-else-if="!challenge || !participants.length" class="m-auto text-center">
      <p class="hd text-[32px]">no certificates here</p>
      <router-link :to="{ name: 'home' }" class="btn btn-primary mt-4">back to explore</router-link>
    </div>
    <template v-else>
      <article
        v-for="participant in participants"
        :key="participant.id"
        class="CertificateView__paper card flex w-full flex-col items-center gap-1 px-8 py-12 text-center"
      >
        <StepsMark :size="64" />
        <p class="lbl mt-5">certificate of achievement</p>
        <p class="mt-5 text-base font-semibold text-muted">this certifies that</p>
        <h1 class="hd text-[48px] leading-none text-violet [overflow-wrap:anywhere]">
          {{ participant.name }}
        </h1>
        <p v-if="findById(groups, participant.groupId)" class="text-base font-semibold text-muted">
          of {{ findById(groups, participant.groupId)?.name }}
        </p>
        <p class="mt-5 text-base font-semibold text-muted">took part in</p>
        <h2 class="hd text-[28px] [overflow-wrap:anywhere]">{{ challenge.name }}</h2>
        <p class="text-base font-semibold">
          with a total of
          <strong class="font-black"
            >{{ (participant.$total ?? 0).toLocaleString() }} {{ unit }}</strong
          >
          <template v-if="participant.$count">
            over {{ participant.$count.toLocaleString() }}
            {{ participant.$count === 1 ? 'entry' : 'entries' }}
          </template>
        </p>
        <p class="hand mt-6 text-[40px] text-pink">amazing work!</p>
        <p class="mt-4 text-[13px] font-semibold text-hint">{{ date }} · challenge.scotdance.app</p>
      </article>
    </template>
  </main>
</template>

<style>
.CertificateView__paper {
  box-shadow: inset 0 0 0 6px var(--color-violet-soft);
}

@media print {
  .CertificateView {
    max-width: none;
    padding: 0;
  }
  .CertificateView__bar,
  #crisp-chatbox {
    display: none !important;
  }
  .CertificateView__paper:not(:last-child) {
    break-after: page;
  }
  .CertificateView__paper {
    min-height: 90vh;
    justify-content: center;
  }
}
</style>
