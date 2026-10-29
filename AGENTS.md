# AGENTS.md

- Vue SFCs: `<script setup lang="ts">`, then `<template>`, then `<style>`.
- UI is Vuetify 3 (kept from the Vuetify 2 original for its look). Use its components and utility classes before custom CSS.
- Firestore data is shared with the live app: keep collection and field names (`challenges`, `groups`, `participants`, `entries`, `complimentsSubmitted`). Writes go through `src/stores/app.ts`.
- `$total`/`$count` are written only by the `aggregateStatistics` Cloud Function; never write them from the client.
- Entries are owned by their `createdBy` uid (see `firestore.rules`): anonymous, or `sd_<ScotDance.app uid>` after "Sign in with ScotDance.app", which moves that device's anonymous docs to the account (`functions/src/index.ts`).
- Account email and name live on the Auth user, never in Firestore (every document is publicly readable).
- Run lint, type-check and `npm run test:e2e` (Node 22) before committing.
