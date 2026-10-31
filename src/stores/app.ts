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
  type QueryConstraint,
  type Unsubscribe,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
import { computed, ref, shallowRef, triggerRef, watch } from 'vue'
import bundledCompliments from '@/lib/compliments'
import { getFlag } from '@/lib/country'
import {
  getChallengeYear,
  isChallengeActive,
  isChallengeLive,
  isChallengeRecentlyEnded,
  isChallengeUpcoming,
} from '@/lib/date'
import {
  type Challenge,
  type Entry,
  type Flag,
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
import { dailyTotals } from '@/lib/waves'

export interface ChallengeItem extends Challenge {
  $isActive: boolean
  $isLive: boolean
  $isUpcoming: boolean
  $isRecentlyEnded: boolean
  $year: number | null
}
export interface GroupItem extends Group {
  $name: string
}
export interface ParticipantItem extends Participant {
  $name: string
  $group?: GroupItem
}

// what each label reads as until a challenge renames it (the app is for dancers, so say so)
export const defaultLabels: Record<LabelKey, string> = {
  Challenge: 'Challenge',
  Group: 'Group',
  Participant: 'Dancer',
  Amount: 'Amount',
  Country: 'Country',
}

class OfflineError extends Error {
  constructor() {
    super('Offline')
  }
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
  // admins (see ADMIN_EMAILS in functions) can see and fix everything
  const isAdmin = ref(false)
  watch(me, async (user) => {
    isAdmin.value = Boolean(user && (await user.getIdTokenResult()).claims.admin)
  })
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
  /** Bind a challenge's items, or let them go when there's no challenge */
  function bindForChallenge<K extends Exclude<keyof typeof raw, 'challenges'>>(
    key: K,
    challengeId: string | undefined,
    ...constraints: QueryConstraint[]
  ) {
    if (!challengeId) {
      unsubscribes[key]?.()
      raw[key].value = []
      return Promise.resolve()
    }
    return bind(key, query(refs[key], where('challengeId', '==', challengeId), ...constraints))
  }
  // public challenges are listed; private ones are opened by id, once unlocked via their link
  const privateChallenges = ref<Record<string, Challenge>>({})
  const privateUnsubscribes: Record<string, Unsubscribe> = {}
  function bindPrivateChallenge(id: string) {
    if (privateUnsubscribes[id]) return Promise.resolve()
    return new Promise<void>((resolve) => {
      privateUnsubscribes[id] = onSnapshot(
        doc(refs.challenges, id),
        (snapshot) => {
          if (snapshot.exists()) {
            privateChallenges.value[id] = { ...(snapshot.data() as Challenge), id }
          } else {
            delete privateChallenges.value[id]
          }
          resolve()
        },
        () => resolve(),
      )
    })
  }
  const hasLoadedChallenges = ref(false)
  async function bindChallenges() {
    await auth.authStateReady()
    await Promise.all([
      bind(
        'challenges',
        isAdmin.value
          ? query(refs.challenges, order('name'))
          : query(refs.challenges, where('private', '==', false), order('name')),
      ),
      ...persisted.value.privateIds.map(bindPrivateChallenge),
    ])
    hasLoadedChallenges.value = true
  }
  // admins list private challenges too
  watch(isAdmin, (admin, wasAdmin) => {
    if (admin !== wasAdmin && unsubscribes.challenges) bindChallenges()
  })
  const bindGroups = (challengeId?: string) =>
    bindForChallenge('groups', challengeId, order('name'))
  const bindParticipants = (challengeId?: string) =>
    bindForChallenge('participants', challengeId, order('name'))
  const bindEntries = (challengeId: string | undefined, max: number) =>
    bindForChallenge('entries', challengeId, order('createdAt', 'desc'), limit(max))

  // private items only show once their challenge has been unlocked via its link
  const isVisible = ({
    challengeId,
    private: isPrivate,
  }: {
    challengeId: string
    private?: boolean
  }) => !isPrivate || isAdmin.value || persisted.value.privateIds.includes(challengeId)

  const allChallenges = computed(() => {
    const listed = raw.challenges.value
    const unlisted = Object.values(privateChallenges.value).filter(
      ({ id }) => !findById(listed, id),
    )
    return [...listed, ...unlisted]
  })
  const challenges = computed<ChallengeItem[]>(() =>
    orderBy(
      allChallenges.value
        .filter((item) => isVisible({ ...item, challengeId: item.id }))
        .map((item) => ({
          ...item,
          $isActive: isChallengeActive(item),
          $isLive: isChallengeLive(item),
          $isUpcoming: isChallengeUpcoming(item),
          $isRecentlyEnded: isChallengeRecentlyEnded(item),
          $year: getChallengeYear(item),
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

  // the newest few hundred entries, for the ribbons' climb (Activity pages through its own)
  const CLIMB_ENTRIES = 300
  const climbQuery = (challengeId: string) =>
    query(
      refs.entries,
      where('challengeId', '==', challengeId),
      order('createdAt', 'desc'),
      limit(CLIMB_ENTRIES),
    )
  const climbEntries = ref<Entry[]>([])
  let unsubscribeClimb: Unsubscribe | undefined
  function bindClimb(challengeId?: string) {
    unsubscribeClimb?.()
    unsubscribeClimb = undefined
    climbEntries.value = []
    if (!challengeId) return
    unsubscribeClimb = onSnapshot(climbQuery(challengeId), (snapshot) => {
      climbEntries.value = snapshot.docs.map((d) => ({ ...d.data(), id: d.id })) as Entry[]
    })
  }
  const climbDays = computed(() => dailyTotals(climbEntries.value.filter(isVisible)))

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

  // challenges this device (or account) has entered, to list under "Yours"
  const enteredChallengeIds = ref<string[]>([])
  watch(
    () => me.value?.uid,
    async (uid) => {
      enteredChallengeIds.value = []
      if (!uid) return
      const snapshot = await getDocs(query(refs.entries, where('createdBy', '==', uid)))
      enteredChallengeIds.value = [...new Set(snapshot.docs.map((d) => d.data().challengeId))]
    },
    { immediate: true },
  )
  const myChallenges = computed(() =>
    challenges.value.filter(
      ({ id, createdBy, private: isPrivate }) =>
        id === challengeId.value ||
        enteredChallengeIds.value.includes(id) ||
        (isPrivate && persisted.value.privateIds.includes(id)) ||
        Boolean(me.value && createdBy === me.value.uid),
    ),
  )

  // one short message at a time, e.g. after signing in, maybe with a button (e.g. undo)
  const toast = ref<string | null>(null)
  const toastAction = shallowRef<{ label: string; run: () => unknown } | null>(null)
  function notify(message: string | null, action: typeof toastAction.value = null) {
    toast.value = message
    toastAction.value = action
  }
  /** Tell the person a write didn't go through, kindly, so they can try again */
  function notifyFailed(error: unknown) {
    console.warn(error)
    notify(
      error instanceof OfflineError
        ? "You're offline right now. Try again once you're connected!"
        : "That didn't save. Check your connection and try again!",
    )
  }

  function label(key: LabelKey) {
    return currentChallenge.value?.labels?.[key] || defaultLabels[key]
  }

  // a challenge being added (no id yet) or edited, in the EditChallenge sheet
  const challengeToEdit = ref<Partial<Challenge> | null>(null)
  const isPrivateDialogOpen = ref(false)
  const isPublicDialogOpen = ref(false)
  const isInfoDialogOpen = ref(false)

  function addPrivateId(id: string) {
    if (!persisted.value.privateIds.includes(id)) {
      persisted.value.privateIds.push(id)
      isPrivateDialogOpen.value = true
    }
    bindPrivateChallenge(id)
  }
  /** Select a challenge from a shared link, before the challenge list has loaded */
  function openChallengeLink(id: string, isPrivate: boolean) {
    if (isPrivate) addPrivateId(id)
    persisted.value.challengeId = id
  }

  // offline, Firestore holds writes until it reconnects, so they'd hang with no word: stop early
  function ensureOnline() {
    if (!navigator.onLine) throw new OfflineError()
  }

  // the rules want the creator's uid, so wait for the anonymous sign-in if it's still going
  async function created() {
    await auth.authStateReady()
    if (!auth.currentUser) await signInAnonymously(auth)
    return { createdAt: serverTimestamp(), createdBy: auth.currentUser!.uid }
  }
  const updated = () => ({ updatedAt: serverTimestamp(), updatedBy: me.value?.uid ?? null })

  /** Whether you can fix this item: it's yours, your challenge's, or you're an admin */
  function canModerate(item?: { createdBy?: string | null; challengeId?: string } | null) {
    const uid = me.value?.uid
    if (!item || !uid) return false
    const challenge = findById(allChallenges.value, item.challengeId)
    return isAdmin.value || item.createdBy === uid || challenge?.createdBy === uid
  }
  const canModerateChallenge = computed(
    () =>
      Boolean(me.value) && (isAdmin.value || currentChallenge.value?.createdBy === me.value?.uid),
  )

  async function addChallenge(challenge: Partial<Challenge>) {
    ensureOnline()
    const isPrivate = Boolean(challenge.private)
    const { id } = await addDoc(refs.challenges, {
      ...challenge,
      private: isPrivate,
      ...(await created()),
    })
    if (isPrivate) addPrivateId(id)
    else isPublicDialogOpen.value = true
    return id
  }
  async function saveChallenge(id: string, challenge: Partial<Challenge>) {
    ensureOnline()
    await updateDoc(doc(refs.challenges, id), { ...challenge, ...updated() })
  }
  /** Add a group, participant or entry to the current challenge */
  async function add(key: 'groups' | 'participants' | 'entries', item: DocumentData) {
    ensureOnline()
    const newItem: DocumentData = { ...(await created()), ...item }
    if (currentChallenge.value?.private) newItem.private = true
    const added = await addDoc(refs[key], newItem)
    if (key === 'entries' && !enteredChallengeIds.value.includes(item.challengeId)) {
      enteredChallengeIds.value.push(item.challengeId)
    }
    return added
  }
  async function updateEntry(id: string, value: number) {
    ensureOnline()
    await updateDoc(doc(refs.entries, id), { value, ...updated() })
  }
  async function deleteEntry(id: string) {
    ensureOnline()
    await deleteDoc(doc(refs.entries, id))
  }
  /**
   * All of a participant's entries, newest first (e.g. for "same as last time", streaks and
   * personal bests). Sorted here rather than in the query, so it needs no composite index.
   */
  async function getParticipantEntries(participant?: Pick<Participant, 'id' | 'challengeId'>) {
    if (!participant) return []
    // the rules only list entries of a named challenge
    const snapshot = await getDocs(
      query(
        refs.entries,
        where('challengeId', '==', participant.challengeId),
        where('participantId', '==', participant.id),
      ),
    )
    const time = (entry: Entry) => entry.createdAt?.toMillis() ?? Date.now()
    return snapshot.docs
      .map((d) => ({ ...d.data(), id: d.id }) as Entry)
      .filter(isVisible)
      .sort((a, b) => time(b) - time(a))
  }
  async function setGoal(participantId: string, goal: number | null) {
    ensureOnline()
    await updateDoc(doc(refs.participants, participantId), { goal, ...updated() })
  }
  /** Every entry of the current challenge, oldest first (for exports) */
  async function getAllEntries() {
    const snapshot = await getDocs(
      query(
        refs.entries,
        where('challengeId', '==', challengeId.value),
        order('createdAt', 'desc'),
      ),
    )
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as Entry).reverse()
  }

  // approved compliments: the bundled ones, plus those approved since (see functions)
  const approvedCompliments = ref<string[]>([])
  getDoc(doc(refs.compliments, 'approved'))
    .then((snapshot) => (approvedCompliments.value = snapshot.get('texts') ?? []))
    .catch(console.warn)
  const compliments = computed(() => [
    ...new Set([...bundledCompliments, ...approvedCompliments.value]),
  ])
  async function addCompliment(text: string) {
    ensureOnline()
    await addDoc(refs.complimentsSubmitted, { text, ...(await created()) })
  }

  // problems reported on entries only go to admins (see functions)
  async function addFlag(entry: Entry, reason: string) {
    ensureOnline()
    await addDoc(refs.flags, {
      entryId: entry.id,
      challengeId: entry.challengeId,
      reason,
      status: 'open',
      ...(await created()),
    })
  }
  const flags = ref<Flag[]>([])
  let unsubscribeFlags: Unsubscribe | undefined
  watch(
    [challengeId, isAdmin],
    ([id, admin]) => {
      unsubscribeFlags?.()
      flags.value = []
      if (!id || !admin) return
      unsubscribeFlags = onSnapshot(
        query(refs.flags, where('challengeId', '==', id), where('status', '==', 'open')),
        (snapshot) => (flags.value = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as Flag)),
        console.warn,
      )
    },
    { immediate: true },
  )
  async function resolveFlag(id: string) {
    ensureOnline()
    await updateDoc(doc(refs.flags, id), { status: 'resolved', ...updated() })
  }

  // admins see who made what (names stay on Auth users, never in Firestore)
  const describeUsers = httpsCallable<{ uids: string[] }, Record<string, string>>(
    functions,
    'describeUsers',
  )
  const userNames = ref<Record<string, string>>({})
  const pendingUids = new Set<string>()
  let describeTimeout: ReturnType<typeof setTimeout> | undefined
  function getUserName(uid?: string | null) {
    if (!uid || !isAdmin.value) return undefined
    if (!(uid in userNames.value) && !pendingUids.has(uid)) {
      pendingUids.add(uid)
      clearTimeout(describeTimeout)
      describeTimeout = setTimeout(async () => {
        const uids = [...pendingUids]
        pendingUids.clear()
        const { data } = await describeUsers({ uids })
        userNames.value = { ...userNames.value, ...data }
      }, 50)
    }
    return userNames.value[uid]
  }

  return {
    me,
    isSignedIn,
    isAdmin,
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
    myChallenges,
    toast,
    toastAction,
    notify,
    notifyFailed,
    label,
    challengeToEdit,
    isPrivateDialogOpen,
    isPublicDialogOpen,
    isInfoDialogOpen,
    hasLoadedChallenges,
    bindChallenges,
    bindGroups,
    bindParticipants,
    bindEntries,
    bindClimb,
    climbQuery,
    climbDays,
    openChallengeLink,
    addChallenge,
    saveChallenge,
    add,
    canModerate,
    canModerateChallenge,
    updateEntry,
    deleteEntry,
    getParticipantEntries,
    setGoal,
    getAllEntries,
    compliments,
    addCompliment,
    flags,
    addFlag,
    resolveFlag,
    getUserName,
  }
})
