import Vue from 'vue';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { firestorePlugin } from 'vuefire';

Vue.use(firestorePlugin);

const { firestore } = firebase;
export { firestore };

export const app = firebase.initializeApp({ projectId: 'scotdance-challenge' });
export const db = app.firestore();

export interface Challenge {
  name: string;
}
export interface Group {
  challengeId: string;
  name: string;
  color?: string;
  $challenge?: Challenge;
}
export interface Participant {
  challengeId: string;
  groupId: string;
  name: string;
  $challenge?: Challenge;
  $group?: Group;
}
export interface Entry {
  challengeId: string;
  groupId: string;
  participantId: string;
  name: string;
  $challenge?: Challenge;
  $group?: Group;
  $participant?: Participant;
}

export const idKey = 'id';
export function findByIdKey<T extends any>(items: T[], id: string) {
  return items.find((item) => item[idKey] === id);
}
