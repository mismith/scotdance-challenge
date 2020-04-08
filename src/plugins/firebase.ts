import Vue from 'vue';
import firebase from 'firebase/app';
import 'firebase/analytics';
import 'firebase/firestore';
import { firestorePlugin } from 'vuefire';

Vue.use(firestorePlugin);

const { firestore } = firebase;
export { firebase, firestore };

export const app = firebase.initializeApp({
  projectId: 'scotdance-challenge',
  apiKey: 'AIzaSyDO7TA2MeaR90Fjc5wmcMumXWC9dDw_DSM',
  appId: '1:925970077234:web:6ded4b043fe3ff76424e2b',
  measurementId: 'G-4EKW3LECT3',
});
export const db = app.firestore();
export const analytics = firebase.analytics();

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
export interface Challenge extends FirebaseObject {
  name: string;
}
export interface Group extends FirebaseObject {
  challengeId: string;
  name: string;
  color?: string;
  country?: string;
  $name?: string;
  $challenge?: Challenge;
}
export interface Participant extends FirebaseObject {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAt: any; // @TODO: Timestamp
  $challenge?: Challenge;
  $group?: Group;
  $participant?: Participant;
}

export function findByIdKey<T extends FirebaseObject>(items: T[], id: string) {
  return items.find((item) => item[idKey] === id);
}
