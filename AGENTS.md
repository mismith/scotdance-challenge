# AGENTS.md

- Vue SFCs: `<script setup lang="ts">`, then `<template>`, then `<style>`.
- UI is Vuetify 3 (kept from the Vuetify 2 original for its look). Use its components and utility classes before custom CSS.
- Firestore data is shared with the live app: keep collection and field names (`challenges`, `groups`, `participants`, `entries`, `complimentsSubmitted`). Writes go through `src/stores/app.ts`.
- `$total`/`$count` are written only by the `aggregateStatistics` Cloud Function; never write them from the client.
- Entries are owned by their anonymous `createdBy` uid (see `firestore.rules`).
- Run lint, type-check and `npm run test:e2e` (Node 22) before committing.
