import { getAnalytics, isSupported } from 'firebase/analytics'
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  type Timestamp,
  collection,
  connectFirestoreEmulator,
  getFirestore,
} from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

// local dev talks to the emulators unless VITE_FIREBASE_EMULATORS=false (see `npm run dev:prod`)
export const isUsingEmulators =
  import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS !== 'false'

export const app = initializeApp({
  projectId: 'scotdance-challenge',
  apiKey: 'AIzaSyDO7TA2MeaR90Fjc5wmcMumXWC9dDw_DSM',
  authDomain: 'scotdance-challenge.firebaseapp.com',
  appId: '1:925970077234:web:6ded4b043fe3ff76424e2b',
  measurementId: 'G-4EKW3LECT3',
})
export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)

if (isUsingEmulators) {
  connectAuthEmulator(auth, `http://${window.location.hostname}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, window.location.hostname, 5002)
  connectFunctionsEmulator(functions, window.location.hostname, 5001)
} else {
  isSupported().then((supported) => supported && getAnalytics(app))
}

export const refs = {
  challenges: collection(db, 'challenges'),
  groups: collection(db, 'groups'),
  participants: collection(db, 'participants'),
  entries: collection(db, 'entries'),
  complimentsSubmitted: collection(db, 'complimentsSubmitted'),
}

export interface FirebaseObject {
  id: string
}
export interface Createable {
  createdAt?: Timestamp | null
  createdBy?: string | null
}
export interface Updateable {
  updatedAt?: Timestamp
  updatedBy?: string | null
}
export interface WithStats {
  $total?: number
  $count?: number
}

export type LabelKey = 'Challenge' | 'Group' | 'Participant' | 'Amount' | 'Country'

export interface Challenge extends FirebaseObject, Createable, Updateable, WithStats {
  name: string
  description?: string
  startAt?: string | null
  endAt?: string | null
  private?: boolean
  hasFinalCountdown?: boolean
  labels?: Partial<Record<LabelKey, string | null>>
  /** participants with entries, kept by the aggregateStatistics Cloud Function */
  $dancers?: number
  /** when the latest entry was added, kept by the aggregateStatistics Cloud Function */
  $lastEntryAt?: Timestamp
}
export interface Group extends FirebaseObject, Createable, WithStats {
  challengeId: string
  name: string
  color?: string
  country?: string | null
  private?: boolean
}
export interface Participant extends FirebaseObject, Createable, WithStats {
  challengeId: string
  groupId: string
  name: string
  private?: boolean
}
export interface Entry extends FirebaseObject, Createable, Updateable {
  challengeId: string
  groupId: string
  participantId: string
  value: number
  private?: boolean
}

export function findById<T extends FirebaseObject>(items: T[], id?: string | null) {
  return items.find((item) => item.id === id)
}
