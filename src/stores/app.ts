import { useLocalStorage } from '@vueuse/core'
import {
  type User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
  signOut as signOutOfFirebase,
} from 'firebase/auth'
import {
  type DocumentData,
  type Query,
  type Unsubscribe,
  addDoc,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy as order,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef, triggerRef } from 'vue'
import { getFlag } from '@/lib/country'
import { isChallengeActive, isChallengeRecentlyEnded, isChallengeUpcoming } from '@/lib/date'
import {
  type Challenge,
  type Entry,
  type Group,
  type LabelKey,
  type Participant,
  auth,
  findById,
  functions,
  refs,
} from '@/lib/firebase'
import { requestPass } from '@/lib/scotdance'
import { crisp, orderBy } from '@/lib/utils'

export interface ChallengeItem extends Challenge {
  $isActive: boolean
  $isUpcoming: boolean
  $isRecentlyEnded: boolean
}
export interface GroupItem extends Group {
  $name: string
}
export interface ParticipantItem extends Participant {
  $name: string
  $group?: GroupItem
}

const defaultLabels: Record<LabelKey, string> = {
  Challenge: 'Challenge',
  Group: 'Group',
  Participant: 'Participant',
  Amount: 'Amount',
  Country: 'Country',
}

export const useAppStore = defineStore('app', () => {
  const me = shallowRef<User | null>(null)
  onAuthStateChanged(auth, (user) => (me.value = user))
  // everyone gets an anonymous user, unless they've signed in with ScotDance.app before
  auth
    .authStateReady()
    .then(async () => {
      if (!auth.currentUser) await signInAnonymously(auth)
    })
    .catch(console.warn)

  const isSignedIn = computed(() => Boolean(me.value && !me.value.isAnonymous))
  const exchangePass = httpsCallable<{ pass: string }, { token: string; movedEntries: number }>(
    functions,
    'signInWithScotDance',
  )
  /** Sign in via ScotDance.app; entries made anonymously move to the account */
  async function signIn() {
    const result = await requestPass()
    if (!result.signedIn) return null
    const { data } = await exchangePass({ pass: result.pass })
    await signInWithCustomToken(auth, data.token)
    // the Auth user's name and email are set just before the token is made
    await auth.currentUser?.reload()
    triggerRef(me)
    return data
  }
  /** Back to a fresh anonymous user */
  async function signOut() {
    await signOutOfFirebase(auth)
    await signInAnonymously(auth)
  }

  // same key and shape as the old vuex-persist state, so unlocked private challenges carry over
  const persisted = useLocalStorage(
    'scotdance-challenge',
    { privateIds: [] as string[], challengeId: '', groupId: '', participantId: '' },
    { mergeDefaults: true },
  )

  // live Firestore bindings
  const raw = {
    challenges: ref<Challenge[]>([]),
    groups: ref<Group[]>([]),
    participants: ref<Participant[]>([]),
    entries: ref<Entry[]>([]),
  }
  const unsubscribes: Partial<Record<keyof typeof raw, Unsubscribe>> = {}
  function bind<K extends keyof typeof raw>(key: K, q: Query<DocumentData>) {
    unsubscribes[key]?.()
    return new Promise<void>((resolve, reject) => {
      unsubscribes[key] = onSnapshot(
        q,
        (snapshot) => {
          raw[key].value = snapshot.docs.map((d) => ({ ...d.data(), id: d.id })) as never
          resolve()
        },
        reject,
      )
    })
  }
  const byChallenge = (challengeId?: string) =>
    challengeId ? [where('challengeId', '==', challengeId)] : []
  const bindChallenges = () => bind('challenges', query(refs.challenges, order('name')))
  const bindGroups = (challengeId?: string) =>
    bind('groups', query(refs.groups, ...byChallenge(challengeId), order('name')))
  const bindParticipants = (challengeId?: string) =>
    bind('participants', query(refs.participants, ...byChallenge(challengeId), order('name')))
  const bindEntries = (challengeId: string | undefined, max: number) =>
    bind(
      'entries',
      query(refs.entries, ...byChallenge(challengeId), order('createdAt', 'desc'), limit(max)),
    )

  // private items only show once their challenge has been unlocked via its link
  const isVisible = ({
    challengeId,
    private: isPrivate,
  }: {
    challengeId: string
    private?: boolean
  }) => !isPrivate || persisted.value.privateIds.includes(challengeId)

  const challenges = computed<ChallengeItem[]>(() =>
    orderBy(
      raw.challenges.value
        .filter((item) => isVisible({ ...item, challengeId: item.id }))
        .map((item) => ({
          ...item,
          $isActive: isChallengeActive(item),
          $isUpcoming: isChallengeUpcoming(item),
          $isRecentlyEnded: isChallengeRecentlyEnded(item),
        })),
      ['$isActive', '$isRecentlyEnded', '$isUpcoming', 'name'],
      ['desc', 'desc', 'desc', 'asc'],
    ),
  )
  const groups = computed<GroupItem[]>(() =>
    raw.groups.value.filter(isVisible).map((item) => ({
      ...item,
      $name: item.country ? `${item.name} ${getFlag(item.country)}` : item.name,
    })),
  )
  const participants = computed<ParticipantItem[]>(() =>
    raw.participants.value.filter(isVisible).map((item) => {
      const $group = findById(groups.value, item.groupId)
      return {
        ...item,
        $group,
        $name: $group?.country ? `${item.name} ${getFlag($group.country)}` : item.name,
      }
    }),
  )
  const entries = computed(() => raw.entries.value.filter(isVisible))

  const challengeId = computed({
    get: () => persisted.value.challengeId,
    set(id: string | null | undefined) {
      // trust the id: one just added may not be back from Firestore yet
      persisted.value.challengeId = id || ''
      const challenge = findById(challenges.value, id)
      if (challenge) crisp('set', 'session:data', [[['Challenge', challenge.name]]])
    },
  })
  const groupId = computed({
    get: () => persisted.value.groupId,
    set(id: string | null | undefined) {
      persisted.value.groupId = id || ''
      const group = findById(groups.value, id)
      if (group) crisp('set', 'session:data', [[['Group', group.name]]])
    },
  })
  const participantId = computed({
    get: () => persisted.value.participantId,
    set(id: string | null | undefined) {
      persisted.value.participantId = id || ''
      const participant = findById(participants.value, id)
      if (participant) crisp('set', 'session:data', [[['Participant', participant.name]]])
    },
  })
  const currentChallenge = computed(() => findById(challenges.value, challengeId.value))

  function label(key: LabelKey) {
    return currentChallenge.value?.labels?.[key] || defaultLabels[key]
  }

  const isPrivateDialogOpen = ref(false)
  const isPublicDialogOpen = ref(false)
  const isInfoDialogOpen = ref(false)

  function addPrivateId(id: string) {
    if (!persisted.value.privateIds.includes(id)) {
      persisted.value.privateIds.push(id)
      isPrivateDialogOpen.value = true
    }
  }
  /** Select a challenge from a shared link, before the challenge list has loaded */
  function openChallengeLink(id: string, isPrivate: boolean) {
    if (isPrivate) addPrivateId(id)
    persisted.value.challengeId = id
  }

  const created = () => ({ createdAt: serverTimestamp(), createdBy: me.value?.uid ?? null })

  async function addChallenge(challenge: Partial<Challenge>) {
    const { id } = await addDoc(refs.challenges, { ...challenge, ...created() })
    if (challenge.private) addPrivateId(id)
    return id
  }
  async function saveChallenge(id: string, challenge: Partial<Challenge>) {
    await updateDoc(doc(refs.challenges, id), {
      ...challenge,
      updatedAt: serverTimestamp(),
      updatedBy: me.value?.uid ?? null,
    })
  }
  /** Add a group, participant or entry to the current challenge */
  async function add(key: 'groups' | 'participants' | 'entries', item: DocumentData) {
    const newItem: DocumentData = { ...created(), ...item }
    if (currentChallenge.value?.private) newItem.private = true
    return addDoc(refs[key], newItem)
  }
  async function updateEntry(id: string, value: number) {
    await updateDoc(doc(refs.entries, id), {
      value,
      updatedAt: serverTimestamp(),
      updatedBy: me.value?.uid ?? null,
    })
  }
  async function deleteEntry(id: string) {
    await deleteDoc(doc(refs.entries, id))
  }
  async function addCompliment(text: string) {
    await addDoc(refs.complimentsSubmitted, { text, ...created() })
  }

  return {
    me,
    isSignedIn,
    signIn,
    signOut,
    challenges,
    groups,
    participants,
    entries,
    challengeId,
    groupId,
    participantId,
    currentChallenge,
    label,
    isPrivateDialogOpen,
    isPublicDialogOpen,
    isInfoDialogOpen,
    bindChallenges,
    bindGroups,
    bindParticipants,
    bindEntries,
    openChallengeLink,
    addChallenge,
    saveChallenge,
    add,
    updateEntry,
    deleteEntry,
    addCompliment,
  }
})
