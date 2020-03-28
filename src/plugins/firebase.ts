import Vue from 'vue';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { firestorePlugin } from 'vuefire';

Vue.use(firestorePlugin);

const { firestore } = firebase;
export { firestore };

export const app = firebase.initializeApp({ projectId: 'scotdance-challenge' });
export const db = app.firestore();

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
  name: string;
  $challenge?: Challenge;
  $group?: Group;
  $participant?: Participant;
}
export interface Compliments extends FirebaseObject {
  text: string;
}

export function findByIdKey<T extends FirebaseObject>(items: T[], id: string) {
  return items.find((item) => item[idKey] === id);
}
