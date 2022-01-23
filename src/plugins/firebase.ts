import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/analytics';
import 'firebase/firestore';
import { isDebugging } from '@/config';

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
export interface Createable {
  createdAt: firebase.firestore.Timestamp;
  createdBy?: string;
}
export interface Updateable {
  updatedAt?: firebase.firestore.Timestamp;
  updatedBy?: string;
}
export interface WithStats {
  $total: number;
  $count: number;
}

export interface Challenge extends FirebaseObject, Createable, Updateable, WithStats {
  name: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  private?: boolean;
  $isActive?: boolean;
  $isUpcoming?: boolean;
  $isRecentlyEnded?: boolean;
}
export interface Group extends FirebaseObject, Createable, WithStats {
  challengeId: string;
  name: string;
  color?: string;
  country?: string;
  private?: boolean;
  $name?: string;
  $challenge?: Challenge;
}
export interface Participant extends FirebaseObject, Createable, WithStats {
  challengeId: string;
  groupId: string;
  name: string;
  private?: boolean;
  $name?: string;
  $group?: Group;
}
export interface Entry extends FirebaseObject, Createable {
  challengeId: string;
  groupId: string;
  participantId: string;
  value: number;
  private?: boolean;
  $participant?: Participant;
}

export function findByIdKey<T extends FirebaseObject>(items: T[], id: string) {
  return items.find((item) => item[idKey] === id);
}

export function capitalize(text: string) {
  const str = (text || '').trim();
  if (str) {
    const words = str.split(' ');
    for (let i = 0; i < words.length; i += 1) {
      words[i] = words[i][0].toUpperCase() + words[i].substr(1);
    }
    return words.join(' ');
  }
  return str;
}
