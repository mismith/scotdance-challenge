<script setup lang="ts">
import { format, formatDistanceStrict } from 'date-fns'
import { ArrowRight, RotateCcw } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import AddCompliment from '@/components/AddCompliment.vue'
import AppCombobox from '@/components/AppCombobox.vue'
import EditGroup, { type NewGroup, groupColors } from '@/components/EditGroup.vue'
import LoggedMoment from '@/components/LoggedMoment.vue'
import compliments from '@/lib/compliments'
import { getChallengeStartDate } from '@/lib/date'
import { type Moment, buildMoment } from '@/lib/eggs'
import { animate, burst, easing, stagger } from '@/lib/motion'
import { capitalize, pluralize } from '@/lib/strings'

const MAX_AMOUNT = 9999

const store = useAppStore()

const groupToEdit = ref<NewGroup | null>()
const value = ref<number | string | null>(null)
const isAddEntryLoading = ref(false)
const logged = ref<Moment | null>(null)
const amountEl = ref<HTMLInputElement>()

const challenge = computed(() => store.currentChallenge)
// the saved picks can be left over from another challenge (switched to while away from this
// screen), so they only count once they're found in this one's groups and dancers
const group = computed(() =>
  store.groups.find(
    ({ id, challengeId }) => id === store.groupId && challengeId === store.challengeId,
  ),
)
const groupId = computed({
  get: () => (group.value ? store.groupId : ''),
  set: (id: string) => (store.groupId = id),
})
const relevantParticipants = computed(() =>
  group.value ? store.participants.filter(({ groupId }) => groupId === group.value?.id) : [],
)
const participant = computed(() =>
  relevantParticipants.value.find(({ id }) => id === store.participantId),
)
const participantId = computed({
  get: () => (participant.value ? store.participantId : ''),
  set: (id: string) => (store.participantId = id),
})
const firstName = computed(() => participant.value?.name.trim().split(/\s+/)[0] ?? '')
const isActive = computed(() => Boolean(challenge.value?.$isActive))
const amount = computed(() => Number(value.value) || 0)
const hasAmount = computed(() => value.value !== null && value.value !== '')
const isAmountValid = computed(
  () => Number.isInteger(amount.value) && amount.value > 0 && amount.value <= MAX_AMOUNT,
)
const isValid = computed(
  () => Boolean(store.challengeId && groupId.value && participantId.value) && isAmountValid.value,
)
// what's being counted (e.g. "minutes"), shown quietly at the end of the field
const unit = computed(() => store.label('Amount').toLowerCase())
const startDate = computed(() => getChallengeStartDate(challenge.value))
const startsIn = computed(() =>
  startDate.value
    ? formatDistanceStrict(startDate.value, new Date(), { roundingMethod: 'floor' })
    : null,
)
const dancers = computed(() => challenge.value?.$dancers ?? 0)

// a little confetti for a challenge that's all wrapped up
const wrapEl = ref<HTMLElement>()
watch(wrapEl, (el) => {
  if (el) setTimeout(() => el.isConnected && burst(el, { count: 28, spread: 170 }), 450)
})

watch(
  () => store.challengeId,
  () => {
    store.groupId = ''
    store.participantId = ''
  },
)
watch(
  () => store.groupId,
  () => (store.participantId = ''),
)

// the chosen dancer's earlier entries, newest first: for "same as last", streaks and bests
const history = ref<{ value: number; date: Date | null }[]>([])
let historyLoad: Promise<unknown> = Promise.resolve()
watch(
  participantId,
  (id) => {
    history.value = []
    historyLoad = store
      .getParticipantEntries(id)
      .then((entries) => {
        if (participantId.value !== id) return
        history.value = entries.map((entry) => ({
          value: entry.value,
          date: entry.createdAt?.toDate() ?? null,
        }))
      })
      .catch(console.warn)
  },
  { immediate: true },
)
const lastValue = computed(() => history.value[0]?.value)

function nudgeAmount() {
  animate(amountEl.value, [{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], {
    duration: 380,
    easing: easing.spring,
  })
}
function bump(by: number) {
  value.value = Math.min(MAX_AMOUNT, amount.value + by)
  nudgeAmount()
}
function useLast() {
  if (lastValue.value === undefined) return
  value.value = lastValue.value
  nudgeAmount()
}

function openShare() {
  if (challenge.value?.private) store.isPrivateDialogOpen = true
  else store.isPublicDialogOpen = true
}

function addGroup(name: string) {
  groupToEdit.value = {
    name: capitalize(name),
    color: groupColors[store.groups.length % groupColors.length]!.value,
    challengeId: store.challengeId,
  }
}
async function handleAddGroup(group: NewGroup) {
  const { id } = await store.add('groups', group)
  store.groupId = id
  groupToEdit.value = null
}
function addParticipant(name: string) {
  return store.add('participants', {
    name: capitalize(name),
    challengeId: store.challengeId,
    groupId: groupId.value,
  })
}

async function handleAddEntry() {
  if (isAddEntryLoading.value) return // don't allow dupes
  if (!isValid.value || !isActive.value) return // don't allow submissions to inactive challenges

  try {
    isAddEntryLoading.value = true
    const entryValue = amount.value
    const name = firstName.value
    const countBefore = challenge.value?.$count
    await historyLoad
    const earlier = [...history.value]
    await store.add('entries', {
      challengeId: store.challengeId,
      groupId: groupId.value,
      participantId: participantId.value,
      value: entryValue,
    })
    logged.value = buildMoment({
      value: entryValue,
      name,
      compliments,
      earlier,
      countBefore,
    })
    history.value = [{ value: entryValue, date: new Date() }, ...history.value]
    value.value = null
  } finally {
    setTimeout(() => (isAddEntryLoading.value = false), 500)
  }
}
</script>

<template>
  <template v-if="challenge && !isActive">
    <!-- not started yet -->
    <section v-if="challenge.$isUpcoming" class="mx-[22px] mt-6 flex flex-col gap-3">
      <h2 class="anim-rise hd flex flex-col text-[48px]">
        <span>starts in</span>
        <span>{{ startsIn }}</span>
      </h2>
      <p class="anim-rise text-base font-semibold text-muted" :style="stagger(1)">
        <template v-if="startDate">
          Logging opens on
          <span class="font-extrabold text-ink">{{ format(startDate, 'EEEE, MMMM d') }}</span
          >.
        </template>
        Get those dancing shoes ready, and share the link so everyone's set to go!
      </p>
      <button
        type="button"
        class="anim-rise btn btn-dark self-start"
        :style="stagger(2)"
        @click="openShare()"
      >
        share the link
        <ArrowRight :size="20" :stroke-width="3" aria-hidden="true" />
      </button>
    </section>

    <!-- all done -->
    <section v-else class="mx-[22px] mt-6 flex flex-col gap-3">
      <h2 ref="wrapEl" class="anim-rise hd text-[56px]">that's a<br />wrap!</h2>
      <p class="anim-rise text-base font-semibold text-muted" :style="stagger(1)">
        <span class="hd num text-[20px] text-ink">{{
          (challenge.$total ?? 0).toLocaleString()
        }}</span>
        total<template v-if="dancers">
          from {{ dancers }}
          {{ pluralize(dancers, store.label('Participant').toLowerCase()) }}</template
        >. the final standings are in.
      </p>
      <router-link
        :to="{ name: 'statistics' }"
        class="anim-rise btn btn-dark self-start"
        :style="stagger(2)"
      >
        see who won →
      </router-link>
    </section>
  </template>

  <form
    v-else
    autocomplete="off"
    class="flex flex-col gap-3 px-4 pt-3"
    @submit.prevent="handleAddEntry()"
  >
    <AppCombobox
      v-model="groupId"
      class="anim-rise"
      :style="stagger(0)"
      :label="store.label('Group').toLowerCase()"
      :items="store.groups"
      item-title="$name"
      :add-new="addGroup"
    >
      <template #leading="{ item }">
        <Transition name="pop">
          <span
            v-if="item"
            aria-hidden="true"
            class="size-3.5 shrink-0 rounded-full"
            :style="{ background: item.color }"
          />
        </Transition>
      </template>
      <template #item="{ item }">
        <span
          aria-hidden="true"
          class="mr-2.5 inline-block size-3.5 rounded-full align-[-1px]"
          :style="{ background: item.color }"
        />{{ item.$name }}
      </template>
    </AppCombobox>
    <EditGroup v-model="groupToEdit" @add="handleAddGroup" />

    <AppCombobox
      v-model="participantId"
      class="anim-rise"
      :style="stagger(1)"
      :label="store.label('Participant').toLowerCase()"
      :items="relevantParticipants"
      :item-number="(item) => item.$total || null"
      :disabled="!groupId"
      :placeholder="groupId ? undefined : `pick a ${store.label('Group').toLowerCase()} first`"
      :add-new="addParticipant"
      :add-to="group?.$name"
    />

    <div class="anim-rise flex flex-col gap-1.5" :style="stagger(2)">
      <label for="amount" class="lbl transition-opacity" :class="{ 'opacity-45': !participantId }"
        >how many?</label
      >
      <div
        class="pill h-[76px] rounded-[22px] pr-[18px] pl-[18px]"
        :class="{ 'NewEntry-invalid': hasAmount && !isAmountValid }"
      >
        <input
          id="amount"
          ref="amountEl"
          v-model="value"
          :aria-label="store.label('Amount')"
          type="number"
          inputmode="numeric"
          step="1"
          min="1"
          :max="MAX_AMOUNT"
          placeholder="0"
          class="NewEntry-amount hd num origin-left text-[50px] caret-violet placeholder:font-black placeholder:text-faint/60"
          :aria-invalid="hasAmount && !isAmountValid"
          aria-describedby="amount-error"
          :disabled="!participantId"
        />
        <span aria-hidden="true" class="shrink-0 text-[13px] font-semibold text-hint">
          {{ unit }}
        </span>
      </div>
      <span
        id="amount-error"
        aria-live="polite"
        class="pl-1.5 text-sm font-bold text-orange-ink empty:hidden"
        >{{
          hasAmount && !isAmountValid
            ? `Whole numbers from 1 to ${MAX_AMOUNT.toLocaleString()}, please!`
            : ''
        }}</span
      >

      <div class="mt-0.5 flex flex-wrap gap-2">
        <Transition name="pop">
          <button
            v-if="lastValue !== undefined && participantId"
            type="button"
            class="chip chip-lime"
            @click="useLast()"
          >
            <RotateCcw :size="14" :stroke-width="3" aria-hidden="true" />
            same as last · {{ lastValue.toLocaleString() }}
          </button>
        </Transition>
        <button
          v-for="by in [1, 5, 10]"
          :key="by"
          type="button"
          class="chip disabled:opacity-45"
          :disabled="!participantId"
          :aria-label="`Add ${by}`"
          @click="bump(by)"
        >
          +{{ by }}
        </button>
      </div>
    </div>

    <button
      type="submit"
      class="anim-rise btn btn-primary btn-lg mt-1.5"
      :style="stagger(3)"
      :disabled="!isValid || isAddEntryLoading"
    >
      <Transition name="rise" mode="out-in">
        <span :key="isValid && participant ? 'ready' : 'idle'" class="min-w-0 truncate">
          {{
            isValid && participant ? `log ${amount.toLocaleString()} for ${firstName}` : 'log it'
          }}
        </span>
      </Transition>
    </button>
  </form>

  <AddCompliment class="mt-auto flex justify-center pt-8 pb-[26px]" />
  <LoggedMoment v-model="logged" />
</template>

<style>
/* a plain big number: no browser spinner arrows (the chips do the nudging) */
.NewEntry-amount {
  appearance: textfield;
  -moz-appearance: textfield;
}
.NewEntry-amount::-webkit-inner-spin-button,
.NewEntry-amount::-webkit-outer-spin-button {
  appearance: none;
  margin: 0;
}

.NewEntry-invalid,
.NewEntry-invalid:focus-within {
  box-shadow: inset 0 0 0 3px var(--color-red);
}
</style>
