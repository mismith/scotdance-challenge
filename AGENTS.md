# AGENTS.md

- Vue SFCs: `<script setup lang="ts">`, then `<template>`, then `<style>`.
- UI is Vuetify 3 (kept from the Vuetify 2 original for its look). Use its components and utility classes before custom CSS.
- Firestore data is shared with the live app: keep collection and field names (`challenges`, `groups`, `participants`, `entries`, `complimentsSubmitted`). Writes go through `src/stores/app.ts`.
- `$total`/`$count` are written only by the `aggregateStatistics` Cloud Function; never write them from the client.
- Entries are owned by their `createdBy` uid (see `firestore.rules`): anonymous, or `sd_<ScotDance.app uid>` after "Sign in with ScotDance.app", which moves that device's anonymous docs to the account (`functions/src/index.ts`).
- ScotDance.app buttons ("Sign in with ScotDance.app", "Send to ScotDance.app") look the same on every tool, whatever the tool's own colours: blue `#1a6fd0` fill, white bold label, Scott at 16px before it (`src/components/ScotDanceMark.vue`, from ScotDance's `web/public/img/favicon.svg`). The reference is Splits' Send button (`scotdance-splits`: `src/components/ExportSettingsDialog.vue`).
- Account email and name live on the Auth user, never in Firestore (every document is publicly readable).
- Run lint, type-check and `npm run test:e2e` (Node 22) before committing.
