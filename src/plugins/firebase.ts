import Vue from 'vue';
import firebase from 'firebase/app';
import 'firebase/analytics';
import 'firebase/firestore';
import { firestorePlugin } from 'vuefire';
import { isDebugging } from '@/config';

Vue.use(firestorePlugin);

const { firestore } = firebase;
export { firebase, firestore };

export const app = firebase.initializeApp({
  projectId: 'scotdance-challenge',
  apiKey: 'AIzaSyDO7TA2MeaR90Fjc5wmcMumXWC9dDw_DSM',
  appId: '1:925970077234:web:6ded4b043fe3ff76424e2b',
  measurementId: 'G-4EKW3LECT3',
});
export const analytics = firebase.analytics();
export const db = app.firestore();

if (isDebugging) {
  db.settings({
    host: 'localhost:5002',
    ssl: false,
  });
}

export const firestoreRefs = {
  challenges: db.collection('challenges'),
  groups: db.collection('groups'),
  participants: db.collection('participants'),
  entries: db.collection('entries'),
};

export const idKey = 'id';

export interface FirebaseObject {
  [idKey]: string;
}
export interface WithStats {
  $total: number;
  $count: number;
}
export interface Challenge extends FirebaseObject, WithStats {
  name: string;
}
export interface Group extends FirebaseObject, WithStats {
  challengeId: string;
  name: string;
  color?: string;
  country?: string;
  $name?: string;
  $challenge?: Challenge;
}
export interface Participant extends FirebaseObject, WithStats {
  challengeId: string;
  groupId: string;
  name: string;
  $challenge?: Challenge;
  $group?: Group;
}
export interface Entry extends FirebaseObject {
  challengeId: string;
  groupId: string;
  participantId: string;
  value: number;
  createdAt: firebase.firestore.Timestamp;
  $challenge?: Challenge;
  $group?: Group;
  $participant?: Participant;
}

export function findByIdKey<T extends FirebaseObject>(items: T[], id: string) {
  return items.find((item) => item[idKey] === id);
}
