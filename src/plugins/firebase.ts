import Vue from 'vue';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { firestorePlugin } from 'vuefire';

Vue.use(firestorePlugin);

export const app = firebase.initializeApp({ projectId: 'scotdance-challenge' });
export const db = app.firestore();

export const idKey = 'id';
